"use client";
import type { Row } from "@/lib/db";
import { ist } from "@/lib/domain";
import { useLanguage } from "./provider";

function labelFor(value: string, row: Row, lang: "en" | "ml", nobody: string, draw: string) {
  if (value === "home") return row[`home_${lang}`] || row.home_en;
  if (value === "away") return row[`away_${lang}`] || row.away_en;
  if (value === "draw") return draw;
  return nobody;
}

export function MemberPredictions({ rows }: { rows: Row[] }) {
  const { t, lang } = useLanguage();
  if (!rows.length) return <p className="member-prediction-empty">{t("noPastPredictions")}</p>;
  return (
    <div className="member-prediction-list">
      {rows.map((row) => (
        <article className="member-prediction-item" key={row.fixture_id}>
          <div className="member-prediction-match">
            <strong>{row[`home_${lang}`] || row.home_en} <span>{row.home_goals}–{row.away_goals}</span> {row[`away_${lang}`] || row.away_en}</strong>
            <small>{row[`round_${lang}`] || row.round_en} · {ist(row.kickoff, lang)}</small>
          </div>
          <dl>
            <div><dt>{t("winnerQuestion")}</dt><dd>{labelFor(row.predicted_winner, row, lang, t("nobody"), t("draw"))}</dd></div>
            <div><dt>{t("scoreQuestion")}</dt><dd>{row.home_goals}–{row.away_goals}</dd></div>
            <div><dt>{t("firstGoalQuestion")}</dt><dd>{labelFor(row.first_goal, row, lang, t("nobody"), t("draw"))}</dd></div>
            <div><dt>{t("earned")}</dt><dd>{row.points == null ? "—" : row.points}</dd></div>
          </dl>
          {row.status === "finalized" && (
            <small className="member-prediction-result">{t("actual")}: {row.result_home}–{row.result_away}</small>
          )}
        </article>
      ))}
    </div>
  );
}
