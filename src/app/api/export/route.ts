import { NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import { limited, transaction } from "@/lib/db";
import { memberGuard } from "@/lib/service";
export const dynamic = "force-dynamic";
const queries: Record<string, string> = {
  fixtures:
    "SELECT f.*,h.name_en home_team,a.name_en away_team,o.name_en round_name FROM sbk.fixtures f JOIN sbk.teams h ON h.id=f.home_id JOIN sbk.teams a ON a.id=f.away_id JOIN sbk.rounds o ON o.id=f.round_id ORDER BY kickoff LIMIT 10001",
  predictions:
    "SELECT p.*,u.display_name,h.name_en home_team,a.name_en away_team,f.kickoff,f.status,r.home_goals result_home,r.away_goals result_away,CASE WHEN f.status='finalized' THEN sbk.score(p.home_goals,p.away_goals,r.home_goals,r.away_goals) ELSE NULL END points FROM sbk.predictions p JOIN sbk.profiles u ON u.id=p.member_id JOIN sbk.fixtures f ON f.id=p.fixture_id JOIN sbk.teams h ON h.id=f.home_id JOIN sbk.teams a ON a.id=f.away_id LEFT JOIN sbk.results r ON r.fixture_id=f.id WHERE f.deadline<=clock_timestamp() ORDER BY p.fixture_id LIMIT 10001",
  standings: "SELECT * FROM sbk.standings(NULL) ORDER BY rank LIMIT 10001",
  membership:
    "SELECT id,display_name,email,membership,role,created_at FROM sbk.profiles ORDER BY created_at LIMIT 10001",
};
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user || user.role !== "admin" || user.membership !== "approved")
    return new Response("Forbidden", { status: 403 });
  const kind = req.nextUrl.searchParams.get("type") ?? "";
  if (!queries[kind]) return new Response("Invalid report", { status: 400 });
  try {
    await limited("export:" + user.id, 5, 60);
    const rows = await transaction(user.id, async (db) => {
      await memberGuard(db, user.id, true);
      return (await db.query(queries[kind])).rows;
    });
    if (rows.length > 10000)
      return new Response(
        "Report exceeds 10,000 rows. Use the secure database export procedure.",
        { status: 413 },
      );
    const cell = (x: unknown) => {
      let v = x instanceof Date ? x.toISOString() : String(x ?? "");
      if (/^[=+@\-\t\r]/.test(v)) v = "'" + v;
      return '"' + v.replaceAll('"', '""') + '"';
    };
    const keys = Object.keys(rows[0] ?? {});
    const csv =
      "\uFEFF" +
      [
        keys.map(cell).join(","),
        ...rows.map((r) => keys.map((k) => cell(r[k])).join(",")),
      ].join("\r\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="sbk-${kind}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("Unable to export. Retry later.", { status: 429 });
  }
}
