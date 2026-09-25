import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import { readFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
export type Row = Record<string, any>;
export interface DB {
  query<T extends Row = Row>(sql: string, args?: any[]): Promise<{ rows: T[] }>;
}
export const localMode = () => process.env.SBK_LOCAL_DEMO === "true";
type State = { local?: Promise<PGlite>; pool?: Pool };
const globals = globalThis as typeof globalThis & { sbkDB?: State };
const state = (globals.sbkDB ??= {});
export async function localDB() {
  if (!localMode()) throw new Error("local_disabled");
  if (
    process.env.NODE_ENV === "production" &&
    process.env.SBK_ALLOW_LOCAL_BUILD !== "true"
  )
    throw new Error("Local demo is disabled in production.");
  return (state.local ??= (async () => {
    await mkdir(".local", { recursive: true });
    const db = new PGlite(path.resolve(".local/postgres"));
    const existing =
      (await db.query("SELECT 1 FROM pg_namespace WHERE nspname='sbk'")).rows
        .length > 0;
    await db.exec(
      "CREATE TABLE IF NOT EXISTS public.sbk_schema_migrations(name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    // Recognize the first development schema before migration tracking was added.
    if (existing)
      await db.query(
        "INSERT INTO public.sbk_schema_migrations(name) VALUES('001_initial.sql') ON CONFLICT DO NOTHING",
      );
    const files = [
      ...(await readdir("migrations")).map((name) => ({ name, path: "migrations/" + name })),
      ...(
        await readdir("supabase/migrations").catch(() => [] as string[])
      ).map((name) => ({ name, path: "supabase/migrations/" + name })),
    ]
      .filter((f) => f.name.endsWith(".sql"))
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const file of files) {
      if (
        (
          await db.query(
            "SELECT 1 FROM public.sbk_schema_migrations WHERE name=$1",
            [file.name],
          )
        ).rows.length
      )
        continue;
      await db.transaction(async (tx) => {
        await tx.exec(await readFile(file.path, "utf8"));
        await tx.query(
          "INSERT INTO public.sbk_schema_migrations(name) VALUES($1)",
          [file.name],
        );
      });
    }
    if (!existing) {
      const { seed } = await import("./seed");
      await seed(db);
    }
    return db;
  })());
}
export async function transaction<T>(
  userId: string | null,
  fn: (db: DB) => Promise<T>,
): Promise<T> {
  if (localMode()) {
    const db = await localDB();
    return db.transaction(async (tx) => {
      await tx.exec("SET LOCAL ROLE sbk_app");
      await tx.query("SELECT set_config('sbk.user_id',$1,true)", [
        userId ?? "",
      ]);
      return fn(tx as DB);
    });
  }
  if (!process.env.DATABASE_URL)
    throw new Error("Database configuration missing");
  const databaseUrl = new URL(process.env.DATABASE_URL);
  const certificate = process.env.DATABASE_SSL_CA;
  if (certificate) {
    // pg connection-string SSL parameters override Pool.ssl; use the supplied
    // trusted CA consistently on hosts without a local certificate file.
    for (const key of ["sslmode", "sslrootcert", "sslcert", "sslkey"])
      databaseUrl.searchParams.delete(key);
  }
  state.pool ??= new Pool({
    connectionString: databaseUrl.toString(),
    ...(certificate ? { ssl: { ca: certificate, rejectUnauthorized: true } } : {}),
    max: 10,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    statement_timeout: 15000,
  });
  const client = await state.pool.connect();
  try {
    await client.query("BEGIN");
    const role = await client.query("SELECT current_user");
    if (role.rows[0].current_user !== "sbk_app")
      throw new Error("DATABASE_URL must use sbk_app");
    await client.query("SELECT set_config('sbk.user_id',$1,true)", [
      userId ?? "",
    ]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
export async function limited(key: string, max = 30, seconds = 60) {
  const allowed = await transaction(
    null,
    async (db) =>
      (
        await db.query("SELECT sbk.consume_limit($1,$2,$3) AS ok", [
          key,
          max,
          seconds,
        ])
      ).rows[0].ok,
  );
  if (!allowed) throw new Error("rate_limit");
}
