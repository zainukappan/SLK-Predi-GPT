"use client";
import Link from "next/link";
import { useLanguage } from "@/components/provider";
export default function NotFound() {
  const { t } = useLanguage();
  return (
    <div className="error-page">
      <strong className="big-number">404</strong>
      <h1>{t("notFound")}</h1>
      <Link className="button primary" href="/home">
        {t("backHome")}
      </Link>
    </div>
  );
}
