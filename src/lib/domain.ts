export type Lang = "en" | "ml";
export type Status =
  | "scheduled"
  | "postponed"
  | "cancelled"
  | "in_progress"
  | "awaiting_result"
  | "finalized";
export type Outcome = "home" | "draw" | "away";
export type FirstGoal = "home" | "away" | "nobody";
export function outcome(home: number, away: number): Outcome {
  return home > away ? "home" : home < away ? "away" : "draw";
}
export function points(
  predicted: { home: number; away: number; winner: Outcome; firstGoal: FirstGoal | null } | null,
  result: { home: number; away: number; winner: Outcome; firstGoal: FirstGoal | null },
) {
  if (!predicted) return 0;
  return (
    Number(predicted.home === result.home && predicted.away === result.away) +
    Number(predicted.winner === result.winner) +
    Number(
      predicted.firstGoal !== null &&
        result.firstGoal !== null &&
        predicted.firstGoal === result.firstGoal,
    )
  );
}
export function canPredict(status: Status, kickoff: string, now = new Date()) {
  return (
    status === "scheduled" &&
    now.getTime() < new Date(kickoff).getTime() - 300000
  );
}
export function ranks<T extends { points: number }>(rows: T[]) {
  const sorted = [...rows].sort((a, b) => b.points - a.points);
  let rank = 1;
  return sorted.map((r, i) => {
    if (
      i &&
      r.points !== sorted[i - 1].points
    )
      rank = i + 1;
    return { ...r, rank };
  });
}
export function ist(value: string | Date, lang: Lang = "en") {
  return (
    new Intl.DateTimeFormat(lang === "ml" ? "ml-IN" : "en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(value)) + " IST"
  );
}
