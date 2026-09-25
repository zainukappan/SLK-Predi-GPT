"use client";
import { useLanguage } from "@/components/provider";
export default function Error({ reset }: { reset: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="error-page">
      <img src="/sbk-logo.png" alt="SBK" width="80" />
      <h1>{t("networkError")}</h1>
      <button className="button primary" onClick={reset}>
        {t("retry")}
      </button>
    </div>
  );
}
