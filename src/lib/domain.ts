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
  try {
    const k =
      typeof kickoff === "string" && kickoff.includes(" ") && !kickoff.includes("T")
        ? kickoff.replace(" ", "T")
        : kickoff;
    const kickoffTime = new Date(k).getTime();
    if (isNaN(kickoffTime)) return false;
    return status === "scheduled" && now.getTime() < kickoffTime - 5_400_000;
  } catch {
    return false;
  }
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
  try {
    let d: Date;
    if (value instanceof Date) {
      d = value;
    } else if (typeof value === "string") {
      const normalized =
        value.includes(" ") && !value.includes("T")
          ? value.replace(" ", "T")
          : value;
      d = new Date(normalized);
    } else {
      d = new Date(value);
    }
    if (isNaN(d.getTime())) return "—";
    return (
      new Intl.DateTimeFormat(lang === "ml" ? "ml-IN" : "en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(d) + " IST"
    );
  } catch {
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return "—";
      return d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST";
    } catch {
      return String(value ?? "—");
    }
  }
}
