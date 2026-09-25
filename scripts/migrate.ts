import { Pool } from "pg";
import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
if (existsSync(".env.migration")) process.loadEnvFile(".env.migration");
if (!process.env.MIGRATION_DATABASE_URL)
  throw new Error(
    "Set MIGRATION_DATABASE_URL in .env.migration (owner connection, CLI only).",
  );
const pool = new Pool({
    connectionString: process.env.MIGRATION_DATABASE_URL,
    max: 1,
  }),
  client = await pool.connect();
try {
  await client.query("SELECT pg_advisory_lock(hashtext('sbk-migrations'))");
  await client.query(
    "CREATE TABLE IF NOT EXISTS public.sbk_schema_migrations(name text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now())",
  );
  await client.query("ALTER TABLE public.sbk_schema_migrations ENABLE ROW LEVEL SECURITY");
  await client.query("REVOKE ALL ON public.sbk_schema_migrations FROM PUBLIC");
  for (const role of ["anon", "authenticated"]) {
    if ((await client.query("SELECT 1 FROM pg_roles WHERE rolname=$1", [role])).rows.length)
      await client.query(`REVOKE ALL ON public.sbk_schema_migrations FROM ${role}`);
  }
  const files = [
    ...(await readdir("migrations")).map((name) => ({ name, path: "migrations/" + name })),
    ...(
      existsSync("supabase/migrations")
        ? await readdir("supabase/migrations")
        : []
    ).map((name) => ({ name, path: "supabase/migrations/" + name })),
  ]
    .filter((f) => f.name.endsWith(".sql"))
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const file of files) {
    if (
      (
        await client.query(
          "SELECT 1 FROM public.sbk_schema_migrations WHERE name=$1",
          [file.name],
        )
      ).rows.length
    )
      continue;
    await client.query("BEGIN");
    try {
      await client.query(await readFile(file.path, "utf8"));
      await client.query(
        "INSERT INTO public.sbk_schema_migrations(name) VALUES($1)",
        [file.name],
      );
      await client.query("COMMIT");
      console.log("Applied " + file.name);
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }
  }
  const password = process.env.SBK_DATABASE_PASSWORD;
  if (password) {
    if (password.length < 24)
      throw new Error(
        "SBK_DATABASE_PASSWORD must contain at least 24 characters.",
      );
    await client.query(
      "ALTER ROLE sbk_app LOGIN PASSWORD '" +
        password.replaceAll("'", "''") +
        "'",
    );
    console.log(
      "Configured dedicated application login. Password not printed.",
    );
  }
  console.log(
    "Migrations complete. Configure DATABASE_URL with sbk_app; do not use the owner role.",
  );
} finally {
  await client.query("SELECT pg_advisory_unlock(hashtext('sbk-migrations'))");
  client.release();
  await pool.end();
}
