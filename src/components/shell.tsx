"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  CalendarDays,
  Trophy,
  UserRound,
  ClipboardList,
  BookOpen,
  ShieldCheck,
  LogOut,
  ArrowUpRight,
} from "lucide-react";
import { LanguageSwitch, useLanguage, action } from "./provider";
import type { ReactNode } from "react";
import type { Row } from "@/lib/db";
export function Shell({
  children,
  user,
  demo,
}: {
  children: ReactNode;
  user: Row;
  demo: boolean;
}) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const primary = [
    ["home", Home],
    ["matches", CalendarDays],
    ["leaderboard", Trophy],
    ["profile", UserRound],
  ] as const;
  return (
    <div className="app-shell">
      <a href="#main" className="skip">
        Skip to content / ഉള്ളടക്കത്തിലേക്ക്
      </a>
      <aside className="sidebar">
        <Link className="brand" href="/home">
          <img src="/sbk-logo.png" alt="Soccer Blues of Keralam" />
          <div>
            <strong>
              SBK<span>SLK</span>
            </strong>
            <small>{t("title")}</small>
          </div>
        </Link>
        <div className="nav-caption">{t("community")}</div>
        <nav>
          {primary.map(([key, Icon]) => (
            <Link
              key={key}
              className={pathname === `/${key}` ? "active" : ""}
              href={`/${key}`}
            >
              <Icon size={20} />
              {t(key)}
            </Link>
          ))}
          <div className="nav-divider" />
          {(
            [
              ["predictions", ClipboardList],
              ["rules", BookOpen],
            ] as const
          ).map(([key, Icon]) => (
            <Link
              key={key}
              className={pathname === `/${key}` ? "active" : ""}
              href={`/${key}`}
            >
              <Icon size={20} />
              {t(key)}
            </Link>
          ))}
          {user.role === "admin" && (
            <Link
              className={pathname === "/admin" ? "active" : ""}
              href="/admin"
            >
              <ShieldCheck size={20} />
              {t("admin")}
            </Link>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="mini-ball">✦</div>
          <p>{t("tagline")}</p>
          <small>{t("freeNote")}</small>
          <button
            className="text-button"
            onClick={async () => {
              await action("logout");
              location.href = "/";
            }}
          >
            <LogOut size={16} />
            {t("logout")}
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <Link href="/home" className="mobile-brand">
            <img src="/sbk-logo.png" alt="SBK" />
            SBK <b>SLK</b>
          </Link>
          <span className="topbar-label">
            <span className="live-dot" />
            {t("community")}
          </span>
          <div className="topbar-right">
            <LanguageSwitch member />
            <Link className="avatar" aria-label={t("profile")} href="/profile">
              {user.display_name.slice(0, 1).toUpperCase()}
            </Link>
          </div>
        </header>
        {demo && <div className="demo-bar">{t("demo")}</div>}
        <main id="main">{children}</main>
        <footer className="footer">
          <span>© {new Date().getFullYear()} Soccer Blues of Keralam</span>
          <Link href="/rules">
            {t("rules")} <ArrowUpRight size={14} />
          </Link>
        </footer>
      </div>
      <nav className="bottom-nav" aria-label={t("title")}>
        {primary.map(([key, Icon]) => (
          <Link
            key={key}
            aria-current={pathname === `/${key}` ? "page" : undefined}
            className={pathname === `/${key}` ? "active" : ""}
            href={`/${key}`}
          >
            <Icon size={21} />
            <span>{t(key)}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
