import webpush from "web-push";
import { transaction, type DB, type Row } from "./db";

const publicKey =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BDCZApyxlJsYwRBowAzCiJBZx6qAvTAjKAaNJG3FxTNDqHAfIirRLq-xLyu51DcRIH5jMPlxbAs6mKUKqXn8kBI";
const privateKey =
  process.env.VAPID_PRIVATE_KEY ||
  "wnUZM-4Rpa-mk83jpzoQYYV6eO28JOqu_1a4dHqWh6U";
const subject =
  process.env.VAPID_SUBJECT || "mailto:admin@slkprediction.com";

if (publicKey && privateKey) {
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
  } catch (e) {
    console.error("Failed to initialize VAPID details:", e);
  }
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function savePushSubscription(
  memberId: string,
  sub: PushSubscriptionData,
  userAgent = "",
) {
  return transaction(memberId, async (db) => {
    return (
      await db.query(
        `INSERT INTO sbk.push_subscriptions (member_id, endpoint, p256dh, auth, user_agent, updated_at)
         VALUES ($1, $2, $3, $4, $5, clock_timestamp())
         ON CONFLICT (endpoint) DO UPDATE
         SET member_id = EXCLUDED.member_id,
             p256dh = EXCLUDED.p256dh,
             auth = EXCLUDED.auth,
             user_agent = EXCLUDED.user_agent,
             updated_at = clock_timestamp()
         RETURNING id`,
        [
          memberId,
          sub.endpoint,
          sub.keys.p256dh,
          sub.keys.auth,
          userAgent.slice(0, 500),
        ],
      )
    ).rows[0];
  });
}

export async function removePushSubscription(endpoint: string) {
  return transaction(null, async (db) => {
    await db.query("DELETE FROM sbk.push_subscriptions WHERE endpoint = $1", [
      endpoint,
    ]);
  });
}

export async function sendPushPayload(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url: string; tag?: string },
) {
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      },
      JSON.stringify(payload),
    );
    return true;
  } catch (err: any) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      await removePushSubscription(sub.endpoint).catch(() => {});
    }
    return false;
  }
}

export async function getFixtureUnpredictedStats(fixtureId: string) {
  return transaction(null, async (db) => {
    const members = (
      await db.query(
        "SELECT * FROM sbk.fixture_unpredicted_members($1::uuid)",
        [fixtureId],
      )
    ).rows;
    return {
      unpredictedCount: members.length,
      subscribedCount: members.filter((m: Row) => Number(m.push_count) > 0).length,
      members,
    };
  });
}

export async function sendFixtureReminderToUnpredictedMembers(
  fixtureId: string,
  adminId: string | null = null,
) {
  return transaction(adminId, async (db) => {
    const fixture = (
      await db.query(
        `SELECT f.id, f.status, f.deadline, f.kickoff, f.match_number, f.reminder_sent_at,
                h.name_en home_en, a.name_en away_en, h.short_name home_short, a.short_name away_short
         FROM sbk.fixtures f
         JOIN sbk.teams h ON h.id = f.home_id
         JOIN sbk.teams a ON a.id = f.away_id
         WHERE f.id = $1`,
        [fixtureId],
      )
    ).rows[0];

    if (!fixture) throw new Error("fixture_not_found");
    if (fixture.status !== "scheduled") throw new Error("fixture_not_scheduled");

    const subscriptions = (
      await db.query<{ endpoint: string; p256dh: string; auth: string; member_id: string }>(
        `SELECT ps.endpoint, ps.p256dh, ps.auth, ps.member_id
         FROM sbk.push_subscriptions ps
         JOIN sbk.profiles p ON p.id = ps.member_id
         WHERE p.membership = 'approved'
           AND NOT EXISTS (
             SELECT 1 FROM sbk.predictions pr
             WHERE pr.fixture_id = $1 AND pr.member_id = p.id
           )`,
        [fixtureId],
      )
    ).rows;

    const unpredictedTotal = (
      await db.query(
        `SELECT count(*) FROM sbk.profiles p
         WHERE p.membership = 'approved'
           AND NOT EXISTS (
             SELECT 1 FROM sbk.predictions pr
             WHERE pr.fixture_id = $1 AND pr.member_id = p.id
           )`,
        [fixtureId],
      )
    ).rows[0].count;

    const payload = {
      title: "⏰ Hurry! Only 30 Minutes Left to Predict!",
      body: `Predictions for ${fixture.home_en} vs ${fixture.away_en} lock in 30 minutes. Submit your call now to secure your leaderboard points!`,
      url: `/match?id=${fixture.id}`,
      tag: `prediction-reminder-${fixture.id}`,
    };

    let sentSuccess = 0;
    for (const sub of subscriptions) {
      const ok = await sendPushPayload(sub, payload);
      if (ok) sentSuccess++;
    }

    await db.query(
      "UPDATE sbk.fixtures SET reminder_sent_at = clock_timestamp() WHERE id = $1",
      [fixtureId],
    );

    return {
      sentCount: sentSuccess,
      subscriptionsTargeted: subscriptions.length,
      unpredictedTotal: Number(unpredictedTotal),
      fixtureId,
    };
  });
}
