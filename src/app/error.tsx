"use client";
import { useEffect } from "react";
import { useLanguage } from "@/components/provider";

export default function Error({
  error,
  reset,
}: {
  error?: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLanguage();

  useEffect(() => {
    if (error) console.error("Root application error boundary caught:", error);
  }, [error]);

  return (
    <div className="error-page">
      <img src="/sbk-logo.png" alt="SBK" width="80" />
      <h1>{t("networkError")}</h1>
      <div style={{ display: "flex", gap: "12px", marginTop: "18px", flexWrap: "wrap", justifyContent: "center" }}>
        <button className="button primary" onClick={reset}>
          {t("retry")}
        </button>
        <a
          href="/"
          className="button secondary"
          style={{
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 22px",
            height: "44px",
            lineHeight: "44px",
          }}
        >
          {t("home")}
        </a>
      </div>
    </div>
  );
}
