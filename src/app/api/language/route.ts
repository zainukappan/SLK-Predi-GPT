import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { currentUser } from "@/lib/auth";
import { memberGuard } from "@/lib/service";
import { limited, transaction } from "@/lib/db";
import { z } from "zod";
export async function POST(req: NextRequest) {
  if (
    req.headers.get("origin") !==
    (process.env.APP_ORIGIN ?? "http://localhost:3000")
  )
    return new Response(null, { status: 403 });
  const user = await currentUser();
  if (!user) return new Response(null, { status: 401 });
  try {
    await limited("language:" + user.id, 30, 60);
    const raw = await req.text();
    if (raw.length > 200) return new Response(null, { status: 400 });
    const { language } = z
      .object({ language: z.enum(["en", "ml"]) })
      .parse(JSON.parse(raw));
    await transaction(user.id, async (db) => {
      await memberGuard(db, user.id);
      await db.query("UPDATE sbk.profiles SET language=$1 WHERE id=$2", [
        language,
        user.id,
      ]);
    });
    (await cookies()).set("sbk_language", language, {
      sameSite: "lax",
      path: "/",
      maxAge: 31536000,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return new Response(null, { status: 400 });
  }
}
