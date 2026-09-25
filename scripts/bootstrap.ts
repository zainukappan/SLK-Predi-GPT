import { Pool } from "pg";
import { existsSync } from "node:fs";
if (existsSync(".env.migration")) process.loadEnvFile(".env.migration");
const email = process.argv[2]?.toLowerCase();
if (!email || !email.includes("@"))
  throw new Error("Usage: npm run db:bootstrap -- organizer@example.com");
if (!process.env.MIGRATION_DATABASE_URL)
  throw new Error("Set MIGRATION_DATABASE_URL in .env.migration.");
const pool = new Pool({
    connectionString: process.env.MIGRATION_DATABASE_URL,
    max: 1,
  }),
  client = await pool.connect();
try {
  await client.query("BEGIN");
  const result = await client.query(
    "UPDATE sbk.profiles SET role='admin',membership='approved' WHERE lower(email)=$1 RETURNING id,display_name",
    [email],
  );
  if (result.rows.length !== 1)
    throw new Error(
      "Account not found. Confirm the email and sign in through the app first.",
    );
  await client.query(
    "INSERT INTO sbk.admin_audit_events(actor,action,target,after_value) VALUES($1,'BOOTSTRAP','profiles',$2)",
    [
      result.rows[0].id,
      JSON.stringify({
        id: result.rows[0].id,
        role: "admin",
        membership: "approved",
        procedure: "owner CLI",
      }),
    ],
  );
  await client.query("COMMIT");
  console.log("Admin enabled for " + result.rows[0].display_name + ".");
} catch (e) {
  await client.query("ROLLBACK");
  throw e;
} finally {
  client.release();
  await pool.end();
}
