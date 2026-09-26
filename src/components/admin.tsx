"use client";
import { Fragment, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Download,
  ShieldCheck,
  Users,
  CalendarDays,
  Clock3,
  X,
  Check,
  AlertTriangle,
  UserPlus,
  Copy,
  KeyRound,
  Pencil,
  Trash2,
  Eye,
} from "lucide-react";
import { useLanguage, action, ErrorMessage } from "./provider";
import { PageTitle, Pagination, localized } from "./dashboard";
import { ist } from "@/lib/domain";
import { useDialog } from "./use-dialog";
import type { Key } from "@/lib/i18n";
import type { Row } from "@/lib/db";
import { countryCodes, splitPhone } from "@/lib/countries";
import { PasswordInput } from "./password-input";
import { MemberPredictions } from "./member-predictions";
type Field = {
  name: string;
  label?: Key;
  type?:
    "text" | "number" | "datetime-local" | "checkbox" | "textarea" | "select";
  required?: boolean;
  options?: { value: string; label: string }[];
};
const localTime = (s: string) =>
  s
    ? new Date(new Date(s).getTime() + 330 * 60000).toISOString().slice(0, 16)
    : "";
const field = (
  name: string,
  type: Field["type"] = "text",
  required = true,
  label?: Key,
): Field => ({ name, type, required, label });
function Editor({
  kind,
  record,
  fields,
  title,
  onClose,
  help,
}: {
  kind: string;
  record: Row;
  fields: Field[];
  title: string;
  onClose: () => void;
  help?: string;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState<Row | null>(null);
  useDialog(true, () => {
    if (!busy) onClose();
  });
  return (
    <div className="modal-backdrop">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal"
      >
        <div className="section-heading">
          <h2>{title}</h2>
          <button
            autoFocus
            className="icon-button"
            aria-label={t("close")}
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        {help && <p className="fine">{help}</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            const value: Row = {};
            if (record.id) value.id = record.id;
            for (const f of fields) {
              const raw = form.get(f.name);
              value[f.name] =
                f.type === "checkbox"
                  ? raw === "on"
                  : f.type === "number"
                    ? Number(raw)
                    : f.type === "datetime-local"
                      ? raw
                        ? new Date(raw + ":00+05:30").toISOString()
                        : null
                      : raw;
            }
            setConfirm(value);
          }}
        >
          <div className="form-grid">
            {fields.map((f) => (
              <label
                key={f.name}
                className={
                  f.type === "textarea"
                    ? "span-two"
                    : f.type === "checkbox"
                      ? "checkbox-label"
                      : ""
                }
              >
                {f.type === "checkbox" ? (
                  <>
                    <input
                      aria-label={t((f.label ?? f.name) as Key)}
                      name={f.name}
                      type="checkbox"
                      defaultChecked={record[f.name] ?? true}
                    />
                    {t((f.label ?? f.name) as Key)}
                  </>
                ) : (
                  <>
                    {t((f.label ?? f.name) as Key)}
                    {f.type === "select" ? (
                      <select
                        aria-label={t((f.label ?? f.name) as Key)}
                        name={f.name}
                        defaultValue={record[f.name] ?? ""}
                        required={f.required}
                      >
                        <option value="">—</option>
                        {f.options?.map((o) => (
                          <option value={o.value} key={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : f.type === "textarea" ? (
                      <textarea
                        aria-label={t((f.label ?? f.name) as Key)}
                        name={f.name}
                        required={f.required}
                        defaultValue={record[f.name] ?? ""}
                        rows={5}
                        maxLength={10000}
                      />
                    ) : (
                      <input
                        aria-label={t((f.label ?? f.name) as Key)}
                        name={f.name}
                        type={f.type ?? "text"}
                        required={f.required}
                        defaultValue={
                          f.type === "datetime-local"
                            ? localTime(record[f.name])
                            : (record[f.name] ?? "")
                        }
                        maxLength={f.name === "short_name" ? 8 : 500}
                        min={f.type === "number" ? 0 : undefined}
                      />
                    )}
                  </>
                )}
              </label>
            ))}
          </div>
          <ErrorMessage message={error} />
          {confirm ? (
            <div className="confirm-box" role="alert">
              <h3>{t("confirmTitle")}</h3>
              <p>{t("confirmText")}</p>
              <dl>
                {fields
                  .filter((f) => f.type !== "textarea")
                  .map((f) => (
                    <div key={f.name}>
                      <dt>{t((f.label ?? f.name) as Key)}</dt>
                      <dd>
                        {f.type === "select"
                          ? f.options?.find((o) => o.value === confirm[f.name])
                              ?.label
                          : f.type === "checkbox"
                            ? confirm[f.name]
                              ? "✓"
                              : "—"
                            : String(confirm[f.name] ?? "—")}
                      </dd>
                    </div>
                  ))}
              </dl>
              <div className="button-row">
                <button
                  type="button"
                  className="button primary"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      await action(kind, confirm);
                      router.refresh();
                      onClose();
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy ? t("saving") : t("confirm")}
                </button>
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={() => setConfirm(null)}
                >
                  {t("edit")}
                </button>
              </div>
            </div>
          ) : (
            <button className="button primary">{t("save")}</button>
          )}
        </form>
      </section>
    </div>
  );
}
function Audit({ rows }: { rows: Row[] }) {
  const { t, lang } = useLanguage();
  return (
    <div className="audit-list">
      {rows?.length ? (
        rows.map((a) => (
          <details key={a.id}>
            <summary>
              <span className="audit-dot" />
              <div>
                <strong>{a.actor_name ?? "—"}</strong>
                <p>
                  {a.target} · {a.action}
                </p>
              </div>
              <time>{ist(a.created_at, lang)}</time>
            </summary>
            <div className="audit-values">
              <div>
                <h4>{t("before")}</h4>
                <pre>{JSON.stringify(a.before_value, null, 2)}</pre>
              </div>
              <div>
                <h4>{t("after")}</h4>
                <pre>{JSON.stringify(a.after_value, null, 2)}</pre>
              </div>
            </div>
          </details>
        ))
      ) : (
        <p className="empty">{t("noRows")}</p>
      )}
    </div>
  );
}
function Results({ data }: { data: Row }) {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const [selected, setSelected] = useState(""),
    [home, setHome] = useState(0),
    [away, setAway] = useState(0),
    [winner, setWinner] = useState(""),
    [firstGoal, setFirstGoal] = useState(""),
    [reason, setReason] = useState(""),
    [preview, setPreview] = useState<Row[] | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false);
  const fixture = data.fixtures.find((f: Row) => f.id === selected);
  return (
    <section className="panel">
      <h2>{t("results")}</h2>
      <p>{t("resultHelp")}</p>
      <p className="message info">{t("knockout")}</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          setDone(false);
          try {
            const result = await action("preview", {
              fixture_id: selected,
              expected_updated_at: fixture?.result_at ?? null,
              home_goals: home,
              away_goals: away,
              winner,
              first_goal: firstGoal,
              reason,
            });
            setPreview(result.rows);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          {t("selectFixture")}
          <select
            required
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setPreview(null);
              setDone(false);
              const f = data.fixtures.find((f: Row) => f.id === e.target.value);
              setHome(f?.result_home ?? 0);
              setAway(f?.result_away ?? 0);
              setWinner(f?.result_winner ?? "");
              setFirstGoal(f?.result_first_goal ?? "");
              setReason("");
            }}
          >
            <option value="">—</option>
            {data.fixtures.map((f: Row) => (
              <option value={f.id} key={f.id}>
                {localized(f, "home", lang)} – {localized(f, "away", lang)} ·{" "}
                {t(f.status as Key)} · {ist(f.kickoff, lang)}
              </option>
            ))}
          </select>
        </label>
        {fixture && (
          <>
            <div className="form-grid">
              <label>
                {t("winnerQuestion")}
                <select required value={winner} onChange={(e) => { setWinner(e.target.value); setPreview(null); }}>
                  <option value="">—</option>
                  <option value="home">{localized(fixture, "home", lang)}</option>
                  <option value="draw">{t("draw")}</option>
                  <option value="away">{localized(fixture, "away", lang)}</option>
                </select>
              </label>
              <label>
                {t("firstGoalQuestion")}
                <select required value={firstGoal} onChange={(e) => { setFirstGoal(e.target.value); setPreview(null); }}>
                  <option value="">—</option>
                  <option value="home">{localized(fixture, "home", lang)}</option>
                  <option value="away">{localized(fixture, "away", lang)}</option>
                  <option value="nobody">{t("nobody")}</option>
                </select>
              </label>
              <label>
                {t("homeGoals")} · {localized(fixture, "home", lang)}
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="1"
                  required
                  value={home}
                  onChange={(e) => {
                    setHome(Number(e.target.value));
                    setPreview(null);
                  }}
                />
              </label>
              <label>
                {t("awayGoals")} · {localized(fixture, "away", lang)}
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="1"
                  required
                  value={away}
                  onChange={(e) => {
                    setAway(Number(e.target.value));
                    setPreview(null);
                  }}
                />
              </label>
            </div>
            <label>
              {t("resultReason")}
              <textarea
                value={reason}
                required={fixture.status === "finalized"}
                minLength={fixture.status === "finalized" ? 5 : undefined}
                onChange={(e) => {
                  setReason(e.target.value);
                  setPreview(null);
                }}
                maxLength={1000}
              />
            </label>
            <button className="button secondary" disabled={busy}>
              {t("preview")}
            </button>
          </>
        )}
      </form>
      <ErrorMessage message={error} />
      {done && (
        <p className="message success" role="status">
          {t("saved")}
        </p>
      )}
      {preview && (
        <div className="confirm-box">
          <h3>
            {t("confirmTitle")}: {home} – {away}
          </h3>
          <p>
            <b>{t("winnerQuestion")}</b>: {winner === "home" ? localized(fixture, "home", lang) : winner === "away" ? localized(fixture, "away", lang) : t("draw")} ·{" "}
            <b>{t("firstGoalQuestion")}</b>: {firstGoal === "home" ? localized(fixture, "home", lang) : firstGoal === "away" ? localized(fixture, "away", lang) : t("nobody")}
          </p>
          <p>{t("resultHelp")}</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("member")}</th>
                  <th>{t("before")}</th>
                  <th>{t("after")}</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((p) => (
                  <tr key={p.member_id}>
                    <td>{p.display_name}</td>
                    <td>{p.before}</td>
                    <td>{p.after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.length === 0 && <p>{t("noRows")}</p>}
          <button
            className="button primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await action("results", {
                  fixture_id: selected,
                  expected_updated_at: fixture?.result_at ?? null,
                  home_goals: home,
                  away_goals: away,
                  winner,
                  first_goal: firstGoal,
                  reason,
                });
                setPreview(null);
                setDone(true);
                router.refresh();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy
              ? t("saving")
              : t(
                  fixture.status === "finalized" ? "correctResult" : "finalize",
                )}
          </button>
        </div>
      )}
    </section>
  );
}
function PredictionImport({ data }: { data: Row }) {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const [home, setHome] = useState(0), [away, setAway] = useState(0),
    [fixtureId, setFixtureId] = useState(""),
    [busy, setBusy] = useState(false), [error, setError] = useState(""), [done, setDone] = useState(false);
  const fixture = data.fixtures.find((f: Row) => f.id === fixtureId);
  return (
    <section className="panel">
      <h2>{t("importPrediction")}</h2>
      <p>{t("importPredictionHelp")}</p>
      <form onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setError(""); setDone(false);
        const form = new FormData(e.currentTarget);
        try {
          await action("adminPrediction", {
            member_id: form.get("member_id"), fixture_id: form.get("fixture_id"),
            home_goals: home, away_goals: away,
            predicted_winner: form.get("predicted_winner"), first_goal: form.get("first_goal"),
          });
          setDone(true); router.refresh();
        } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
      }}>
        <div className="form-grid">
          <label>{t("member")}<select name="member_id" required><option value="">—</option>{data.members.map((m: Row) => <option value={m.id} key={m.id}>{m.display_name} · {m.email}</option>)}</select></label>
          <label>{t("selectFixture")}<select name="fixture_id" required value={fixtureId} onChange={(e)=>setFixtureId(e.target.value)}><option value="">—</option>{data.fixtures.map((f: Row) => <option value={f.id} key={f.id}>{localized(f,"home",lang)} – {localized(f,"away",lang)} · {ist(f.kickoff,lang)}</option>)}</select></label>
          <label>{t("winnerQuestion")}<select name="predicted_winner" required disabled={!fixture}><option value="">—</option><option value="home">{fixture ? localized(fixture,"home",lang) : t("homeWin")}</option><option value="draw">{t("draw")}</option><option value="away">{fixture ? localized(fixture,"away",lang) : t("awayWin")}</option></select></label>
          <label>{t("firstGoalQuestion")}<select name="first_goal" required disabled={!fixture}><option value="">—</option><option value="home">{fixture ? localized(fixture,"home",lang) : t("homeWin")}</option><option value="away">{fixture ? localized(fixture,"away",lang) : t("awayWin")}</option><option value="nobody">{t("nobody")}</option></select></label>
          <label>{t("homeGoals")}<input type="number" min="0" max="20" value={home} onChange={(e)=>setHome(Number(e.target.value))} required /></label>
          <label>{t("awayGoals")}<input type="number" min="0" max="20" value={away} onChange={(e)=>setAway(Number(e.target.value))} required /></label>
        </div>
        <ErrorMessage message={error} />
        {done && <p className="message success" role="status">{t("predictionImported")}</p>}
        <button className="button primary" disabled={busy}>{busy ? t("saving") : t("savePrediction")}</button>
      </form>
    </section>
  );
}
export function Admin({
  data,
  query,
}: {
  data: Row;
  query: Record<string, string>;
}) {
  const { t, lang } = useLanguage(),
    router = useRouter(),
    tab = query.tab ?? "overview";
  const [editor, setEditor] = useState<{
      kind: string;
      record: Row;
      fields: Field[];
      title: string;
      help?: string;
    } | null>(null),
    [review, setReview] = useState<Row | null>(null),
    [newMember, setNewMember] = useState(false),
    [editMember, setEditMember] = useState<Row | null>(null),
    [deleteMember, setDeleteMember] = useState<Row | null>(null),
    [credentials, setCredentials] = useState<Row | null>(null),
    [newAccountType, setNewAccountType] = useState<"phone" | "email">("phone"),
    [promote, setPromote] = useState<Row | null>(null),
    [copied, setCopied] = useState(false),
    [selected, setSelected] = useState<string[]>([]),
    [predictionMember, setPredictionMember] = useState<string | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useDialog(Boolean(review || newMember || editMember || deleteMember || promote), () => {
    if (!busy) {
      setReview(null);
      setNewMember(false);
      setEditMember(null);
      setDeleteMember(null);
      setPromote(null);
    }
  });
  const tabs = [
    "overview",
    "members",
    "teams",
    "rounds",
    "fixtures",
    "results",
    "predictions",
    "content",
    "reports",
    "audit",
  ];
  const teamFields = [
    field("name_en"),
    field("name_ml", "text", false),
    field("short_name"),
    field("badge", "text", false),
    field("active", "checkbox"),
  ];
  const roundFields = [
    field("name_en"),
    field("name_ml"),
    field("stage_en", "text", false),
    field("stage_ml", "text", false),
    field("sort_order", "number"),
    field("starts_at", "datetime-local", false, "roundStarts"),
    field("ends_at", "datetime-local", false, "roundEnds"),
    field("active", "checkbox"),
  ];
  const fixtureFields: Field[] = [
    {
      ...field("round_id", "select"),
      options: data.rounds.map((r: Row) => ({
        value: r.id,
        label: localized(r, "name", lang),
      })),
    },
    ...["home_id", "away_id"].map((n) => ({
      ...field(n, "select"),
      options: (data.teams ?? []).map((r: Row) => ({
        value: r.id,
        label: localized(r, "name", lang),
      })),
    })),
    field("kickoff", "datetime-local", true, "kickoffInput"),
    field("venue_en", "text", false),
    field("venue_ml", "text", false),
    {
      ...field("status", "select"),
      options: [
        "scheduled",
        "postponed",
        "cancelled",
        "in_progress",
        "awaiting_result",
      ].map((s) => ({ value: s, label: t(s as Key) })),
    },
    field("knockout", "checkbox", false, "knockoutLabel"),
    field("demo", "checkbox", false, "demoLabel"),
    field("schedule_note_en", "textarea", false),
    field("schedule_note_ml", "textarea", false),
  ];
  const announcementFields = [
    field("title_en"),
    field("title_ml"),
    field("body_en", "textarea"),
    field("body_ml", "textarea"),
    field("published", "checkbox"),
    field("starts_at", "datetime-local", false),
    field("ends_at", "datetime-local", false),
  ];
  const open = (kind: string, record: Row, fields: Field[], help?: string) =>
    setEditor({
      kind,
      record,
      fields,
      title: t(record.id ? "edit" : "create") + " · " + t(kind as Key),
      help,
    });
  return (
    <>
      <PageTitle title={t("admin")} kicker={t("community")}>
        <ShieldCheck size={30} />
      </PageTitle>
      <nav className="admin-tabs">
        {tabs.map((key) => (
          <Link
            href={"/admin?tab=" + key}
            className={tab === key ? "active" : ""}
            key={key}
          >
            {t((key === "predictions" ? "importPrediction" : key) as Key)}
          </Link>
        ))}
      </nav>
      <ErrorMessage message={error} />
      {tab === "overview" && (
        <>
          <div className="admin-stats">
            {(
              [
                ["pendingCount", "pending", Users],
                ["approvedCount", "approved", ShieldCheck],
                ["upcoming", "upcoming", CalendarDays],
                ["awaitingCount", "awaiting", Clock3],
              ] as const
            ).map(([label, key, Icon]) => (
              <div className="stat-card" key={key}>
                <Icon />
                <div>
                  <span>{t(label)}</span>
                  <strong>{data.counts[key]}</strong>
                </div>
              </div>
            ))}
          </div>
          <section className="panel">
            <h2>{t("recentActions")}</h2>
            <Audit rows={data.audit} />
          </section>
        </>
      )}
      {tab === "members" && (
        <>
          <div className="section-heading">
            <h2>{t("members")}</h2>
            <button
              className="button primary"
              onClick={() => {
                setCredentials(null);
                setCopied(false);
                setNewMember(true);
              }}
            >
              <UserPlus size={18} />
              {t("addMember")}
            </button>
          </div>
          <form className="toolbar" action="/admin">
            <input type="hidden" name="tab" value="members" />
            <select
              name="filter"
              defaultValue={query.filter ?? "pending"}
              aria-label={t("membership")}
            >
              {["pending", "approved", "rejected", "suspended", "all"].map(
                (s) => (
                  <option key={s} value={s}>
                    {t((s === "pending" ? "pendingStatus" : s) as Key)}
                  </option>
                ),
              )}
            </select>
            <input
              placeholder={t("searchMembers")}
              aria-label={t("searchMembers")}
              name="q"
              defaultValue={query.q}
            />
            <button className="button secondary">{t("search")}</button>
          </form>
          {selected.length > 0 && (
            <button
              className="button primary"
              onClick={() => setReview({ ids: selected })}
            >
              {t("review")} ({selected.length})
            </button>
          )}
          <section className="panel table-panel">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        aria-label={t("all")}
                        checked={
                          data.members.length > 0 &&
                          selected.length ===
                            data.members.filter((m: Row) => m.role !== "admin")
                              .length
                        }
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? data.members
                                  .filter((m: Row) => m.role !== "admin")
                                  .map((m: Row) => m.id)
                              : [],
                          )
                        }
                      />
                    </th>
                    <th>{t("member")}</th>
                    <th>{t("membership")}</th>
                    <th>{t("role")}</th>
                    <th>{t("requestDate")}</th>
                    <th>{t("review")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.members.map((m: Row) => (
                    <Fragment key={m.id}>
                    <tr>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={m.display_name}
                          disabled={m.role === "admin"}
                          checked={selected.includes(m.id)}
                          onChange={(e) =>
                            setSelected(
                              e.target.checked
                                ? [...selected, m.id]
                                : selected.filter((x) => x !== m.id),
                            )
                          }
                        />
                      </td>
                      <td>
                        <strong>{m.display_name}</strong>
                        <small className="block">{m.email}</small>
                        {m.review_note && (
                          <small className="block fine">{m.review_note}</small>
                        )}
                      </td>
                      <td>
                        <span className={"status " + m.membership}>
                          {t(
                            (m.membership === "pending"
                              ? "pendingStatus"
                              : m.membership) as Key,
                          )}
                        </span>
                      </td>
                      <td>
                        <span className={"status " + (m.role === "admin" ? "approved" : "scheduled")}>
                          {m.role === "admin" ? t("organizer") : t("member")}
                        </span>
                      </td>
                      <td>{ist(m.created_at, lang)}</td>
                      <td>
                        <div className="button-row">
                          <button
                            className="button secondary small"
                            onClick={() => setPredictionMember(predictionMember === m.id ? null : m.id)}
                            aria-expanded={predictionMember === m.id}
                            aria-controls={`admin-predictions-${m.id}`}
                          >
                            <Eye size={15} />
                            {predictionMember === m.id ? t("hidePredictions") : t("viewPredictions")}
                          </button>
                          {m.role !== "admin" && (
                            <>
                              <button className="button secondary small" onClick={() => setEditMember(m)}>
                                <Pencil size={15} /> {t("editCredentials")}
                              </button>
                              <button className="button secondary small" onClick={() => setReview({ ...m, ids: [m.id] })}>
                                {t("review")}
                              </button>
                              <button className="button danger small" onClick={() => setDeleteMember(m)}>
                                <Trash2 size={15} /> {t("deleteMember")}
                              </button>
                            </>
                          )}
                          {m.role === "member" && m.membership === "approved" && (
                            <button
                              className="button secondary small"
                              onClick={() => setPromote(m)}
                            >
                              <ShieldCheck size={15} />
                              {t("promoteAdmin")}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {predictionMember === m.id && (
                      <tr className="member-prediction-row" id={`admin-predictions-${m.id}`}>
                        <td colSpan={6}>
                          <div className="member-prediction-heading"><strong>{m.display_name} · {t("latestPredictions")}</strong></div>
                          <MemberPredictions rows={(data.memberPredictions ?? []).filter((item: Row) => item.member_id === m.id)} />
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
              {!data.members.length && <p className="empty">{t("noRows")}</p>}
            </div>
          </section>
        </>
      )}
      {(tab === "teams" || tab === "rounds") && (
        <>
          <div className="section-heading">
            <h2>{t(tab)}</h2>
            <button
              className="button primary"
              onClick={() =>
                open(
                  tab,
                  { sort_order: 0 },
                  tab === "teams" ? teamFields : roundFields,
                )
              }
            >
              <Plus size={17} />
              {t("create")}
            </button>
          </div>
          <div className="admin-records">
            {(tab === "teams" ? data.teams : data.rounds).map((r: Row) => (
              <article className="panel" key={r.id}>
                <span className="record-short">
                  {r.short_name ?? r.sort_order}
                </span>
                <h3>{localized(r, "name", lang)}</h3>
                <p className="fine">
                  {r.name_en}
                  <br />
                  {r.name_ml}
                </p>
                {!r.name_ml && (
                  <p className="message info">
                    <AlertTriangle size={16} />
                    {t("translationWarning")}
                  </p>
                )}
                <div className="section-heading">
                  <span className="status">
                    {r.active ? "✓" : "—"} {t("active")}
                  </span>
                  <button
                    className="button secondary small"
                    onClick={() =>
                      open(tab, r, tab === "teams" ? teamFields : roundFields)
                    }
                  >
                    {t("edit")}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      {tab === "fixtures" && (
        <>
          <div className="section-heading">
            <p className="fine">{t("fixtureHelp")}</p>
            <button
              className="button primary"
              onClick={() =>
                open(
                  "fixtures",
                  { status: "scheduled", knockout: false, demo: false },
                  fixtureFields,
                  t("fixtureHelp") + " " + t("identityHelp"),
                )
              }
            >
              <Plus size={18} />
              {t("create")}
            </button>
          </div>
          <div className="admin-fixtures">
            {data.fixtures.map((f: Row) => (
              <article className="panel" key={f.id}>
                <div>
                  <span className={"status " + f.status}>
                    {t(f.status as Key)}
                  </span>
                  <h3>
                    {localized(f, "home", lang)} – {localized(f, "away", lang)}
                  </h3>
                  <p>
                    {ist(f.kickoff, lang)} · {localized(f, "round", lang)}
                  </p>
                  <small>
                    {t("deadline")}: {ist(f.deadline, lang)}
                  </small>
                </div>
                <div className="button-row">
                  <Link
                    className="button secondary small"
                    href={"/match?id=" + f.id}
                  >
                    {t("view")}
                  </Link>
                  {f.status !== "finalized" && (
                    <button
                      className="button secondary small"
                      onClick={() =>
                        open(
                          "fixtures",
                          f,
                          fixtureFields,
                          t("fixtureHelp") + " " + t("identityHelp"),
                        )
                      }
                    >
                      {t("edit")}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      {tab === "results" && <Results key={data.page} data={data} />}
      {tab === "predictions" && <PredictionImport data={data} />}
      {tab === "content" && (
        <>
          <div className="section-heading">
            <h2>{t("announcements")}</h2>
            <button
              className="button primary"
              onClick={() =>
                open("announcements", { published: false }, announcementFields)
              }
            >
              <Plus size={18} />
              {t("create")}
            </button>
          </div>
          <div className="admin-records">
            {data.announcements.map((a: Row) => (
              <article className="panel" key={a.id}>
                <h3>{localized(a, "title", lang)}</h3>
                <p>{localized(a, "body", lang)}</p>
                <div className="section-heading">
                  <span>
                    {a.published ? "✓" : "—"} {t("published")}
                  </span>
                  <button
                    className="button secondary small"
                    onClick={() => open("announcements", a, announcementFields)}
                  >
                    {t("edit")}
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="section-heading lower">
            <h2>{t("rulesHistory")}</h2>
            <button
              className="button primary"
              onClick={() =>
                setEditor({
                  kind: "rules",
                  record: {
                    body_en: data.rulesHistory[0]?.body_en ?? "",
                    body_ml: data.rulesHistory[0]?.body_ml ?? "",
                    contact: data.rulesHistory[0]?.contact ?? "",
                  },
                  fields: [
                    field("body_en", "textarea"),
                    field("body_ml", "textarea"),
                    field("contact", "text", false, "contactInput"),
                  ],
                  title: t("saveRules"),
                })
              }
            >
              {t("saveRules")}
            </button>
          </div>
          <section className="panel">
            {data.rulesHistory.length ? (
              data.rulesHistory.map((r: Row) => (
                <details key={r.id}>
                  <summary>{ist(r.created_at, lang)}</summary>
                  <p className="pre-wrap">{localized(r, "body", lang)}</p>
                  <p>{r.contact}</p>
                </details>
              ))
            ) : (
              <p>{t("noRows")}</p>
            )}
          </section>
        </>
      )}
      {tab === "reports" && (
        <section className="panel">
          <h2>{t("reports")}</h2>
          <p>{t("reportText")}</p>
          <div className="report-grid">
            {["fixtures", "predictions", "standings", "membership"].map(
              (kind) => (
                <a
                  className="report-card"
                  key={kind}
                  href={"/api/export?type=" + kind}
                >
                  <Download />
                  <h3>
                    {t((kind === "standings" ? "leaderboard" : kind) as Key)}
                  </h3>
                  <span>{t("exportCSV")}</span>
                </a>
              ),
            )}
          </div>
        </section>
      )}
      {tab === "audit" && (
        <section className="panel">
          <Audit rows={data.audit} />
        </section>
      )}
      {["members", "fixtures", "results", "audit"].includes(tab) && (
        <Pagination data={data} path="/admin" query={query} />
      )}
      {editor && <Editor {...editor} onClose={() => setEditor(null)} />}
      {newMember && (
        <div className="modal-backdrop">
          <section className="modal" role="dialog" aria-modal="true" aria-label={t("addMember")}>
            <div className="section-heading">
              <h2>{credentials ? t("credentialsReady") : t("addMember")}</h2>
              <button className="icon-button" aria-label={t("close")} onClick={() => setNewMember(false)}>
                <X />
              </button>
            </div>
            {credentials ? (
              <div className="credentials-card" role="status">
                <KeyRound size={30} />
                <div><span>{t("accountLogin")}</span><strong>{credentials.identifier}</strong></div>
                <div><span>{t("generatedPassword")}</span><strong>{credentials.password}</strong></div>
                <p className="fine">{t("passwordHelp")}</p>
                <button
                  className="button primary"
                  onClick={async () => {
                    const value = `${t("accountLogin")}: ${credentials.identifier}\n${t("generatedPassword")}: ${credentials.password}`;
                    try {
                      if (!navigator.clipboard) throw new Error("clipboard");
                      await navigator.clipboard.writeText(value);
                      setCopied(true);
                    } catch {
                      setError("copy_failed");
                    }
                  }}
                >
                  <Copy size={17} />
                  {t(copied ? "credentialsCopied" : "copyCredentials")}
                </button>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  setError("");
                  const form = new FormData(e.currentTarget);
                  try {
                    const response = await action("createMember", {
                      display_name: form.get("display_name"),
                      identifier: newAccountType === "phone"
                        ? String(form.get("country_code")) + String(form.get("mobile")).replace(/\D/g, "")
                        : form.get("email"),
                      password: form.get("password"),
                      language: form.get("language"),
                    });
                    setCredentials(response.result);
                    router.refresh();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <p className="fine">{t("addMemberHelp")}</p>
                <div className="form-grid">
                  <label>{t("display_name")}<input name="display_name" required minLength={2} maxLength={50} /></label>
                  <label>{t("accountType")}<select value={newAccountType} onChange={(e)=>setNewAccountType(e.target.value as "phone"|"email")}><option value="phone">{t("mobileNumber")}</option><option value="email">{t("email")}</option></select></label>
                  {newAccountType === "phone" ? <>
                    <label>{t("countryCode")}<select name="country_code" defaultValue="+91">{countryCodes.map(([country,code])=><option value={code} key={country+code}>{country} {code}</option>)}</select></label>
                    <label>{t("mobileNumber")}<input name="mobile" required inputMode="numeric" pattern="[0-9 ]{6,15}" autoComplete="tel-national" /></label>
                  </> : <label>{t("email")}<input name="email" type="email" required autoComplete="email" maxLength={254} /></label>}
                  <label>{t("password")}<PasswordInput name="password" required minLength={10} maxLength={128} autoComplete="new-password" /></label>
                  <label>{t("language")}<select name="language"><option value="en">English</option><option value="ml">മലയാളം</option></select></label>
                </div>
                <ErrorMessage message={error} />
                <button className="button primary" disabled={busy}>
                  <UserPlus size={18} /> {busy ? t("saving") : t("addMember")}
                </button>
              </form>
            )}
          </section>
        </div>
      )}
      {editMember && (() => {
        const phone = String(editMember.email).startsWith("+") ? splitPhone(editMember.email) : null;
        return <div className="modal-backdrop">
          <section className="modal" role="dialog" aria-modal="true" aria-label={t("editCredentials")}>
            <div className="section-heading"><h2>{t("editCredentials")} · {editMember.display_name}</h2><button className="icon-button" aria-label={t("close")} onClick={()=>setEditMember(null)}><X /></button></div>
            <p className="fine">{t("editCredentialsHelp")}</p>
            <form onSubmit={async(e)=>{
              e.preventDefault(); setBusy(true); setError(""); const form=new FormData(e.currentTarget);
              try {
                const identifier = phone ? String(form.get("country_code"))+String(form.get("mobile")).replace(/\D/g,"") : form.get("email");
                await action("updateMember", { member_id:editMember.id, display_name:form.get("display_name"), identifier, password:form.get("password") });
                setEditMember(null); router.refresh();
              } catch(e){ setError((e as Error).message); } finally { setBusy(false); }
            }}>
              <div className="form-grid">
                <label>{t("display_name")}<input name="display_name" defaultValue={editMember.display_name} required minLength={2} maxLength={50} /></label>
                {phone ? <><label>{t("countryCode")}<select name="country_code" defaultValue={phone.code}>{countryCodes.map(([country,code])=><option value={code} key={country+code}>{country} {code}</option>)}</select></label><label>{t("mobileNumber")}<input name="mobile" defaultValue={phone.number} required inputMode="numeric" pattern="[0-9 ]{6,15}" /></label></> : <label>{t("email")}<input name="email" type="email" defaultValue={editMember.email} required /></label>}
                <label>{t("newPasswordOptional")}<PasswordInput name="password" minLength={10} maxLength={128} autoComplete="new-password" /></label>
              </div>
              <ErrorMessage message={error} />
              <button className="button primary" disabled={busy}>{busy?t("saving"):t("save")}</button>
            </form>
          </section>
        </div>;
      })()}
      {promote && (
        <div className="modal-backdrop">
          <section className="modal" role="dialog" aria-modal="true" aria-label={t("promoteAdmin")}>
            <div className="section-heading">
              <h2>{t("promoteAdmin")} · {promote.display_name}</h2>
              <button className="icon-button" aria-label={t("close")} onClick={() => setPromote(null)}><X /></button>
            </div>
            <p>{t("promoteAdminHelp")}</p>
            <ErrorMessage message={error} />
            <button
              className="button primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await action("promote", { member_id: promote.id });
                  setPromote(null);
                  router.refresh();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <ShieldCheck size={18} /> {busy ? t("saving") : t("promoteAdmin")}
            </button>
          </section>
        </div>
      )}
      {deleteMember && (
        <div className="modal-backdrop">
          <section className="modal" role="dialog" aria-modal="true" aria-label={t("deleteMember")}>
            <div className="section-heading">
              <h2>{t("deleteMember")} · {deleteMember.display_name}</h2>
              <button className="icon-button" aria-label={t("close")} onClick={() => setDeleteMember(null)}><X /></button>
            </div>
            <p>{t("deleteMemberHelp")}</p>
            <ErrorMessage message={error} />
            <div className="button-row">
              <button className="button secondary" disabled={busy} onClick={() => setDeleteMember(null)}>{t("cancel")}</button>
              <button className="button danger" disabled={busy} onClick={async () => {
                setBusy(true); setError("");
                try {
                  await action("deleteMember", { member_id: deleteMember.id });
                  setDeleteMember(null); router.refresh();
                } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
              }}><Trash2 size={18} /> {busy ? t("saving") : t("deletePermanently")}</button>
            </div>
          </section>
        </div>
      )}
      {review && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={t("review")}
          >
            <div className="section-heading">
              <h2>
                {t("review")} · {review.display_name ?? review.ids.length}
              </h2>
              <button
                autoFocus
                className="icon-button"
                aria-label={t("close")}
                onClick={() => setReview(null)}
              >
                <X />
              </button>
            </div>
            <p>{t("confirmEffect")}</p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                const form = new FormData(e.currentTarget);
                try {
                  for (const id of review.ids)
                    await action("review", {
                      member_id: id,
                      membership: form.get("membership"),
                      note: form.get("note"),
                    });
                  setSelected([]);
                  setReview(null);
                  router.refresh();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                {t("membership")}
                <select name="membership" required>
                  <option value="approved">
                    {t("approve")} / {t("restore")}
                  </option>
                  <option value="rejected">{t("reject")}</option>
                  <option value="suspended">{t("suspend")}</option>
                </select>
              </label>
              <label>
                {t("reviewNote")}
                <textarea name="note" maxLength={10000} />
              </label>
              <ErrorMessage message={error} />
              <button className="button primary" disabled={busy}>
                <Check size={18} />
                {busy ? t("saving") : t("confirm")}
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
