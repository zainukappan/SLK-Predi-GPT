"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Clock3,
  MapPin,
  LockKeyhole,
  Plus,
  Minus,
  Check,
  Target,
  Trophy,
  Megaphone,
  ChevronRight,
  ShieldCheck,
  Download,
  Share2,
} from "lucide-react";
import { useLanguage, action, ErrorMessage } from "./provider";
import { canPredict, ist, type Lang } from "@/lib/domain";
import { baseRules, type Key } from "@/lib/i18n";
import type { Row } from "@/lib/db";
export const localized = (row: Row, prefix: string, lang: Lang) =>
  row[prefix + "_" + lang] || row[prefix + "_en"];
export function PageTitle({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {kicker && <div className="eyebrow dark">{kicker}</div>}
        <h1>{title}</h1>
      </div>
      {children}
    </div>
  );
}
export function Empty() {
  const { t } = useLanguage();
  return (
    <div className="empty">
      <CalendarDays size={34} />
      <h3>{t("emptyFixtures")}</h3>
      <p>{t("emptyFixturesText")}</p>
    </div>
  );
}
export function Team({
  fixture,
  side,
  large = false,
}: {
  fixture: Row;
  side: "home" | "away";
  large?: boolean;
}) {
  const { lang } = useLanguage();
  const badge = fixture[side + "_badge"];
  return (
    <div className={"team " + (large ? "large" : "")}>
      <div className={"team-crest " + side + (badge ? " has-badge" : "")}>
        {badge ? (
          <img src={badge} alt="" />
        ) : (
          <>
            <span>★</span>
            <b>{fixture[side + "_short"]}</b>
            <i>⚽</i>
          </>
        )}
      </div>
      <strong>{localized(fixture, side, lang)}</strong>
    </div>
  );
}
function Countdown({ deadline }: { deadline: string }) {
  const { t } = useLanguage();
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    const tick = () =>
      setRemaining(Math.max(0, new Date(deadline).getTime() - Date.now()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [deadline]);
  if (remaining === null)
    return <span className="countdown">{t("closesIn")} —</span>;
  const seconds = Math.floor(remaining / 1000),
    hours = Math.floor(seconds / 3600);
  return (
    <span className="countdown">
      <Clock3 size={14} />
      {remaining === 0
        ? t("locked")
        : t("closesIn") +
          " " +
          [hours, Math.floor(seconds / 60) % 60, seconds % 60]
            .map((v) => String(v).padStart(2, "0"))
            .join(":")}
    </span>
  );
}
export function FixtureCard({
  f,
  featured = false,
}: {
  f: Row;
  featured?: boolean;
}) {
  const { t, lang } = useLanguage();
  const open = canPredict(f.status, f.kickoff);
  return (
    <article className={"fixture-card " + (featured ? "featured" : "")}>
      <div className="fixture-meta">
        <span>
          {localized(f, "round", lang)}
          {f.demo && <b className="sample">{t("sample")}</b>}
        </span>
        {open ? (
          <Countdown deadline={f.deadline} />
        ) : (
          <span className={"status " + f.status}>{t(f.status as Key)}</span>
        )}
      </div>
      <div className="versus">
        <Team fixture={f} side="home" large={featured} />
        <div className="match-center">
          {f.status === "finalized" ? (
            <strong>
              {f.result_home} <span>:</span> {f.result_away}
            </strong>
          ) : (
            <span className="vs">VS</span>
          )}
          <small>{ist(f.kickoff, lang)}</small>
        </div>
        <Team fixture={f} side="away" large={featured} />
      </div>
      <div className="fixture-info">
        <span>
          <MapPin size={14} />
          {localized(f, "venue", lang) || "—"}
        </span>
        <span>
          <LockKeyhole size={14} />
          {ist(f.deadline, lang)}
        </span>
      </div>
      {f.predicted_home !== null && (
        <div className="saved-strip">
          <Check size={14} />
          {t("yourPrediction")}{" "}
          <b>
            {f.predicted_home} – {f.predicted_away}
          </b>
          {f.points !== null && (
            <span className="points-pill">
              +{f.points} {t("points")}
            </span>
          )}
        </div>
      )}
      <Link
        href={"/match?id=" + f.id}
        className={
          "button " +
          (featured ? "primary" : "secondary") +
          (open ? " prediction-cta" : "")
        }
      >
        {t(
          open
            ? f.predicted_home !== null
              ? "updatePrediction"
              : "predict"
            : "viewDetails",
        )}
        <ArrowRight size={17} />
      </Link>
    </article>
  );
}
function Stats({ self }: { self: Row }) {
  const { t } = useLanguage();
  return (
    <div className="stats-grid">
      {(
        [
          ["rank", self?.rank ? "#" + self.rank : "—", Trophy],
          ["totalPoints", self?.points ?? 0, Target],
          ["exact", self?.exact ?? 0, ShieldCheck],
        ] as const
      ).map(([key, value, Icon]) => (
        <div className="stat-card" key={key}>
          <div className="stat-icon">
            <Icon size={20} />
          </div>
          <div>
            <span>{t(key)}</span>
            <strong>{value}</strong>
          </div>
        </div>
      ))}
    </div>
  );
}
export function Pagination({
  data,
  path,
  query,
}: {
  data: Row;
  path: string;
  query: Record<string, string>;
}) {
  const { t } = useLanguage();
  const href = (page: number) =>
    path +
    "?" +
    new URLSearchParams({ ...query, mine: "0", page: String(page) });
  return (
    <div className="pagination">
      {data.page > 1 && (
        <Link className="button secondary" href={href(data.page - 1)}>
          {t("previous")}
        </Link>
      )}
      <span>
        {t("page")} {data.page}
      </span>
      {data.hasNext && (
        <Link className="button secondary" href={href(data.page + 1)}>
          {t("next")}
        </Link>
      )}
    </div>
  );
}
function LeagueTable({
  rows,
  userId,
  compact = false,
}: {
  rows: Row[];
  userId: string;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div className={"table-wrap " + (compact ? "compact" : "")}>
      <table className="league-table">
        <thead>
          <tr>
            <th>#</th>
            <th>{t("member")}</th>
            {!compact && (
              <>
                <th>{t("exact")}</th>
                <th>{t("correct")}</th>
                <th>{t("firstGoalCorrect")}</th>
                <th>{t("participation")}</th>
              </>
            )}
            <th>{t("points")}</th>
          </tr>
        </thead>
        <tbody>
          {rows?.map((r, i) => (
            <tr
              key={r.member_id}
              className={r.member_id === userId ? "me" : ""}
              id={r.member_id === userId ? "my-rank" : undefined}
            >
              <td>
                <span className={"rank-badge rank-" + r.rank}>{r.rank}</span>
              </td>
              <td>
                <span className={"member-avatar color-" + (i % 4)}>
                  {r.display_name.slice(0, 1)}
                </span>
                <strong>{r.display_name}</strong>
              </td>
              {!compact && (
                <>
                  <td>{r.exact}</td>
                  <td>{r.correct}</td>
                  <td>{r.first_goal_correct}</td>
                  <td>{r.participation}</td>
                </>
              )}
              <td>
                <b>{r.points}</b>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows?.length && <p className="empty">{t("noRows")}</p>}
    </div>
  );
}
function ScoreControl({
  label,
  value,
  set,
  disabled,
}: {
  label: string;
  value: number;
  set: (n: number) => void;
  disabled: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div className="score-group">
      <label>
        {label}
        <div className="score-control">
          <button
            type="button"
            aria-label={t("minus") + " " + label}
            disabled={disabled || value <= 0}
            onClick={() => set(Math.max(0, value - 1))}
          >
            <Minus />
          </button>
          <input
            aria-label={label}
            type="number"
            inputMode="numeric"
            min="0"
            max="20"
            step="1"
            value={Number.isNaN(value) ? "" : value}
            onChange={(e) =>
              set(e.target.value === "" ? NaN : Number(e.target.value))
            }
            disabled={disabled}
            required
          />
          <button
            type="button"
            aria-label={t("plus") + " " + label}
            disabled={disabled || value >= 20}
            onClick={() => set(Math.min(20, value + 1))}
          >
            <Plus />
          </button>
        </div>
      </label>
    </div>
  );
}
function Prediction({ f, others }: { f: Row; others: Row[] }) {
  const { t, lang } = useLanguage(),
    router = useRouter();
  const [home, setHome] = useState(f.predicted_home ?? 0),
    [away, setAway] = useState(f.predicted_away ?? 0),
    [winner, setWinner] = useState(f.predicted_winner ?? ""),
    [firstGoal, setFirstGoal] = useState(f.predicted_first_goal ?? ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [open, setOpen] = useState(false);
  useEffect(() => {
    const tick = () => setOpen(canPredict(f.status, f.kickoff));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [f]);
  useEffect(() => {
    if (home === 0 && away === 0) setFirstGoal("nobody");
    else if (firstGoal === "nobody") setFirstGoal("");
  }, [home, away, firstGoal]);
  return (
    <>
      <PageTitle
        title={t("yourPrediction")}
        kicker={localized(f, "round", lang)}
      />
      <div className="prediction-layout">
        <section className="panel prediction-panel">
          <div className="fixture-meta">
            <span className={"status " + f.status}>{t(f.status as Key)}</span>
            <Countdown deadline={f.deadline} />
          </div>
          <div className="versus">
            <Team fixture={f} side="home" large />
            <span className="vs">VS</span>
            <Team fixture={f} side="away" large />
          </div>
          <div className="match-facts">
            <span>
              <CalendarDays size={16} />
              {ist(f.kickoff, lang)}
            </span>
            <span>
              <MapPin size={16} />
              {localized(f, "venue", lang) || "—"}
            </span>
          </div>
          {f.knockout && <p className="message info">{t("knockout")}</p>}
          {localized(f, "schedule_note", lang) && (
            <p className="message info">
              {localized(f, "schedule_note", lang)}
            </p>
          )}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                const r = await action("prediction", {
                  fixture_id: f.id,
                  home_goals: home,
                  away_goals: away,
                  predicted_winner: winner,
                  first_goal: firstGoal,
                });
                setSuccess(ist(r.result.updated_at, lang));
                router.refresh();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <fieldset className="prediction-question" disabled={!open || busy}>
              <legend>1. {t("winnerQuestion")}</legend>
              <div className="choice-grid three">
                <label><input type="radio" name="winner" value="home" checked={winner === "home"} onChange={(e) => setWinner(e.target.value)} required />{localized(f, "home", lang)}</label>
                <label><input type="radio" name="winner" value="draw" checked={winner === "draw"} onChange={(e) => setWinner(e.target.value)} required />{t("draw")}</label>
                <label><input type="radio" name="winner" value="away" checked={winner === "away"} onChange={(e) => setWinner(e.target.value)} required />{localized(f, "away", lang)}</label>
              </div>
            </fieldset>
            <fieldset className="prediction-question" disabled={!open || busy}>
              <legend>2. {t("scoreQuestion")}</legend>
            <div className="score-row">
              <ScoreControl
                label={t("homeGoals") + " · " + localized(f, "home", lang)}
                value={home}
                set={setHome}
                disabled={!open || busy}
              />
              <span>:</span>
              <ScoreControl
                label={t("awayGoals") + " · " + localized(f, "away", lang)}
                value={away}
                set={setAway}
                disabled={!open || busy}
              />
            </div>
            </fieldset>
            <fieldset className="prediction-question" disabled={!open || busy}>
              <legend>3. {t("firstGoalQuestion")}</legend>
              <div className="choice-grid three">
                <label><input type="radio" name="first_goal" value="home" checked={firstGoal === "home"} onChange={(e) => setFirstGoal(e.target.value)} disabled={home === 0 && away === 0} required />{localized(f, "home", lang)}</label>
                <label><input type="radio" name="first_goal" value="away" checked={firstGoal === "away"} onChange={(e) => setFirstGoal(e.target.value)} disabled={home === 0 && away === 0} required />{localized(f, "away", lang)}</label>
                <label><input type="radio" name="first_goal" value="nobody" checked={firstGoal === "nobody"} onChange={(e) => setFirstGoal(e.target.value)} disabled={home !== 0 || away !== 0} required />{t("nobody")}</label>
              </div>
            </fieldset>
            <p className="message info">{t("onePointEach")}</p>
            <ErrorMessage message={error} />
            {success && (
              <p className="message success" role="status">
                <Check size={17} />
                {t("savedPrediction")} · {success}
              </p>
            )}
            <button
              className="button primary full"
              disabled={
                !open ||
                busy ||
                !Number.isInteger(home) ||
                !Number.isInteger(away) ||
                !winner ||
                !firstGoal
              }
            >
              <LockKeyhole size={18} />
              {busy
                ? t("saving")
                : t(
                    f.predicted_home !== null
                      ? "updatePrediction"
                      : "savePrediction",
                  )}
            </button>
          </form>
          <p className="fine center">
            {open
              ? t("privateNotice")
              : t(
                  f.status === "postponed"
                    ? "postponedText"
                    : f.status === "cancelled"
                      ? "cancelledText"
                      : "lockedText",
                )}
          </p>
        </section>
        <aside className="stack">
          <section className="panel">
            <h3>{t("deadline")}</h3>
            <p>{ist(f.deadline, lang)}</p>
            <p className="fine">{t("countdownNote")}</p>
            <hr />
            <h3>{t("yourPrediction")}</h3>
            <div className="saved-score">
              {f.predicted_home === null
                ? "—"
                : `${f.predicted_home} – ${f.predicted_away}`}
            </div>
            {f.predicted_home !== null && (
              <dl className="prediction-summary">
                <div><dt>{t("winnerQuestion")}</dt><dd>{f.predicted_winner === "home" ? localized(f, "home", lang) : f.predicted_winner === "away" ? localized(f, "away", lang) : t("draw")}</dd></div>
                <div><dt>{t("firstGoalQuestion")}</dt><dd>{f.predicted_first_goal === "home" ? localized(f, "home", lang) : f.predicted_first_goal === "away" ? localized(f, "away", lang) : f.predicted_first_goal === "nobody" ? t("nobody") : "—"}</dd></div>
              </dl>
            )}
            <p className="fine">
              {f.saved_at
                ? t("savedAt") + " " + ist(f.saved_at, lang)
                : t("noPredictionYet")}
            </p>
            {f.status === "finalized" && (
              <>
                <hr />
                <h3>
                  {t("actual")}: {f.result_home} – {f.result_away}
                </h3>
                <p>
                  <b>
                    +{f.points} {t("points")}
                  </b>{" "}
                  ·{" "}
                  {f.predicted_home === null ? t("notPredicted") : f.points ? `${f.points}/3` : t("noPoints")}
                </p>
              </>
            )}
          </section>
          <section className="points-note">
            <Target />
            <h3>{t("scoring")}</h3>
            <p>{t("scoringText")}</p>
            <Link href="/rules">
              {t("rules")}
              <ArrowUpRight size={16} />
            </Link>
          </section>
          {others?.length > 0 && (
            <section className="panel">
              <h3>{t("publicPredictions")}</h3>
              <div className="prediction-chips">
                {others.map((o, i) => (
                  <span key={i}>
                    {o.home_goals} – {o.away_goals}
                  </span>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
function Profile({ data, demo }: { data: Row; demo: boolean }) {
  const { t, lang, setLang } = useLanguage(),
    router = useRouter();
  const canvas = useRef<HTMLCanvasElement>(null),
    [cardReady, setCardReady] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    setCardReady(false);
    (async () => {
      await document.fonts.ready;
      await document.fonts.load('600 32px "Noto Sans Malayalam"');
      await document.fonts.load('700 32px "DM Sans"');
      const logo = new Image();
      logo.src = "/sbk-logo.png";
      await logo.decode();
      if (cancelled || !canvas.current) return;
      const c = canvas.current,
        ctx = c.getContext("2d")!;
      c.width = 1080;
      c.height = 1350;
      const gradient = ctx.createLinearGradient(0, 0, 1080, 1350);
      gradient.addColorStop(0, "#0a1745");
      gradient.addColorStop(0.65, "#173ab5");
      gradient.addColorStop(1, "#071432");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1080, 1350);
      ctx.strokeStyle = "#ffffff12";
      for (let x = -500; x < 1700; x += 90) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 700, 1350);
        ctx.stroke();
      }
      ctx.strokeStyle = "#ffffff20";
      ctx.lineWidth = 3;
      ctx.strokeRect(55, 55, 970, 1240);
      ctx.drawImage(logo, 410, 100, 260, 260);
      ctx.textAlign = "center";
      const font = lang === "ml" ? '"Noto Sans Malayalam"' : '"DM Sans"';
      const write = (
        str: string,
        y: number,
        size: number,
        color = "#ffffff",
      ) => {
        ctx.fillStyle = color;
        ctx.font = `600 ${size}px ${font}`;
        ctx.fillText(str, 540, y, 940);
      };
      write(t("community"), 410, 27, "#d7dfff");
      write("SBK SLK", 495, 76, "#ffda35");
      write(lang === "ml" ? "പ്രവചന മത്സരം" : "PREDICTION CONTEST", 555, 40);
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.roundRect(85, 625, 910, 420, 30);
      ctx.fill();
      let size = 52;
      ctx.font = `600 ${size}px ${font}`;
      while (
        ctx.measureText(data.profile.display_name).width > 810 &&
        size > 24
      ) {
        size -= 2;
        ctx.font = `600 ${size}px ${font}`;
      }
      write(data.profile.display_name, 720, size, "#101e48");
      ctx.strokeStyle = "#dce2ef";
      ctx.beginPath();
      ctx.moveTo(150, 770);
      ctx.lineTo(930, 770);
      ctx.stroke();
      const columns = [
        [t("rank"), "#" + (data.self?.rank ?? "—")],
        [t("points"), String(data.self?.points ?? 0)],
        [t("exact"), String(data.self?.exact ?? 0)],
      ];
      columns.forEach(([label, value], i) => {
        ctx.fillStyle = "#65718c";
        ctx.font = `600 24px ${font}`;
        ctx.fillText(label, 260 + i * 280, 835, 250);
        ctx.fillStyle = "#102258";
        ctx.font = '700 88px "DM Sans"';
        ctx.fillText(value, 260 + i * 280, 945, 250);
      });
      write(t("generated"), 1110, 24, "#d7dfff");
      write(ist(data.now, lang), 1155, 25);
      if (demo) write(t("sample"), 1205, 24, "#ffda35");
      write(t("tagline"), 1260, 24, "#ffda35");
      setCardReady(true);
    })().catch(() => {
      if (!cancelled) setError("networkError");
    });
    return () => {
      cancelled = true;
    };
  }, [data, lang, t, demo]);
  async function download(share = false) {
    setError("");
    setMessage("");
    try {
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.current?.toBlob(
          (v) => (v ? resolve(v) : reject(new Error())),
          "image/png",
        ),
      );
      const file = new File([blob], "SBK-rank.png", { type: "image/png" });
      if (share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: t("title") });
        } catch (e) {
          if ((e as Error).name === "AbortError") {
            setMessage("shareCancelled");
            return;
          }
          throw e;
        }
        return;
      }
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = "SBK-rank.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      if (share) setMessage("downloadFallback");
    } catch {
      setError("networkError");
    }
  }
  return (
    <>
      <PageTitle title={t("profile")} kicker={t("community")} />
      <Stats self={data.self} />
      <div className="profile-grid">
        <section className="panel">
          <div className="profile-heading">
            <span className="avatar big">
              {data.profile.display_name.slice(0, 1)}
            </span>
            <div>
              <h2>{data.profile.display_name}</h2>
              <span className="status approved">{t("approved")}</span>
            </div>
          </div>
          <h3>{t("editProfile")}</h3>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const form = new FormData(e.currentTarget);
              try {
                const value = form.get("language") as Lang;
                await action("profile", {
                  display_name: form.get("display_name"),
                  language: value,
                });
                setLang(value);
                setMessage("profileSaved");
                router.refresh();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              {t("display_name")}
              <input
                name="display_name"
                defaultValue={data.profile.display_name}
                required
                minLength={2}
                maxLength={50}
              />
            </label>
            <label>
              {t("language")}
              <select name="language" defaultValue={lang}>
                <option value="en">English</option>
                <option value="ml">മലയാളം</option>
              </select>
            </label>
            <button className="button secondary" disabled={busy}>
              {busy ? t("saving") : t("save")}
            </button>
          </form>
          <dl className="profile-stats">
            <div>
              <dt>{t("predictions")}</dt>
              <dd>{data.predictionCount}</dd>
            </div>
            <div>
              <dt>{t("correct")}</dt>
              <dd>{data.self?.correct ?? 0}</dd>
            </div>
            <div>
              <dt>{t("participation")}</dt>
              <dd>{data.self?.participation ?? 0}</dd>
            </div>
          </dl>
          <Link className="text-link" href="/predictions">
            {t("predictions")} <ArrowRight size={16} />
          </Link>
          <hr />
          <div className="profile-links">
            <Link className="text-link" href="/rules">
              {t("rules")}
            </Link>
            {data.profile.role === "admin" && (
              <Link className="text-link" href="/admin">
                {t("admin")}
              </Link>
            )}
          </div>
          <button
            className="text-button"
            onClick={async () => {
              await action("logout");
              location.href = "/";
            }}
          >
            {t("logout")}
          </button>
        </section>
        <section className="rank-card-panel">
          <h2>{t("shareTitle")}</h2>
          <p>{t("shareText")}</p>
          <canvas
            ref={canvas}
            className="rank-canvas"
            aria-label={t("rankCard")}
            role="img"
          />
          <div className="button-row">
            <button
              className="button primary"
              disabled={!cardReady}
              onClick={() => download(true)}
            >
              <Share2 size={18} />
              {t("share")}
            </button>
            <button
              className="button secondary"
              disabled={!cardReady}
              onClick={() => download()}
            >
              <Download size={18} />
              {t("download")}
            </button>
          </div>
        </section>
      </div>
      <ErrorMessage message={error} />
      {message && (
        <p role="status" className="message success">
          {t(message as Key)}
        </p>
      )}
    </>
  );
}
export function Dashboard({
  section,
  data,
  query,
  demo,
}: {
  section: string;
  data: Row;
  query: Record<string, string>;
  demo: boolean;
}) {
  const { t, lang } = useLanguage();
  const router = useRouter();
  if (section === "match")
    return (
      <Prediction key={data.fixture.id} f={data.fixture} others={data.others} />
    );
  if (section === "profile") return <Profile data={data} demo={demo} />;
  if (section === "rules")
    return (
      <>
        <PageTitle title={t("rules")} kicker={t("community")} />
        <section className="rules-layout">
          <div className="panel prose">
            <h2>{t("ruleBase")}</h2>
            <p className="fine">
              {t("rulesUpdated")}:{" "}
              {ist(data.rules?.created_at ?? "2026-09-25T00:00:00Z", lang)}
            </p>
            {baseRules[lang].split("\n\n").map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {data.rules && (
              <>
                <hr />
                <h3>{t("announcements")}</h3>
                {localized(data.rules, "body", lang)
                  .split("\n")
                  .map((p: string, i: number) => (
                    <p key={i}>{p}</p>
                  ))}
              </>
            )}
          </div>
          <aside className="points-note">
            <Target />
            <h2>5 / 3 / 0</h2>
            <p>{t("scoringText")}</p>
            <hr />
            <h3>{t("contact")}</h3>
            <p>{data.rules?.contact || t("contactEmpty")}</p>
            <p>{t("freeNote")}</p>
          </aside>
        </section>
      </>
    );
  if (section === "leaderboard")
    return (
      <>
        <PageTitle title={t("leaderboard")} kicker={t("community")}>
          <Link
            className="button secondary"
            href={
              "/leaderboard?" + new URLSearchParams({ ...query, mine: "1" })
            }
          >
            {t("jump")}
            <ArrowRight size={16} />
          </Link>
        </PageTitle>
        <div className="leader-hero">
          <Trophy size={40} />
          <div>
            <h2>{t("tagline")}</h2>
            <p>{t("tieNote")}</p>
          </div>
          <div className="leader-self">
            <small>{t("rank")}</small>
            <strong>#{data.self?.rank ?? "—"}</strong>
          </div>
        </div>
        <div className="toolbar">
          <select
            aria-label={t("round")}
            value={query.round ?? ""}
            onChange={(e) =>
              router.push("/leaderboard?round=" + e.target.value)
            }
          >
            <option value="">{t("overall")}</option>
            {data.rounds.map((r: Row) => (
              <option value={r.id} key={r.id}>
                {localized(r, "name", lang)}
              </option>
            ))}
          </select>
          <small>
            {t("standingsUpdated")}: {ist(data.now, lang)}
          </small>
        </div>
        <section className="panel table-panel">
          <LeagueTable rows={data.leaders} userId={data.profile.id} />
        </section>
        <Pagination data={data} path="/leaderboard" query={query} />
      </>
    );
  if (section === "matches" || section === "predictions") {
    const filters =
      section === "matches"
        ? ["upcoming", "locked", "completed", "postponed", "cancelled"]
        : ["all", "upcoming", "awaiting", "scored", "postponed", "cancelled"];
    const current = query.filter ?? filters[0];
    return (
      <>
        <PageTitle title={t(section)} kicker={t("community")} />
        <div className="toolbar wrap">
          <div className="filter-tabs">
            {filters.map((filter) => (
              <Link
                key={filter}
                href={`/${section}?filter=${filter}`}
                className={current === filter ? "active" : ""}
              >
                {t(filter as Key)}
              </Link>
            ))}
          </div>
          <form className="search" action={"/" + section}>
            <input type="hidden" name="filter" value={current} />
            <input
              aria-label={t("search")}
              placeholder={t("search")}
              name="q"
              defaultValue={query.q}
            />
            <button aria-label={t("search")}>
              <ArrowRight size={18} />
            </button>
          </form>
        </div>
        {!data.fixtures.length ? (
          <Empty />
        ) : section === "matches" ? (
          <div className="fixture-grid">
            {data.fixtures.map((f: Row) => (
              <FixtureCard key={f.id} f={f} />
            ))}
          </div>
        ) : (
          <div className="predictions-list">
            {data.fixtures.map((f: Row) => (
              <Link
                href={"/match?id=" + f.id}
                className="prediction-item"
                key={f.id}
              >
                <div>
                  <span className="fine">
                    {localized(f, "round", lang)} · {ist(f.kickoff, lang)}
                  </span>
                  <h3>
                    {localized(f, "home", lang)} <span>–</span>{" "}
                    {localized(f, "away", lang)}
                  </h3>
                  <small>
                    {f.saved_at
                      ? t("savedAt") + " " + ist(f.saved_at, lang)
                      : t("notPredicted")}
                  </small>
                </div>
                <div className="prediction-item-score">
                  <small>{t("yourPrediction")}</small>
                  <strong>
                    {f.predicted_home === null
                      ? "—"
                      : `${f.predicted_home} – ${f.predicted_away}`}
                  </strong>
                </div>
                <div>
                  <span className="status">
                    {f.status === "finalized"
                      ? f.result_home + " – " + f.result_away
                      : t(f.status as Key)}
                  </span>
                  <p>
                    {f.status === "cancelled"
                      ? t("noPoints")
                      : f.points === null
                        ? t("awaiting")
                        : f.predicted_home === null
                          ? t("notPredicted")
                          : f.points
                            ? `${f.points}/3 ${t("points")}`
                            : t("noPoints")
                    }
                  </p>
                </div>
                {f.points !== null && (
                  <b className="points-pill">+{f.points}</b>
                )}
                <ChevronRight size={18} />
              </Link>
            ))}
          </div>
        )}
        <Pagination data={data} path={"/" + section} query={query} />
      </>
    );
  }
  const next = data.fixtures?.[0];
  return (
    <>
      <PageTitle
        title={
          t("hello") + ", " + data.profile.display_name.split(" ")[0] + "."
        }
        kicker={t("matchday")}
      >
        <span className="today">
          <CalendarDays size={16} />
          {ist(data.now, lang)}
        </span>
      </PageTitle>
      <div className="home-grid">
        <div className="home-main">
          <section className="home-hero">
            <div className="hero-copy">
              <div className="eyebrow">{t("community")}</div>
              <h2>
                {lang === "en" ? (
                  <>
                    THE GAME IS ON.
                    <br />
                    <em>WHAT’S YOUR CALL?</em>
                  </>
                ) : (
                  <>
                    കളി തുടങ്ങട്ടെ.
                    <br />
                    <em>നിങ്ങളുടെ പ്രവചനം?</em>
                  </>
                )}
              </h2>
              <p>{t("tagline")}</p>
              <span className="hero-pill">
                <ShieldCheck size={14} />
                {t("free")}
              </span>
            </div>
            <div className="hero-art">
              <div className="pitch-circle" />
              <img src="/sbk-logo.png" alt="SBK" />
              <span className="hero-star star-one">✦</span>
              <span className="hero-star star-two">✦</span>
            </div>
          </section>
          <Stats self={data.self} />
          <div className="section-heading">
            <h2>{t("nextMatch")}</h2>
            <Link href="/matches">
              {t("allMatches")}
              <ArrowUpRight size={16} />
            </Link>
          </div>
          {next ? <FixtureCard f={next} featured /> : <Empty />}
        </div>
        <aside className="home-aside">
          <section className="panel table-panel">
            <div className="section-heading">
              <h3>
                <Trophy size={19} />
                {t("leaderboard")}
              </h3>
              <Link href="/leaderboard" aria-label={t("leaderboard")}>
                <ArrowUpRight size={18} />
              </Link>
            </div>
            <LeagueTable rows={data.leaders} userId={data.profile.id} compact />
            <Link className="table-footer" href="/leaderboard?mine=1">
              {t("jump")}
              <ArrowRight size={16} />
            </Link>
          </section>
          <section className="panel announcement-panel">
            <div className="section-heading">
              <h3>
                <Megaphone size={19} />
                {t("announcements")}
              </h3>
            </div>
            {data.announcements?.length ? (
              data.announcements.map((a: Row) => (
                <article key={a.id}>
                  <span className="fine">{ist(a.updated_at, lang)}</span>
                  <h4>{localized(a, "title", lang)}</h4>
                  <p>{localized(a, "body", lang)}</p>
                </article>
              ))
            ) : (
              <p>{t("noAnnouncements")}</p>
            )}
          </section>
          <section className="points-note">
            <span className="eyebrow dark">{t("readRules")}</span>
            <div className="points-trio">
              <span>
                <b>1</b>
                {t("exactScore")}
              </span>
              <span>
                <b>1</b>
                {t("correctOutcome")}
              </span>
              <span>
                <b>1</b>
                {t("firstGoalQuestion")}
              </span>
            </div>
            <Link href="/rules">
              {t("rules")}
              <ArrowUpRight size={16} />
            </Link>
          </section>
        </aside>
      </div>
      {data.fixtures?.length > 1 && (
        <>
          <div className="section-heading lower">
            <h2>{t("nextFixtures")}</h2>
          </div>
          <div className="fixture-grid">
            {data.fixtures.slice(1).map((f: Row) => (
              <FixtureCard f={f} key={f.id} />
            ))}
          </div>
        </>
      )}
      <div className="section-heading lower">
        <h2>{t("latestResult")}</h2>
      </div>
      {data.latest ? (
        <FixtureCard f={data.latest} />
      ) : (
        <div className="result-empty">
          <Clock3 size={18} />
          {t("noResult")}
        </div>
      )}
    </>
  );
}
