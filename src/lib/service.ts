import { z } from "zod";
import { transaction, type DB, type Row } from "./db";
const uuid = z.string().uuid(),
  name = z.string().trim().min(2).max(100),
  text = z.string().trim().max(10000),
  goals = z.number().int().min(0).max(20);
const bool = z.boolean();
export const schemas = {
  profile: z.object({
    display_name: name.max(50),
    language: z.enum(["en", "ml"]),
  }),
  prediction: z.object({
    fixture_id: uuid,
    home_goals: goals,
    away_goals: goals,
  }),
  review: z.object({
    member_id: uuid,
    membership: z.enum(["approved", "rejected", "suspended"]),
    note: text,
  }),
  promote: z.object({ member_id: uuid }),
  teams: z.object({
    id: uuid.optional(),
    name_en: name,
    name_ml: text.max(100),
    short_name: z.string().trim().min(1).max(8),
    badge: z.union([
      z.literal(""),
      z.url().refine((v) => v.startsWith("https://")),
    ]),
    active: bool,
  }),
  rounds: z.object({
    id: uuid.optional(),
    name_en: name,
    name_ml: name,
    sort_order: z.number().int().min(0).max(999),
    active: bool,
    stage_en: text.max(100).default(""),
    stage_ml: text.max(100).default(""),
    starts_at: z.iso.datetime({ offset: true }).nullable().default(null),
    ends_at: z.iso.datetime({ offset: true }).nullable().default(null),
  }),
  fixtures: z
    .object({
      id: uuid.optional(),
      round_id: uuid,
      home_id: uuid,
      away_id: uuid,
      kickoff: z.iso.datetime({ offset: true }),
      venue_en: text.max(200),
      venue_ml: text.max(200),
      status: z.enum([
        "scheduled",
        "postponed",
        "cancelled",
        "in_progress",
        "awaiting_result",
      ]),
      knockout: bool,
      demo: bool,
      schedule_note_en: text.max(500),
      schedule_note_ml: text.max(500),
    })
    .refine((v) => v.home_id !== v.away_id),
  results: z.object({
    fixture_id: uuid,
    home_goals: goals,
    away_goals: goals,
    reason: text.max(1000),
    expected_updated_at: z.iso
      .datetime({ offset: true })
      .nullable()
      .default(null),
  }),
  announcements: z.object({
    id: uuid.optional(),
    title_en: name,
    title_ml: name,
    body_en: text.min(2),
    body_ml: text.min(2),
    published: bool,
    starts_at: z.iso.datetime({ offset: true }).nullable(),
    ends_at: z.iso.datetime({ offset: true }).nullable(),
  }),
  rules: z.object({
    body_en: text.min(10),
    body_ml: text.min(10),
    contact: text.max(500),
  }),
};
export const fixtureSelect = `SELECT f.*,h.name_en home_en,h.name_ml home_ml,h.short_name home_short,h.badge home_badge,a.name_en away_en,a.name_ml away_ml,a.short_name away_short,a.badge away_badge,o.name_en round_en,o.name_ml round_ml,p.home_goals predicted_home,p.away_goals predicted_away,p.updated_at saved_at,r.home_goals result_home,r.away_goals result_away,r.updated_at result_at,CASE WHEN f.status='finalized' THEN sbk.score(p.home_goals,p.away_goals,r.home_goals,r.away_goals) ELSE NULL END points FROM sbk.fixtures f JOIN sbk.teams h ON h.id=f.home_id JOIN sbk.teams a ON a.id=f.away_id JOIN sbk.rounds o ON o.id=f.round_id LEFT JOIN sbk.predictions p ON p.fixture_id=f.id AND p.member_id=sbk.uid() LEFT JOIN sbk.results r ON r.fixture_id=f.id`;
export async function memberGuard(db: DB, id: string, admin = false) {
  const p = (await db.query("SELECT * FROM sbk.profiles WHERE id=$1", [id]))
    .rows[0];
  if (!p || p.membership !== "approved" || (admin && p.role !== "admin"))
    throw new Error("forbidden");
  return p;
}
export async function loadData(
  id: string,
  section: string,
  params: Record<string, string> = {},
) {
  return transaction(id, async (db) => {
    const p = await memberGuard(db, id, section === "admin");
    const page = Math.floor(
        Math.max(1, Math.min(Number(params.page) || 1, 100000)),
      ),
      limit = 30,
      offset = (page - 1) * limit;
    const self = (
      await db.query("SELECT * FROM sbk.standings(NULL) WHERE member_id=$1", [
        id,
      ])
    ).rows[0];
    const data: Row = {
      profile: p,
      self,
      page,
      now: new Date().toISOString(),
      rounds: (
        await db.query("SELECT * FROM sbk.rounds ORDER BY sort_order,name_en")
      ).rows,
    };
    if (section === "home") {
      data.fixtures = (
        await db.query(
          fixtureSelect +
            " WHERE f.status='scheduled' AND f.deadline>clock_timestamp() ORDER BY f.kickoff LIMIT 4",
        )
      ).rows;
      data.latest = (
        await db.query(
          fixtureSelect +
            " WHERE f.status='finalized' ORDER BY r.updated_at DESC LIMIT 1",
        )
      ).rows[0];
      data.announcements = (
        await db.query(
          "SELECT * FROM sbk.announcements WHERE published AND (starts_at IS NULL OR starts_at<=clock_timestamp()) AND (ends_at IS NULL OR ends_at>clock_timestamp()) ORDER BY updated_at DESC LIMIT 5",
        )
      ).rows;
      data.leaders = (
        await db.query(
          "SELECT * FROM sbk.standings(NULL) ORDER BY rank,display_name,member_id LIMIT 5",
        )
      ).rows;
    }
    if (section === "matches" || section === "predictions") {
      const conditions: Record<string, string> = {
        upcoming: "f.status='scheduled' AND f.deadline>clock_timestamp()",
        locked:
          "(f.status IN('in_progress','awaiting_result') OR (f.status='scheduled' AND f.deadline<=clock_timestamp()))",
        completed: "f.status='finalized'",
        scored: "f.status='finalized'",
        awaiting:
          "p.id IS NOT NULL AND f.status IN('scheduled','in_progress','awaiting_result') AND f.deadline<=clock_timestamp()",
        postponed: "f.status='postponed'",
        cancelled: "f.status='cancelled'",
        all: "true",
      };
      const where =
        conditions[
          params.filter ?? (section === "matches" ? "upcoming" : "all")
        ] ?? "true";
      data.fixtures = (
        await db.query(
          fixtureSelect +
            ` WHERE (${where}) AND (h.name_en ILIKE $1 OR a.name_en ILIKE $1 OR h.name_ml ILIKE $1 OR a.name_ml ILIKE $1 OR o.name_en ILIKE $1 OR o.name_ml ILIKE $1) ORDER BY f.kickoff ${params.filter === "completed" ? "DESC" : "ASC"} LIMIT 31 OFFSET $2`,
          ["%" + (params.q ?? "").slice(0, 100) + "%", offset],
        )
      ).rows;
      data.hasNext = data.fixtures.length > 30;
      data.fixtures = data.fixtures.slice(0, 30);
    }
    if (section === "match") {
      const fixtureId = uuid.parse(params.id);
      data.fixture = (
        await db.query(fixtureSelect + " WHERE f.id=$1", [fixtureId])
      ).rows[0];
      data.others = (
        await db.query(
          "SELECT p.home_goals,p.away_goals,p.updated_at FROM sbk.predictions p JOIN sbk.fixtures f ON f.id=p.fixture_id WHERE p.fixture_id=$1 AND f.deadline<=clock_timestamp() ORDER BY p.updated_at LIMIT 30",
          [fixtureId],
        )
      ).rows;
    }
    if (section === "leaderboard") {
      const round = params.round ? uuid.parse(params.round) : null;
      data.self = (
        await db.query("SELECT * FROM sbk.standings($1) WHERE member_id=$2", [
          round,
          id,
        ])
      ).rows[0];
      if (params.mine === "1" && data.self) {
        const pos = (
          await db.query(
            "SELECT position FROM (SELECT member_id,row_number() OVER(ORDER BY rank,display_name,member_id) position FROM sbk.standings($1)) t WHERE member_id=$2",
            [round, id],
          )
        ).rows[0];
        data.page = Math.ceil(Number(pos.position) / 30);
      }
      data.leaders = (
        await db.query(
          "SELECT * FROM sbk.standings($1) ORDER BY rank,display_name,member_id LIMIT 31 OFFSET $2",
          [round, (data.page - 1) * 30],
        )
      ).rows;
      data.hasNext = data.leaders.length > 30;
      data.leaders = data.leaders.slice(0, 30);
    }
    if (section === "rules")
      data.rules = (
        await db.query(
          "SELECT * FROM sbk.rules_revisions ORDER BY created_at DESC LIMIT 1",
        )
      ).rows[0];
    if (section === "profile")
      data.predictionCount = (
        await db.query(
          "SELECT count(*) FROM sbk.predictions WHERE member_id=$1",
          [id],
        )
      ).rows[0].count;
    if (section === "admin") {
      const tab = params.tab ?? "overview";
      if (tab === "overview") {
        data.counts = (
          await db.query(
            "SELECT (SELECT count(*) FROM sbk.profiles WHERE membership='pending') pending,(SELECT count(*) FROM sbk.profiles WHERE membership='approved') approved,(SELECT count(*) FROM sbk.fixtures WHERE status='scheduled' AND kickoff>clock_timestamp()) upcoming,(SELECT count(*) FROM sbk.fixtures WHERE status IN('awaiting_result','in_progress') OR (status='scheduled' AND kickoff<=clock_timestamp())) awaiting",
          )
        ).rows[0];
        data.audit = (
          await db.query(
            "SELECT e.*,p.display_name actor_name FROM sbk.admin_audit_events e LEFT JOIN sbk.profiles p ON p.id=e.actor ORDER BY e.created_at DESC LIMIT 10",
          )
        ).rows;
      }
      if (tab === "members") {
        data.members = (
          await db.query(
            "SELECT p.*, (SELECT note FROM sbk.membership_reviews r WHERE r.member_id=p.id ORDER BY created_at DESC LIMIT 1) review_note FROM sbk.profiles p WHERE ($1='all' OR membership=$1) AND (display_name ILIKE $2 OR email ILIKE $2) ORDER BY created_at DESC LIMIT 31 OFFSET $3",
            [
              params.filter ?? "pending",
              "%" + (params.q ?? "").slice(0, 100) + "%",
              offset,
            ],
          )
        ).rows;
        data.hasNext = data.members.length > 30;
        data.members = data.members.slice(0, 30);
      }
      if (["teams", "fixtures", "results"].includes(tab))
        data.teams = (
          await db.query("SELECT * FROM sbk.teams ORDER BY name_en LIMIT 250")
        ).rows;
      if (tab === "fixtures" || tab === "results") {
        data.fixtures = (
          await db.query(
            fixtureSelect + " ORDER BY f.kickoff DESC LIMIT 31 OFFSET $1",
            [offset],
          )
        ).rows;
        data.hasNext = data.fixtures.length > 30;
        data.fixtures = data.fixtures.slice(0, 30);
      }
      if (tab === "content") {
        data.announcements = (
          await db.query(
            "SELECT * FROM sbk.announcements ORDER BY updated_at DESC LIMIT 30",
          )
        ).rows;
        data.rulesHistory = (
          await db.query(
            "SELECT * FROM sbk.rules_revisions ORDER BY created_at DESC LIMIT 20",
          )
        ).rows;
      }
      if (tab === "audit") {
        data.audit = (
          await db.query(
            "SELECT e.*,p.display_name actor_name FROM sbk.admin_audit_events e LEFT JOIN sbk.profiles p ON p.id=e.actor ORDER BY e.created_at DESC,e.id DESC LIMIT 31 OFFSET $1",
            [offset],
          )
        ).rows;
        data.hasNext = data.audit.length > 30;
        data.audit = data.audit.slice(0, 30);
      }
    }
    return data;
  });
}
export async function mutate(
  id: string,
  kind: keyof typeof schemas,
  input: unknown,
) {
  const value = schemas[kind].parse(input) as Row;
  return transaction(id, async (db) => {
    await memberGuard(db, id, !["prediction", "profile"].includes(kind));
    if (kind === "prediction")
      return (
        await db.query(
          "INSERT INTO sbk.predictions(fixture_id,member_id,home_goals,away_goals) VALUES($1,$2,$3,$4) ON CONFLICT(fixture_id,member_id) DO UPDATE SET home_goals=EXCLUDED.home_goals,away_goals=EXCLUDED.away_goals RETURNING *",
          [value.fixture_id, id, value.home_goals, value.away_goals],
        )
      ).rows[0];
    if (kind === "profile")
      return (
        await db.query(
          "UPDATE sbk.profiles SET display_name=$1,language=$2 WHERE id=$3 RETURNING display_name,language",
          [value.display_name, value.language, id],
        )
      ).rows[0];
    if (kind === "review") {
      const target = (
        await db.query("SELECT * FROM sbk.profiles WHERE id=$1 FOR UPDATE", [
          value.member_id,
        ])
      ).rows[0];
      if (!target || target.role === "admin")
        throw new Error("admin_protected");
      await db.query("UPDATE sbk.profiles SET membership=$1 WHERE id=$2", [
        value.membership,
        value.member_id,
      ]);
      await db.query(
        "INSERT INTO sbk.membership_reviews(member_id,admin_id,action,note) VALUES($1,$2,$3,$4)",
        [value.member_id, id, value.membership, value.note],
      );
      return {};
    }
    if (kind === "promote") {
      await db.query("SELECT sbk.promote_member($1)", [value.member_id]);
      return {};
    }
    if (kind === "results") {
      await db.query("SELECT id FROM sbk.fixtures WHERE id=$1 FOR UPDATE", [
        value.fixture_id,
      ]);
      const current = (
        await db.query(
          "SELECT updated_at FROM sbk.results WHERE fixture_id=$1",
          [value.fixture_id],
        )
      ).rows[0];
      const stamp = current ? new Date(current.updated_at).toISOString() : null;
      if (stamp !== value.expected_updated_at) throw new Error("stale_result");
      return (
        await db.query(
          "INSERT INTO sbk.results(fixture_id,home_goals,away_goals,reason,updated_by) VALUES($1,$2,$3,$4,$5) ON CONFLICT(fixture_id) DO UPDATE SET home_goals=EXCLUDED.home_goals,away_goals=EXCLUDED.away_goals,reason=EXCLUDED.reason,updated_by=EXCLUDED.updated_by RETURNING *",
          [
            value.fixture_id,
            value.home_goals,
            value.away_goals,
            value.reason,
            id,
          ],
        )
      ).rows[0];
    }
    const table = kind === "rules" ? "rules_revisions" : kind,
      recordId = value.id;
    delete value.id;
    const columns = Object.keys(value),
      args = Object.values(value);
    if (recordId) {
      args.push(recordId);
      return (
        await db.query(
          `UPDATE sbk.${table} SET ${columns.map((c, i) => `${c}=$${i + 1}`).join(",")} WHERE id=$${args.length} RETURNING *`,
          args,
        )
      ).rows[0];
    }
    return (
      await db.query(
        `INSERT INTO sbk.${table}(${columns.join(",")}) VALUES(${args.map((_, i) => "$" + (i + 1)).join(",")}) RETURNING *`,
        args,
      )
    ).rows[0];
  });
}
export async function previewResult(id: string, input: unknown) {
  const v = schemas.results.parse(input);
  return transaction(id, async (db) => {
    await memberGuard(db, id, true);
    return (
      await db.query(
        `SELECT p.member_id,u.display_name,sbk.score(p.home_goals,p.away_goals,r.home_goals,r.away_goals) before,sbk.score(p.home_goals,p.away_goals,$2,$3) after FROM sbk.predictions p JOIN sbk.profiles u ON u.id=p.member_id JOIN sbk.fixtures f ON f.id=p.fixture_id LEFT JOIN sbk.results r ON r.fixture_id=f.id WHERE f.id=$1 AND f.deadline<=clock_timestamp() ORDER BY u.display_name LIMIT 500`,
        [v.fixture_id, v.home_goals, v.away_goals],
      )
    ).rows;
  });
}
