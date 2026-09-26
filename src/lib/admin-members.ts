import { createClient } from "@supabase/supabase-js";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { z } from "zod";
import { localDB, localMode, transaction } from "./db";
import { memberGuard } from "./service";
import { normalizeAccountIdentifier } from "./account";

const inputSchema = z.object({
  display_name: z.string().trim().min(2).max(50),
  identifier: z.string().trim().min(8).max(254),
  password: z.string().min(10).max(128),
  language: z.enum(["en", "ml"]),
});
const updateSchema = z.object({
  member_id: z.string().uuid(),
  identifier: z.string().trim().min(8).max(254),
  password: z.union([z.literal(""), z.string().min(10).max(128)]),
});

function adminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error("admin_auth_missing");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function createManagedMember(adminId: string, input: unknown) {
  const value = inputSchema.parse(input);
  const identifier = normalizeAccountIdentifier(value.identifier);
  const password = value.password;
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

  const admin = adminClient();
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

export async function updateManagedMember(adminId: string, input: unknown) {
  const value = updateSchema.parse(input);
  const identifier = normalizeAccountIdentifier(value.identifier);
  const target = await transaction(adminId, async (db) => {
    await memberGuard(db, adminId, true);
    const profile = (await db.query("SELECT id,email,role FROM sbk.profiles WHERE id=$1", [value.member_id])).rows[0];
    if (!profile || profile.role !== "member") throw new Error("admin_protected");
    return profile;
  });
  const previous = normalizeAccountIdentifier(target.email);
  if (previous.kind !== identifier.kind) throw new Error("identifier_kind_change");

  if (localMode()) {
    const db = await localDB();
    await db.transaction(async (tx) => {
      await tx.query("UPDATE sbk.profiles SET email=$1 WHERE id=$2", [identifier.value, value.member_id]);
      if (value.password) {
        const salt = randomBytes(16).toString("hex");
        await tx.query("UPDATE sbk.local_credentials SET password_hash=$1 WHERE member_id=$2", [
          salt + ":" + scryptSync(value.password, salt, 64).toString("hex"), value.member_id,
        ]);
      }
    });
    return { identifier: identifier.value };
  }

  const admin = adminClient();
  const attributes: Record<string, unknown> = value.password ? { password: value.password } : {};
  if (identifier.value !== previous.value) {
    if (identifier.kind === "email") Object.assign(attributes, { email: identifier.value, email_confirm: true });
    else Object.assign(attributes, { phone: identifier.value, phone_confirm: true });
  }
  const { error } = await admin.auth.admin.updateUserById(value.member_id, attributes);
  if (error) throw new Error(error.message.toLowerCase().includes("already") ? "account_exists" : "member_update_failed");
  if (identifier.value !== previous.value) {
    try {
      await transaction(adminId, async (db) => {
        await memberGuard(db, adminId, true);
        await db.query("SELECT sbk.admin_update_identifier($1,$2)", [value.member_id, identifier.value]);
      });
    } catch (error) {
      const rollback = previous.kind === "email" ? { email: previous.value, email_confirm: true } : { phone: previous.value, phone_confirm: true };
      await admin.auth.admin.updateUserById(value.member_id, rollback);
      throw error;
    }
  }
  return { identifier: identifier.value };
}
