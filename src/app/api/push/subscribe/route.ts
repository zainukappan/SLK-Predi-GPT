import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { limited } from "@/lib/db";
import { removePushSubscription, savePushSubscription } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "forbidden" }, { status: 401 });
    }
    await limited("push:subscribe:" + user.id, 20, 60);

    const body = await request.json();
    const { action, subscription } = body;

    if (action === "unsubscribe" && subscription?.endpoint) {
      await removePushSubscription(subscription.endpoint);
      return NextResponse.json({ ok: true });
    }

    if (
      !subscription ||
      !subscription.endpoint ||
      !subscription.keys?.p256dh ||
      !subscription.keys?.auth
    ) {
      return NextResponse.json({ error: "invalid_subscription" }, { status: 400 });
    }

    const userAgent = request.headers.get("user-agent") || "";
    await savePushSubscription(user.id, subscription, userAgent);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "failed" },
      { status: 500 },
    );
  }
}
