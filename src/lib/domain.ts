export type Lang = "en" | "ml";
export type Status =
  | "scheduled"
  | "postponed"
  | "cancelled"
  | "in_progress"
  | "awaiting_result"
  | "finalized";
export function points(
  h: number | null,
  a: number | null,
  rh: number,
  ra: number,
) {
  if (h === null || a === null) return 0;
  return h === rh && a === ra
    ? 5
    : Math.sign(h - a) === Math.sign(rh - ra)
      ? 3
      : 0;
}
export function canPredict(status: Status, kickoff: string, now = new Date()) {
  return (
    status === "scheduled" &&
    now.getTime() < new Date(kickoff).getTime() - 300000
  );
}
export function ranks<
  T extends { points: number; exact: number; correct: number },
>(rows: T[]) {
  const sorted = [...rows].sort(
    (a, b) => b.points - a.points || b.exact - a.exact || b.correct - a.correct,
  );
  let rank = 1;
  return sorted.map((r, i) => {
    if (
      i &&
      (r.points !== sorted[i - 1].points ||
        r.exact !== sorted[i - 1].exact ||
        r.correct !== sorted[i - 1].correct)
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
