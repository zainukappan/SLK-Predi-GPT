import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { authenticate, currentUser, logout, supabase } from "@/lib/auth";
import { limited, localMode } from "@/lib/db";
import { mutate, previewResult, schemas } from "@/lib/service";
import { createManagedMember, updateManagedMember } from "@/lib/admin-members";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    if (
      request.headers.get("origin") !==
      (process.env.APP_ORIGIN ?? "http://localhost:3000")
    )
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    if (Number(request.headers.get("content-length") ?? 0) > 50000)
      throw new Error("invalid");
    const raw = await request.text();
    if (raw.length > 50000) throw new Error("invalid");
    const { kind, data } = JSON.parse(raw);
    if (["login", "register", "reset"].includes(kind)) {
      const v = z
        .object({
          email: z
            .string()
            .trim()
            .max(254)
            .transform((v) => v.toLowerCase()),
          password: z.string().min(10).max(128).optional(),
          display_name: z.string().trim().min(2).max(50).optional(),
          language: z.enum(["en", "ml"]).default("en"),
        })
        .parse(data);
      if (kind !== "login" && !z.email().safeParse(v.email).success)
        throw new Error("invalid");
      await limited("auth:global", 300, 60);
      await limited("auth:" + v.email, 10, 60);
      if (kind === "reset") {
        if (localMode()) return NextResponse.json({ message: "localReset" });
        await (
          await supabase()
        ).auth.resetPasswordForEmail(v.email, {
          redirectTo:
            process.env.APP_ORIGIN + "/auth/confirm?next=/reset-password",
        });
        return NextResponse.json({ message: "resetSent" });
      }
      if (!v.password || (kind === "register" && !v.display_name))
        throw new Error("invalid");
      const result = await authenticate(
        kind,
        v.email,
        v.password,
        v.display_name ?? "SBK Member",
        v.language,
      );
      const profile = await currentUser();
      if (profile)
        (await cookies()).set("sbk_language", profile.language, {
          path: "/",
          maxAge: 31536000,
          sameSite: "lax",
        });
      return NextResponse.json(result);
    }
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: "forbidden" }, { status: 401 });
    await limited("write:" + user.id, 60, 60);
    if (kind === "logout") {
      await logout();
      return NextResponse.json({ ok: true });
    }
    if (kind === "password") {
      const password = z.string().min(10).max(128).parse(data.password);
      if (localMode()) throw new Error("localReset");
      const { error } = await (await supabase()).auth.updateUser({ password });
      if (error) throw new Error("invalid");
      return NextResponse.json({ ok: true });
    }
    if (kind === "preview")
      return NextResponse.json({ rows: await previewResult(user.id, data) });
    if (kind === "createMember") {
      await limited("member-create:" + user.id, 20, 3600);
      return NextResponse.json(
        { ok: true, result: await createManagedMember(user.id, data) },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }
    if (kind === "updateMember") {
      await limited("member-update:" + user.id, 30, 3600);
      return NextResponse.json(
        { ok: true, result: await updateManagedMember(user.id, data) },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }
    if (!Object.hasOwn(schemas, kind)) throw new Error("invalid");
    const result = await mutate(user.id, kind, data);
    return NextResponse.json(
      { ok: true, result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "invalid";
    const safe = [
      "forbidden",
      "rate_limit",
      "prediction_locked",
      "invalid_login",
      "registration_failed",
      "correction_reason",
      "schedule_note_required",
      "fixture_identity_locked",
      "finalized_immutable",
      "result_state",
      "not_started",
      "result_required",
      "admin_protected",
      "localReset",
      "stale_result",
      "account_exists",
      "member_create_failed",
      "admin_auth_missing",
      "winner_score_mismatch",
      "first_goal_mismatch",
      "identifier_kind_change",
      "member_update_failed",
      "prediction_not_locked",
      "member_not_approved",
    ];
    const error = safe.find((s) => message.includes(s)) ?? "invalid";
    return NextResponse.json(
      { error },
      {
        status:
          error === "forbidden" ? 403 : error === "rate_limit" ? 429 : 400,
      },
    );
  }
}
