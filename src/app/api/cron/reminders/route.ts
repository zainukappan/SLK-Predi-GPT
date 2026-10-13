import { NextRequest, NextResponse } from "next/server";
import { transaction, type Row } from "@/lib/db";
import { sendFixtureReminderToUnpredictedMembers } from "@/lib/push";

export const dynamic = "force-dynamic";

async function runAutomatedReminders(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = request.headers.get("authorization") || "";
    const queryKey = request.nextUrl.searchParams.get("key") || "";
    const isAuthorized =
      authHeader === `Bearer ${secret}` || queryKey === secret;

    if (!isAuthorized) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  return transaction(null, async (db) => {
    // Find fixtures where current time is within 30 minutes before deadline and not past deadline,
    // and reminder has not been sent yet.
    const eligibleFixtures = (
      await db.query(
        `SELECT id, match_number, kickoff, deadline, reminder_sent_at
         FROM sbk.fixtures
         WHERE status = 'scheduled'
           AND deadline - interval '30 minutes' <= clock_timestamp()
           AND deadline > clock_timestamp()
           AND reminder_sent_at IS NULL
         ORDER BY deadline ASC`,
      )
    ).rows;

    const results = [];
    for (const fixture of eligibleFixtures) {
      try {
        const res = await sendFixtureReminderToUnpredictedMembers(fixture.id);
        results.push({
          matchNumber: fixture.match_number,
          success: true,
          ...res,
        });
      } catch (e: any) {
        results.push({
          fixtureId: fixture.id,
          matchNumber: fixture.match_number,
          success: false,
          error: e.message,
        });
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      checkedCount: eligibleFixtures.length,
      results,
    });
  });
}

export async function GET(request: NextRequest) {
  return runAutomatedReminders(request);
}

export async function POST(request: NextRequest) {
  return runAutomatedReminders(request);
}
