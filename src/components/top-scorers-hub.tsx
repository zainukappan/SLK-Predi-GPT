"use client";

import Link from "next/link";
import { useState, useMemo, type ReactNode } from "react";
import { ChevronLeft, Search, Shield, Trophy, Users, Filter, X } from "lucide-react";
import type { Row } from "@/lib/db";
import { PublicHeader, Badge, CardTitle, name } from "./public-sports-hub";
import { useLanguage } from "./provider";
import { OnlineCounter } from "./online-counter";

const copy = {
  en: {
    back: "Back to Match Centre",
    title: "Top Scorers & Player Stats",
    subtitle: "Super League Kerala 2026 player rankings — Top Scorers, Assists, and Goal Contributions",
    all: "All Stats",
    top: "Top Scorers",
    assists: "Assists",
    contrib: "Goal Contributions",
    searchPlaceholder: "Search player or club...",
    allClubs: "All Clubs",
    noStats: "No players found matching your criteria.",
    playersCount: "players",
    goals: "Goals",
    login: "Member Login",
    footerText: "Soccer Blues of Keralam · Fans predict. Football unites.",
  },
  ml: {
    back: "മാച്ച് സെന്ററിലേക്ക് മടങ്ങുക",
    title: "ടോപ് സ്കോറേഴ്സ് & പ്ലെയർ സ്റ്റാറ്റിസ്റ്റിക്സ്",
    subtitle: "സൂപ്പർ ലീഗ് കേരള 2026 കളിക്കാരുടെ സമഗ്ര കണക്കുകൾ — ഗോളുകൾ, അസിസ്റ്റുകൾ, ഗോൾ പങ്കാളിത്തം",
    all: "എല്ലാം",
    top: "ടോപ് സ്കോറേഴ്സ്",
    assists: "അസിസ്റ്റുകൾ",
    contrib: "ഗോൾ കോൺട്രിബ്യൂഷൻസ്",
    searchPlaceholder: "കളിക്കാരെയോ ക്ലബ്ബിനെയോ തിരയുക...",
    allClubs: "എല്ലാ ക്ലബ്ബുകളും",
    noStats: "നിങ്ങൾ തിരഞ്ഞ മാനദണ്ഡത്തിലുള്ള കളിക്കാരെ കണ്ടെത്തിയില്ല.",
    playersCount: "കളിക്കാർ",
    goals: "ഗോളുകൾ",
    login: "മെമ്പർ ലോഗിൻ",
    footerText: "Soccer Blues of Keralam · Fans predict. Football unites.",
  },
} as const;

export function TopScorersHub({
  players,
  initialTab = "all",
}: {
  players: Row[];
  initialTab?: string;
}) {
  const { lang } = useLanguage();
  const t = copy[lang];
  const [activeTab, setActiveTab] = useState<"all" | "top" | "assists" | "contrib">(
    initialTab === "top" || initialTab === "assists" || initialTab === "contrib"
      ? initialTab
      : "all"
  );
  const [search, setSearch] = useState("");
  const [selectedClub, setSelectedClub] = useState("all");

  // Get unique clubs for filter dropdown
  const clubs = useMemo(() => {
    const map = new Map<string, { id: string; name_en: string; name_ml: string }>();
    players.forEach((p) => {
      if (p.team_id && !map.has(p.team_id)) {
        map.set(p.team_id, {
          id: p.team_id,
          name_en: p.team_en,
          name_ml: p.team_ml,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name_en.localeCompare(b.name_en));
  }, [players]);

  // Filter players based on search and selected club
  const filteredPlayers = useMemo(() => {
    let list = players;
    if (selectedClub !== "all") {
      list = list.filter((p) => p.team_id === selectedClub);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          (p.player_en && p.player_en.toLowerCase().includes(q)) ||
          (p.player_ml && p.player_ml.toLowerCase().includes(q)) ||
          (p.team_en && p.team_en.toLowerCase().includes(q)) ||
          (p.team_ml && p.team_ml.toLowerCase().includes(q))
      );
    }
    return list;
  }, [players, selectedClub, search]);

  const getMetricList = (metric: "top" | "assists" | "contrib") => {
    const key = metric === "top" ? "goals" : metric === "assists" ? "assists" : "contributions";
    return [...filteredPlayers]
      .filter((p) => Number(p[key]) > 0)
      .sort((a, b) => {
        const diff = Number(b[key]) - Number(a[key]);
        if (diff !== 0) return diff;
        // Secondary sort: contributions or goals, then name
        if (metric === "top") return Number(b.contributions) - Number(a.contributions);
        if (metric === "assists") return Number(b.goals) - Number(a.goals);
        return Number(b.goals) - Number(a.goals);
      });
  };

  const topScorers = useMemo(() => getMetricList("top"), [filteredPlayers]);
  const topAssists = useMemo(() => getMetricList("assists"), [filteredPlayers]);
  const topContrib = useMemo(() => getMetricList("contrib"), [filteredPlayers]);

  const renderPlayerList = (rows: Row[], metric: "top" | "assists" | "contrib") => {
    const key = metric === "top" ? "goals" : metric === "assists" ? "assists" : "contributions";
    if (!rows.length) {
      return <p className="slk-empty">{t.noStats}</p>;
    }
    return (
      <div className="slk-player-grid" style={{ gridTemplateColumns: "1fr", gap: 0 }}>
        {rows.map((r, i) => (
          <article
            key={r.player_id}
            style={{
              border: 0,
              borderBottom: "1px solid #edf1f6",
              borderRadius: 0,
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <span
              className="slk-player-rank"
              style={{
                width: "28px",
                height: "28px",
                fontSize: "12px",
                background: i === 0 ? "#ffda28" : i === 1 ? "#dfe6ef" : i === 2 ? "#ffc27c" : "#edf2f7",
                color: i < 3 ? "#071a3d" : "#4a5568",
              }}
            >
              {i + 1}
            </span>
            <Badge src={r.badge} label={name(r, "team", lang)} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <strong style={{ fontSize: "15px", color: "#071a3d" }}>
                {name(r, "player", lang)}
              </strong>
              <small style={{ color: "#64748b", marginTop: "2px", display: "block" }}>
                {name(r, "team", lang)}
                {r.shirt_number ? ` · #${r.shirt_number}` : ""}
              </small>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <b style={{ fontSize: "22px", color: "var(--blue, #1450df)", fontWeight: 900 }}>
                {r[key]}
              </b>
              {metric === "contrib" && (
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--muted, #64748b)",
                    whiteSpace: "nowrap",
                    fontWeight: 700,
                    marginTop: "2px",
                  }}
                >
                  {r.goals} {lang === "ml" ? "ഗോൾ" : "G"} + {r.assists} {lang === "ml" ? "അസിസ്റ്റ്" : "A"}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    );
  };

  return (
    <div className="slk-public">
      <PublicHeader />

      <main style={{ maxWidth: "1380px", margin: "auto", padding: "20px 24px 60px" }}>
        {/* Back navigation */}
        <div style={{ marginBottom: "18px" }}>
          <Link
            href="/SuperLeagueKerala#players"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              color: "var(--blue, #1450df)",
              fontSize: "13px",
              fontWeight: 700,
              textDecoration: "none",
              padding: "6px 12px",
              background: "#e8efff",
              borderRadius: "8px",
            }}
          >
            <ChevronLeft size={16} />
            <span>{t.back}</span>
          </Link>
        </div>

        {/* Hero header banner */}
        <section
          style={{
            position: "relative",
            overflow: "hidden",
            padding: "32px 36px",
            borderRadius: "20px",
            background: "linear-gradient(135deg, #04163c 0%, #062a68 55%, #0c49cb 100%)",
            color: "#fff",
            boxShadow: "0 14px 40px rgba(9, 44, 104, 0.2)",
            marginBottom: "28px",
          }}
        >
          <div style={{ display: "inline-block", padding: "5px 12px", borderRadius: "999px", background: "#16dfd0", color: "#04264b", fontSize: "11px", fontWeight: 900, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "12px" }}>
            SUPER LEAGUE KERALA 2026
          </div>
          <h1
            style={{
              margin: "0 0 10px 0",
              fontFamily: '"Barlow Condensed", sans-serif',
              fontSize: "clamp(32px, 5vw, 48px)",
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "0.5px",
            }}
          >
            {t.title}
          </h1>
          <p style={{ margin: 0, color: "#d7e8ff", fontSize: "15px", maxWidth: "680px" }}>
            {t.subtitle}
          </p>
        </section>

        {/* Controls: Tabs & Filters */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          {/* Tabs */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              background: "#fff",
              padding: "8px",
              borderRadius: "14px",
              border: "1px solid #dfe5ef",
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              style={{
                flex: "1 1 auto",
                minWidth: "120px",
                padding: "10px 16px",
                borderRadius: "10px",
                border: "none",
                background: activeTab === "all" ? "var(--blue, #0c49cb)" : "#f4f7fc",
                color: activeTab === "all" ? "#fff" : "#263b5d",
                fontWeight: 800,
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <Trophy size={16} />
              <span>{t.all}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("top")}
              style={{
                flex: "1 1 auto",
                minWidth: "140px",
                padding: "10px 16px",
                borderRadius: "10px",
                border: "none",
                background: activeTab === "top" ? "var(--blue, #0c49cb)" : "#f4f7fc",
                color: activeTab === "top" ? "#fff" : "#263b5d",
                fontWeight: 800,
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <span>⚽</span>
              <span>{t.top}</span>
              <span
                style={{
                  background: activeTab === "top" ? "rgba(255,255,255,0.25)" : "#e2e8f0",
                  padding: "2px 7px",
                  borderRadius: "99px",
                  fontSize: "11px",
                }}
              >
                {topScorers.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("assists")}
              style={{
                flex: "1 1 auto",
                minWidth: "130px",
                padding: "10px 16px",
                borderRadius: "10px",
                border: "none",
                background: activeTab === "assists" ? "var(--blue, #0c49cb)" : "#f4f7fc",
                color: activeTab === "assists" ? "#fff" : "#263b5d",
                fontWeight: 800,
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <span>👟</span>
              <span>{t.assists}</span>
              <span
                style={{
                  background: activeTab === "assists" ? "rgba(255,255,255,0.25)" : "#e2e8f0",
                  padding: "2px 7px",
                  borderRadius: "99px",
                  fontSize: "11px",
                }}
              >
                {topAssists.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("contrib")}
              style={{
                flex: "1 1 auto",
                minWidth: "150px",
                padding: "10px 16px",
                borderRadius: "10px",
                border: "none",
                background: activeTab === "contrib" ? "var(--blue, #0c49cb)" : "#f4f7fc",
                color: activeTab === "contrib" ? "#fff" : "#263b5d",
                fontWeight: 800,
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <Users size={16} />
              <span>{t.contrib}</span>
              <span
                style={{
                  background: activeTab === "contrib" ? "rgba(255,255,255,0.25)" : "#e2e8f0",
                  padding: "2px 7px",
                  borderRadius: "99px",
                  fontSize: "11px",
                }}
              >
                {topContrib.length}
              </span>
            </button>
          </div>

          {/* Search & Club Filter Toolbar */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              alignItems: "center",
            }}
          >
            {/* Search Input */}
            <div
              style={{
                position: "relative",
                flex: "1 1 240px",
                minWidth: "200px",
              }}
            >
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.searchPlaceholder}
                style={{
                  width: "100%",
                  padding: "10px 36px 10px 38px",
                  borderRadius: "10px",
                  border: "1px solid #dfe5ef",
                  background: "#fff",
                  fontSize: "13px",
                  color: "#071a3d",
                  outline: "none",
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    border: "none",
                    background: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    padding: "4px",
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Club Filter */}
            <div
              style={{
                position: "relative",
                flex: "0 1 220px",
                minWidth: "160px",
              }}
            >
              <select
                value={selectedClub}
                onChange={(e) => setSelectedClub(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid #dfe5ef",
                  background: "#fff",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#071a3d",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="all">{t.allClubs}</option>
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {lang === "ml" && c.name_ml ? c.name_ml : c.name_en}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Content Section */}
        {activeTab === "all" ? (
          /* 3-Column Full Layout */
          <div className="slk-stat-cards" style={{ marginTop: 0 }}>
            {/* Top Scorers Card */}
            <article className="slk-data-card slk-stat-card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  borderBottom: "1px solid #e8edf5",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span
                    style={{
                      width: "36px",
                      height: "36px",
                      display: "grid",
                      placeItems: "center",
                      borderRadius: "10px",
                      background: "#e9f0ff",
                      color: "#0c49cb",
                    }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polygon points="12 6 16.5 9 14.5 14 9.5 14 7.5 9" />
                      <line x1="12" y1="6" x2="12" y2="2" />
                      <line x1="16.5" y1="9" x2="21.5" y2="8" />
                      <line x1="14.5" y1="14" x2="18" y2="19" />
                      <line x1="9.5" y1="14" x2="6" y2="19" />
                      <line x1="7.5" y1="9" x2="2.5" y2="8" />
                    </svg>
                  </span>
                  <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "#071a3d" }}>
                    {t.top}
                  </h2>
                </div>
                <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--blue, #0c49cb)", background: "#eef4ff", padding: "4px 8px", borderRadius: "6px" }}>
                  {topScorers.length} {t.playersCount}
                </span>
              </div>
              {renderPlayerList(topScorers, "top")}
            </article>

            {/* Assists Card */}
            <article className="slk-data-card slk-stat-card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  borderBottom: "1px solid #e8edf5",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span
                    style={{
                      width: "36px",
                      height: "36px",
                      display: "grid",
                      placeItems: "center",
                      borderRadius: "10px",
                      background: "#e9f0ff",
                      color: "#0c49cb",
                    }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 15v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3c0-1.5-1-3-2.5-3.5L15 10l-2-3-6 3c-1.5.5-2.5 2-2.5 3.5V15z" />
                      <line x1="7" y1="18" x2="7" y2="21" />
                      <line x1="11" y1="18" x2="11" y2="21" />
                      <line x1="15" y1="18" x2="15" y2="21" />
                      <line x1="13" y1="10" x2="16" y2="14" />
                    </svg>
                  </span>
                  <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "#071a3d" }}>
                    {t.assists}
                  </h2>
                </div>
                <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--blue, #0c49cb)", background: "#eef4ff", padding: "4px 8px", borderRadius: "6px" }}>
                  {topAssists.length} {t.playersCount}
                </span>
              </div>
              {renderPlayerList(topAssists, "assists")}
            </article>

            {/* Goal Contributions Card */}
            <article className="slk-data-card slk-stat-card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  borderBottom: "1px solid #e8edf5",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span
                    style={{
                      width: "36px",
                      height: "36px",
                      display: "grid",
                      placeItems: "center",
                      borderRadius: "10px",
                      background: "#e9f0ff",
                      color: "#0c49cb",
                    }}
                  >
                    <Users size={20} />
                  </span>
                  <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "#071a3d" }}>
                    {t.contrib}
                  </h2>
                </div>
                <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--blue, #0c49cb)", background: "#eef4ff", padding: "4px 8px", borderRadius: "6px" }}>
                  {topContrib.length} {t.playersCount}
                </span>
              </div>
              {renderPlayerList(topContrib, "contrib")}
            </article>
          </div>
        ) : (
          /* Single Selected Tab Full-Width View */
          <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            <article className="slk-data-card slk-stat-card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "18px 24px",
                  borderBottom: "1px solid #e8edf5",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span
                    style={{
                      width: "42px",
                      height: "42px",
                      display: "grid",
                      placeItems: "center",
                      borderRadius: "12px",
                      background: "#e9f0ff",
                      color: "#0c49cb",
                    }}
                  >
                    {activeTab === "top" ? (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polygon points="12 6 16.5 9 14.5 14 9.5 14 7.5 9" />
                        <line x1="12" y1="6" x2="12" y2="2" />
                        <line x1="16.5" y1="9" x2="21.5" y2="8" />
                        <line x1="14.5" y1="14" x2="18" y2="19" />
                        <line x1="9.5" y1="14" x2="6" y2="19" />
                        <line x1="7.5" y1="9" x2="2.5" y2="8" />
                      </svg>
                    ) : activeTab === "assists" ? (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 15v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3c0-1.5-1-3-2.5-3.5L15 10l-2-3-6 3c-1.5.5-2.5 2-2.5 3.5V15z" />
                        <line x1="7" y1="18" x2="7" y2="21" />
                        <line x1="11" y1="18" x2="11" y2="21" />
                        <line x1="15" y1="18" x2="15" y2="21" />
                        <line x1="13" y1="10" x2="16" y2="14" />
                      </svg>
                    ) : (
                      <Users size={22} />
                    )}
                  </span>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#071a3d" }}>
                      {t[activeTab]}
                    </h2>
                    <small style={{ color: "#64748b" }}>
                      Super League Kerala 2026
                    </small>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 800,
                    color: "var(--blue, #0c49cb)",
                    background: "#eef4ff",
                    padding: "6px 12px",
                    borderRadius: "8px",
                  }}
                >
                  {activeTab === "top"
                    ? topScorers.length
                    : activeTab === "assists"
                    ? topAssists.length
                    : topContrib.length}{" "}
                  {t.playersCount}
                </span>
              </div>
              {renderPlayerList(
                activeTab === "top" ? topScorers : activeTab === "assists" ? topAssists : topContrib,
                activeTab
              )}
            </article>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="slk-public-footer">
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
          <img src="/sbk-logo.png" alt="SBK" />
          <OnlineCounter />
        </div>
        <p>{t.footerText}</p>
        <Link href="/">{t.login}</Link>
      </footer>
    </div>
  );
}
