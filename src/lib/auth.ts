import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { localDB, localMode, transaction } from "./db";
import type { Lang } from "./domain";
import { normalizeAccountIdentifier } from "./account";
export const digest = (s: string) =>
  createHash("sha256").update(s).digest("hex");
export async function supabase() {
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (values) => {
          try {
            values.forEach(({ name, value, options }) =>
              jar.set(name, value, {
                ...options,
                httpOnly: true,
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production",
              }),
            );
          } catch {
            /* Server component refresh handled by API session endpoint. */
          }
        },
      },
    },
  );
}
export async function identity(): Promise<string | null> {
  if (localMode()) {
    const token = (await cookies()).get("sbk_session")?.value;
    if (!token) return null;
    const db = await localDB();
    return (
      (
        await db.query<{ member_id: string }>(
          "SELECT member_id FROM sbk.sessions WHERE token_hash=$1 AND expires_at>clock_timestamp()",
          [digest(token)],
        )
      ).rows[0]?.member_id ?? null
    );
  }
  const {
    data: { user },
  } = await (await supabase()).auth.getUser();
  return user?.id ?? null;
}
export async function currentUser() {
  const id = await identity();
  if (!id) return null;
  return transaction(
    id,
    async (db) =>
      (await db.query("SELECT * FROM sbk.profiles WHERE id=$1", [id]))
        .rows[0] ?? null,
  );
}
export async function authenticate(
  mode: "login" | "register",
  account: string,
  password: string,
  name: string,
  language: Lang,
) {
  const identifier = normalizeAccountIdentifier(account);
  if (mode === "register" && identifier.kind !== "email")
    throw new Error("invalid");
  if (localMode()) {
    const db = await localDB();
    let id: string;
    if (mode === "register") {
      id = randomUUID();
      const salt = randomBytes(16).toString("hex");
      await db.transaction(async (tx) => {
        await tx.query(
          "INSERT INTO sbk.profiles(id,email,display_name,language) VALUES($1,$2,$3,$4)",
          [id, identifier.value, name, language],
        );
        await tx.query("INSERT INTO sbk.local_credentials VALUES($1,$2)", [
          id,
          salt + ":" + scryptSync(password, salt, 64).toString("hex"),
        ]);
      });
    } else {
      const found = (
        await db.query<{ id: string; password_hash: string }>(
          "SELECT p.id,c.password_hash FROM sbk.profiles p JOIN sbk.local_credentials c ON c.member_id=p.id WHERE p.email=$1",
          [identifier.value],
        )
      ).rows[0];
      const [salt, hash] = (found?.password_hash ?? "dummy:00").split(":");
      const actual = scryptSync(password, salt, 64),
        expected = Buffer.from(hash, "hex");
      if (
        !found ||
        expected.length !== actual.length ||
        !timingSafeEqual(actual, expected)
      )
        throw new Error("invalid_login");
      id = found.id;
    }
    const token = randomBytes(32).toString("hex");
    await db.query(
      "INSERT INTO sbk.sessions VALUES($1,$2,clock_timestamp()+interval '7 days')",
      [digest(token), id],
    );
    (await cookies()).set("sbk_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 604800,
    });
    return { pending: mode === "register" };
  }
  const client = await supabase();
  if (mode === "register") {
    const { error } = await client.auth.signUp({
      email: identifier.value,
      password,
      options: {
        data: { display_name: name, language },
        emailRedirectTo: process.env.APP_ORIGIN + "/auth/confirm",
      },
    });
    if (error) throw new Error("registration_failed");
    return { confirm: true };
  }
  const { data, error } = await client.auth.signInWithPassword(
    identifier.kind === "email"
      ? { email: identifier.value, password }
      : { phone: identifier.value, password },
  );
  if (error || !data.user) throw new Error("invalid_login");
  await provision(
    data.user.id,
    data.user.email ?? data.user.phone ?? identifier.value,
    data.user.user_metadata?.display_name,
    data.user.user_metadata?.language,
  );
  return {};
}
export async function provision(
  id: string,
  email: string,
  name: unknown,
  lang: unknown,
) {
  await transaction(null, (db) =>
    db.query("SELECT sbk.provision($1,$2,$3,$4)", [
      id,
      email,
      typeof name === "string" && name.length >= 2
        ? name.slice(0, 50)
        : "SBK Member",
      lang === "ml" ? "ml" : "en",
    ]),
  );
}
export async function logout() {
  if (localMode()) {
    const token = (await cookies()).get("sbk_session")?.value;
    if (token)
      await (
        await localDB()
      ).query("DELETE FROM sbk.sessions WHERE token_hash=$1", [digest(token)]);
    (await cookies()).delete("sbk_session");
  } else await (await supabase()).auth.signOut();
}
