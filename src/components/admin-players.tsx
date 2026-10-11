"use client";
import { useState, useMemo } from "react";
import { Plus, Search, Pencil, AlertTriangle, Shield } from "lucide-react";
import type { Row } from "@/lib/db";
import { localized } from "./dashboard";

interface AdminPlayersProps {
  data: any;
  lang: "en" | "ml";
  t: (key: any) => string;
  open: (kind: string, record: Row, fields: any[], help?: string) => void;
  playerFields: any[];
}

export function AdminPlayers({
  data,
  lang,
  t,
  open,
  playerFields,
}: AdminPlayersProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>("all");
  const [search, setSearch] = useState("");

  const teams = (data.teams ?? []) as Row[];
  const players = (data.players ?? []) as Row[];

  // Filter players by search query
  const filteredPlayers = useMemo(() => {
    if (!search.trim()) return players;
    const q = search.trim().toLowerCase();
    return players.filter((p) => {
      const matchNameEn = p.name_en?.toLowerCase().includes(q);
      const matchNameMl = p.name_ml?.toLowerCase().includes(q);
      const matchNumber = String(p.shirt_number ?? "").includes(q);
      const matchTeamEn = p.team_en?.toLowerCase().includes(q);
      const matchTeamMl = p.team_ml?.toLowerCase().includes(q);
      return matchNameEn || matchNameMl || matchNumber || matchTeamEn || matchTeamMl;
    });
  }, [players, search]);

  // Group filtered players by team
  const teamsWithPlayers = useMemo(() => {
    const list =
      selectedTeamId === "all"
        ? teams
        : teams.filter((t) => t.id === selectedTeamId);

    return list.map((team) => {
      const teamPlayers = filteredPlayers
        .filter((p) => p.team_id === team.id)
        .sort((a, b) => {
          if (a.shirt_number != null && b.shirt_number != null) {
            return Number(a.shirt_number) - Number(b.shirt_number);
          }
          if (a.shirt_number != null) return -1;
          if (b.shirt_number != null) return 1;
          return (a.name_en ?? "").localeCompare(b.name_en ?? "");
        });
      return { team, players: teamPlayers };
    });
  }, [teams, filteredPlayers, selectedTeamId]);

  // Count players per team for filter tabs
  const teamCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of players) {
      if (p.team_id) {
        map.set(p.team_id, (map.get(p.team_id) || 0) + 1);
      }
    }
    return map;
  }, [players]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Top Header / Actions */}
      <div className="section-heading" style={{ flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h2 style={{ margin: 0 }}>{t("players")}</h2>
          <span
            style={{
              padding: "3px 10px",
              background: "#eaf1ff",
              color: "var(--blue)",
              fontWeight: 800,
              fontSize: "12px",
              borderRadius: "999px",
            }}
          >
            {players.length} {lang === "ml" ? "കളിക്കാർ" : "Players"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginLeft: "auto", flexWrap: "wrap" }}>
          {/* Search box */}
          <div style={{ position: "relative", minWidth: "220px" }}>
            <Search
              size={15}
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted)",
              }}
            />
            <input
              type="text"
              placeholder={lang === "ml" ? "കളിക്കാരെയോ ജേഴ്സി നമ്പറോ തിരയുക..." : "Search player or shirt #..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                paddingLeft: "32px",
                paddingRight: "10px",
                paddingTop: "7px",
                paddingBottom: "7px",
                fontSize: "13px",
                borderRadius: "8px",
                width: "100%",
              }}
            />
          </div>

          {/* Create Button */}
          <button
            className="button primary"
            onClick={() =>
              open(
                "players",
                {
                  active: true,
                  shirt_number: null,
                  team_id: selectedTeamId !== "all" ? selectedTeamId : teams[0]?.id,
                },
                playerFields,
                t("playerHelp")
              )
            }
          >
            <Plus size={17} />
            {t("create")}
          </button>
        </div>
      </div>

      {/* Team Filter Pills / Categories */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          paddingBottom: "6px",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          onClick={() => setSelectedTeamId("all")}
          style={{
            padding: "8px 14px",
            borderRadius: "8px",
            border: selectedTeamId === "all" ? "2px solid var(--navy)" : "1px solid var(--line)",
            background: selectedTeamId === "all" ? "var(--navy)" : "#fff",
            color: selectedTeamId === "all" ? "#fff" : "var(--navy)",
            fontWeight: 700,
            fontSize: "13px",
            cursor: "pointer",
            whiteSpace: "nowrap",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>{lang === "ml" ? "എല്ലാ ടീമുകളും" : "All Teams"}</span>
          <span
            style={{
              fontSize: "11px",
              padding: "2px 6px",
              borderRadius: "999px",
              background: selectedTeamId === "all" ? "rgba(255,255,255,0.2)" : "#f0f4fa",
              color: selectedTeamId === "all" ? "#fff" : "var(--muted)",
            }}
          >
            {players.length}
          </span>
        </button>

        {teams.map((team) => {
          const isSelected = selectedTeamId === team.id;
          const count = teamCounts.get(team.id) || 0;
          return (
            <button
              key={team.id}
              type="button"
              onClick={() => setSelectedTeamId(team.id)}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: isSelected ? "2px solid var(--navy)" : "1px solid var(--line)",
                background: isSelected ? "var(--navy)" : "#fff",
                color: isSelected ? "#fff" : "var(--navy)",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {team.badge ? (
                <img
                  src={team.badge}
                  alt=""
                  style={{ width: "18px", height: "18px", objectFit: "contain" }}
                />
              ) : null}
              <span>{localized(team, "name", lang)}</span>
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 6px",
                  borderRadius: "999px",
                  background: isSelected ? "rgba(255,255,255,0.2)" : "#f0f4fa",
                  color: isSelected ? "#fff" : "var(--muted)",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Team Groups with Compact Tables */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {teamsWithPlayers.map(({ team, players: teamPlayers }) => (
          <section key={team.id} className="panel table-panel" style={{ padding: 0 }}>
            {/* Team Category Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 20px",
                background: "#f8faff",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {team.badge ? (
                  <img
                    src={team.badge}
                    alt=""
                    style={{ width: "32px", height: "32px", objectFit: "contain" }}
                  />
                ) : (
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "6px",
                      background: "#eaf1ff",
                      display: "grid",
                      placeItems: "center",
                      color: "var(--blue)",
                    }}
                  >
                    <Shield size={18} />
                  </div>
                )}
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800 }}>
                    {localized(team, "name", lang)}
                  </h3>
                  <small style={{ color: "var(--muted)", fontSize: "12px" }}>
                    {team.name_en !== team.name_ml ? `${team.name_en} · ` : ""}
                    {teamPlayers.length} {lang === "ml" ? "കളിക്കാർ" : "players"}
                  </small>
                </div>
              </div>

              <button
                type="button"
                className="button secondary small"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px" }}
                onClick={() =>
                  open(
                    "players",
                    { active: true, shirt_number: null, team_id: team.id },
                    playerFields,
                    t("playerHelp")
                  )
                }
              >
                <Plus size={14} />
                {lang === "ml" ? "കളിക്കാരനെ ചേർക്കുക" : "Add Player"}
              </button>
            </div>

            {/* Compact Table */}
            {teamPlayers.length > 0 ? (
              <div className="table-wrap">
                <table style={{ margin: 0 }}>
                  <thead>
                    <tr style={{ background: "#fafcff", borderBottom: "1px solid var(--line)" }}>
                      <th style={{ width: "65px", padding: "10px 16px", fontSize: "11px", textTransform: "uppercase" }}>#</th>
                      <th style={{ padding: "10px 16px", fontSize: "11px", textTransform: "uppercase" }}>
                        {lang === "ml" ? "കളിക്കാരൻ" : "Player"}
                      </th>
                      <th style={{ width: "130px", padding: "10px 16px", fontSize: "11px", textTransform: "uppercase" }}>
                        {lang === "ml" ? "സ്റ്റാറ്റസ്" : "Status"}
                      </th>
                      <th style={{ width: "90px", padding: "10px 16px", textAlign: "right" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamPlayers.map((player) => (
                      <tr
                        key={player.id}
                        style={{
                          borderBottom: "1px solid #edf1f6",
                          transition: "background 0.15s",
                        }}
                      >
                        <td style={{ padding: "10px 16px" }}>
                          <span
                            style={{
                              display: "inline-grid",
                              placeItems: "center",
                              width: "28px",
                              height: "28px",
                              borderRadius: "6px",
                              background: player.shirt_number ? "#e9f0ff" : "#f1f4f9",
                              color: player.shirt_number ? "var(--blue)" : "var(--muted)",
                              fontWeight: 800,
                              fontSize: "12px",
                            }}
                          >
                            {player.shirt_number ?? "—"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <strong style={{ fontSize: "14px", color: "var(--navy)" }}>
                              {localized(player, "name", lang)}
                            </strong>
                            {player.name_ml && player.name_en !== player.name_ml && (
                              <span style={{ color: "var(--muted)", fontSize: "12px" }}>
                                ({lang === "ml" ? player.name_en : player.name_ml})
                              </span>
                            )}
                            {!player.name_ml && (
                              <span
                                title={t("translationWarning")}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                  color: "#d97706",
                                  fontSize: "11px",
                                }}
                              >
                                <AlertTriangle size={13} />
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "10px 16px" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "3px 8px",
                              borderRadius: "4px",
                              fontSize: "11px",
                              fontWeight: 700,
                              background: player.active ? "#e8f5ee" : "#f1f3f7",
                              color: player.active ? "#2a7953" : "var(--muted)",
                            }}
                          >
                            {player.active ? "✓ " + t("active") : "— Inactive"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right" }}>
                          <button
                            type="button"
                            className="button secondary small"
                            style={{ padding: "4px 10px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                            onClick={() => open("players", player, playerFields, t("playerHelp"))}
                          >
                            <Pencil size={12} />
                            {t("edit")}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: "24px 20px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
                {search
                  ? (lang === "ml" ? "തിരഞ്ഞ കളിക്കാരെ കണ്ടെത്താനായില്ല." : "No players match the search.")
                  : (lang === "ml" ? "ഈ ടീമിൽ കളിക്കാരെ ചേർത്തിട്ടില്ല." : "No players added for this team yet.")}
              </div>
            )}
          </section>
        ))}

        {teamsWithPlayers.length === 0 && (
          <div className="panel" style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
            {lang === "ml" ? "കളിക്കാരെ കണ്ടെത്താനായില്ല." : "No players found."}
          </div>
        )}
      </div>
    </div>
  );
}
