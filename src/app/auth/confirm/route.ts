import { NextRequest, NextResponse } from "next/server";
import { supabase, provision } from "@/lib/auth";
import { localMode } from "@/lib/db";
export async function GET(request: NextRequest) {
  const origin = process.env.APP_ORIGIN ?? request.nextUrl.origin;
  if (localMode()) return NextResponse.redirect(origin + "/");
  const client = await supabase();
  const code = request.nextUrl.searchParams.get("code");
  const hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  let ok = false;
  if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (
    hash &&
    (type === "signup" || type === "recovery" || type === "email")
  ) {
    const { error } = await client.auth.verifyOtp({ token_hash: hash, type });
    ok = !error;
  }
  if (ok) {
    const {
      data: { user },
    } = await client.auth.getUser();
    if (user)
      await provision(
        user.id,
        user.email!,
        user.user_metadata.display_name,
        user.user_metadata.language,
      );
    return NextResponse.redirect(
      origin +
        (request.nextUrl.searchParams.get("next") === "/reset-password" ||
        type === "recovery"
          ? "/reset-password"
          : "/home"),
    );
  }
  return NextResponse.redirect(origin + "/?error=invalid_login");
}
