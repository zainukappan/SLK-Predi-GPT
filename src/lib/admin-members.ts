import { createClient } from "@supabase/supabase-js";
import { randomInt, randomBytes, randomUUID, scryptSync } from "node:crypto";
import { z } from "zod";
import { localDB, localMode, transaction } from "./db";
import { memberGuard } from "./service";
import { normalizeAccountIdentifier } from "./account";

const inputSchema = z.object({
  display_name: z.string().trim().min(2).max(50),
  identifier: z.string().trim().min(8).max(254),
  language: z.enum(["en", "ml"]),
});

function generatedPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const required = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%"]
    .map((set) => set[randomInt(set.length)]);
  const chars = [...required];
  while (chars.length < 16) chars.push(alphabet[randomInt(alphabet.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export async function createManagedMember(adminId: string, input: unknown) {
  const value = inputSchema.parse(input);
  const identifier = normalizeAccountIdentifier(value.identifier);
  const password = generatedPassword();
  await transaction(adminId, (db) => memberGuard(db, adminId, true));

  if (localMode()) {
    const id = randomUUID(), salt = randomBytes(16).toString("hex");
    const db = await localDB();
    await db.transaction(async (tx) => {
      await tx.query(
        "INSERT INTO sbk.profiles(id,email,display_name,language,membership) VALUES($1,$2,$3,$4,'approved')",
        [id, identifier.value, value.display_name, value.language],
      );
      await tx.query("INSERT INTO sbk.local_credentials VALUES($1,$2)", [
        id,
        salt + ":" + scryptSync(password, salt, 64).toString("hex"),
      ]);
      await tx.query(
        "INSERT INTO sbk.membership_reviews(member_id,admin_id,action,note) VALUES($1,$2,'approved','Created directly by organizer')",
        [id, adminId],
      );
    });
    return { identifier: identifier.value, password };
  }

  const secret =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !process.env.NEXT_PUBLIC_SUPABASE_URL)
    throw new Error("admin_auth_missing");
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const authInput = {
    password,
    email_confirm: identifier.kind === "email",
    phone_confirm: identifier.kind === "phone",
    user_metadata: { display_name: value.display_name, language: value.language },
    app_metadata: { managed_by_sbk: true },
    ...(identifier.kind === "email"
      ? { email: identifier.value }
      : { phone: identifier.value }),
  };
  const { data, error } = await admin.auth.admin.createUser(authInput);
  if (error || !data.user)
    throw new Error(error?.message.toLowerCase().includes("already") ? "account_exists" : "member_create_failed");
  try {
    await transaction(adminId, async (db) => {
      await db.query("SELECT sbk.provision($1,$2,$3,$4)", [
        data.user.id,
        identifier.value,
        value.display_name,
        value.language,
      ]);
      await db.query(
        "UPDATE sbk.profiles SET membership='approved' WHERE id=$1",
        [data.user.id],
      );
      await db.query(
        "INSERT INTO sbk.membership_reviews(member_id,admin_id,action,note) VALUES($1,$2,'approved','Created directly by organizer')",
        [data.user.id, adminId],
      );
    });
  } catch (error) {
    await admin.auth.admin.deleteUser(data.user.id);
    throw error;
  }
  return { identifier: identifier.value, password };
}
