import { existsSync } from "node:fs";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
if (process.env.SBK_LOCAL_DEMO !== "true")
  throw new Error("Only for explicit SBK_LOCAL_DEMO=true.");
const { localDB } = await import("../src/lib/db");
const db = await localDB();
await db.close();
console.log(
  "Local database is ready. Read .local/demo-accounts.txt for randomly generated sample credentials. Do not run this command while the dev server is running.",
);
