"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock3, AlertCircle, ArrowRight, X } from "lucide-react";
import { type Row } from "@/lib/db";
import { type Lang } from "@/lib/domain";
import { type Key } from "@/lib/i18n";
import { localized } from "./dashboard";

export function InAppReminderBanner({
  fixtures,
  lang,
  t,
}: {
  fixtures: Row[];
  lang: Lang;
  t: (key: Key) => string;
}) {
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!fixtures || !fixtures.length) return null;

  // Find the earliest upcoming scheduled fixture where user has NOT predicted yet
  // and the deadline is in the future
  const urgentFixture = fixtures.find((f: Row) => {
    if (f.status !== "scheduled" || f.predicted_home !== null) return false;
    const deadlineStr =
      typeof f.deadline === "string" && f.deadline.includes(" ") && !f.deadline.includes("T")
        ? f.deadline.replace(" ", "T")
        : f.deadline;
    const deadlineTime = new Date(deadlineStr).getTime();
    if (isNaN(deadlineTime)) return false;
    const remaining = deadlineTime - now;
    // Show banner when deadline is within 30 minutes (remaining <= 30 * 60 * 1000 and > 0)
    // and hasn't been dismissed by user in this session
    return remaining > 0 && remaining <= 30 * 60 * 1000 && !dismissed[f.id];
  });

  if (!urgentFixture) return null;

  const urgentDeadlineStr =
    typeof urgentFixture.deadline === "string" &&
    urgentFixture.deadline.includes(" ") &&
    !urgentFixture.deadline.includes("T")
      ? urgentFixture.deadline.replace(" ", "T")
      : urgentFixture.deadline;
  const deadlineTime = new Date(urgentDeadlineStr).getTime();
  const remainingSecs = Math.max(0, Math.floor((deadlineTime - now) / 1000));
  const mins = Math.floor(remainingSecs / 60);
  const secs = remainingSecs % 60;
  const countdownText = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  const homeName = localized(urgentFixture, "home", lang);
  const awayName = localized(urgentFixture, "away", lang);

  return (
    <div
      role="alert"
      style={{
        background: "linear-gradient(135deg, rgba(254, 243, 199, 0.95), rgba(254, 215, 170, 0.95))",
        border: "1.5px solid #f59e0b",
        borderRadius: "12px",
        padding: "14px 18px",
        marginBottom: "20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "14px",
        boxShadow: "0 4px 14px rgba(245, 158, 11, 0.18)",
        color: "#78350f",
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: "260px" }}>
        <div
          style={{
            background: "#f59e0b",
            color: "#ffffff",
            padding: "8px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Clock3 size={20} />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span
              style={{
                background: "#dc2626",
                color: "#ffffff",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                padding: "2px 8px",
                borderRadius: "999px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <AlertCircle size={12} />
              LOCKS IN {countdownText}
            </span>
            <strong style={{ fontSize: "14.5px", color: "#92400e" }}>
              {t("urgentReminderBannerTitle")}
            </strong>
          </div>
          <p style={{ margin: "4px 0 0 0", fontSize: "13.5px", color: "#78350f", lineHeight: "1.4" }}>
            {lang === "en" ? (
              <>
                Predictions for <b>{homeName} vs {awayName}</b> lock in less than 30 minutes. Submit your call now to secure your leaderboard points!
              </>
            ) : (
              <>
                <b>{homeName} vs {awayName}</b> മത്സരത്തിന്റെ പ്രവചനം ലോക്ക് ആകാൻ 30 മിനിറ്റിൽ താഴെ മാത്രം! പോയിന്റുകൾ നഷ്ടപ്പെടാതിരിക്കാൻ ഇപ്പോൾ തന്നെ പ്രവചിക്കൂ.
              </>
            )}
          </p>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
        <Link
          href={"/match?id=" + urgentFixture.id}
          style={{
            background: "#b45309",
            color: "#ffffff",
            fontWeight: 700,
            fontSize: "13.5px",
            padding: "8px 16px",
            borderRadius: "8px",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            textDecoration: "none",
            boxShadow: "0 2px 6px rgba(180, 83, 9, 0.3)",
          }}
        >
          {t("predictNow")}
          <ArrowRight size={15} />
        </Link>
        <button
          type="button"
          onClick={() => setDismissed((prev) => ({ ...prev, [urgentFixture.id]: true }))}
          aria-label={t("close")}
          style={{
            background: "transparent",
            border: "none",
            color: "#92400e",
            cursor: "pointer",
            padding: "4px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
