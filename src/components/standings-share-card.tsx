"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Share2, X } from "lucide-react";
import type { Row } from "@/lib/db";
import { ErrorMessage, useLanguage } from "./provider";

const teamShortCodes: Record<string, string> = {
  calicut: "CFC",
  kochi: "FKFC",
  forca: "FKFC",
  kannur: "KWFC",
  malappuram: "MFC",
  mallapuram: "MFC",
  komban: "TKFC",
  trivandrum: "TKFC",
  thiruvananthapuram: "TKFC",
  thrissur: "TMFC",
  magic: "TMFC",
};

function getTeamShort(row: Row): string {
  const name = (row.name_en || row.short_name || "").toLowerCase();
  for (const [key, code] of Object.entries(teamShortCodes)) {
    if (name.includes(key)) return code;
  }
  return String(row.short_name || row.name_en || "CLUB").slice(0, 4).toUpperCase();
}

function shareCardBadge(source: unknown) {
  if (typeof source !== "string" || !source) return "";
  const file = source.split("/").pop()?.toLowerCase() ?? "";
  if (file.includes("calicut")) return "/team-badges/calicut.webp";
  if (file.includes("kochi") || file.includes("forca")) return "/team-badges/kochi.webp";
  if (file.includes("kannur")) return "/team-badges/kannur.webp";
  if (file.includes("malappuram") || file.includes("mallapuram")) return "/team-badges/malappuram.webp";
  if (file.includes("komban") || file.includes("trivandrum") || file.includes("thiruvananthapuram"))
    return "/team-badges/kombans.webp";
  if (file.includes("thrissur") || file.includes("magic")) return "/team-badges/thrissur.webp";
  return source;
}

export function StandingsShareCard({
  rows,
  fixtures,
  onClose,
}: {
  rows: Row[];
  fixtures: Row[];
  onClose?: () => void;
}) {
  const { lang } = useLanguage();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const form = (teamId: string) =>
    fixtures
      .filter((f) => f.status === "finalized" && (f.home_id === teamId || f.away_id === teamId))
      .sort((a, b) => +new Date(b.kickoff) - +new Date(a.kickoff))
      .slice(0, 10)
      .map((f) => {
        const home = f.home_id === teamId;
        const forGoals = Number(home ? f.home_goals : f.away_goals);
        const against = Number(home ? f.away_goals : f.home_goals);
        const code =
          forGoals > against
            ? "W"
            : forGoals < against
            ? "L"
            : f.shootout_winner === (home ? "home" : "away")
            ? "PW"
            : "PL";
        return code;
      });

  useEffect(() => {
    let cancelled = false;
    setReady(false);

    (async () => {
      await document.fonts.ready;
      try {
        await document.fonts.load('700 32px "DM Sans"');
        await document.fonts.load('900 48px "Barlow Condensed"');
      } catch {
        // Fallback font
      }

      // Load SLK white logo
      const slkLogo = new Image();
      slkLogo.crossOrigin = "anonymous";
      slkLogo.src = "/slk-logo-white.webp";
      try {
        await slkLogo.decode();
      } catch {
        // Continue even if logo fails
      }

      // Load SBK logo
      const sbkLogo = new Image();
      sbkLogo.crossOrigin = "anonymous";
      sbkLogo.src = "/sbk-logo.png";
      try {
        await sbkLogo.decode();
      } catch {
        // Continue even if logo fails
      }

      // Load team badges
      const loadBadge = async (source: unknown) => {
        if (typeof source !== "string" || !source) return null;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = shareCardBadge(source);
        try {
          await img.decode();
          return img;
        } catch {
          return null;
        }
      };

      const teamBadges = await Promise.all(
        rows.map((r) => loadBadge(r.badge))
      );

      if (cancelled || !canvas.current) return;
      const c = canvas.current;
      const ctx = c.getContext("2d")!;
      c.width = 1080;
      c.height = 1350;

      // 1. Background Gradient
      const bg = ctx.createLinearGradient(0, 0, 1080, 1350);
      bg.addColorStop(0, "#06122d");
      bg.addColorStop(0.4, "#0e2972");
      bg.addColorStop(0.85, "#061435");
      bg.addColorStop(1, "#030a1c");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 1080, 1350);

      // Subtle diagonal lines texture
      ctx.strokeStyle = "rgba(255, 255, 255, 0.035)";
      ctx.lineWidth = 2;
      for (let x = -800; x < 1800; x += 85) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 850, 1350);
        ctx.stroke();
      }

      // Top Gold Accent Bar
      const goldBar = ctx.createLinearGradient(0, 0, 1080, 0);
      goldBar.addColorStop(0, "#eab308");
      goldBar.addColorStop(0.5, "#ffda28");
      goldBar.addColorStop(1, "#eab308");
      ctx.fillStyle = goldBar;
      ctx.fillRect(0, 0, 1080, 14);

      // 2. Header Area
      // SLK Logo Icon Badge
      const logoBoxX = 55;
      const logoBoxY = 48;
      const logoBoxSize = 90;

      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.beginPath();
      ctx.roundRect(logoBoxX, logoBoxY, logoBoxSize, logoBoxSize, 20);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (slkLogo.complete && slkLogo.naturalWidth > 0) {
        ctx.drawImage(slkLogo, logoBoxX + 12, logoBoxY + 12, 66, 66);
      }

      // SLK Title
      ctx.textAlign = "left";
      ctx.fillStyle = "#ffda28";
      ctx.font = '900 24px "DM Sans", sans-serif';
      ctx.fillText("SUPER LEAGUE KERALA", 165, 88);

      ctx.fillStyle = "#c9d6ff";
      ctx.font = '700 20px "DM Sans", sans-serif';
      ctx.fillText("2026 SEASON · STANDINGS", 165, 118);

      // Date & Time Pill (Right side)
      const now = new Date();
      const dateStr = now
        .toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          timeZone: "Asia/Kolkata",
        })
        .toUpperCase();
      const timeStr = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      });
      const dateTimeText = `${dateStr} · ${timeStr}`;

      ctx.font = '800 18px "DM Sans", sans-serif';
      const pillWidth = ctx.measureText(dateTimeText).width + 44;
      const pillX = 1080 - 55 - pillWidth;
      const pillY = 68;

      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillWidth, 48, 24);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#ffda28";
      ctx.textAlign = "center";
      ctx.fillText(dateTimeText, pillX + pillWidth / 2, pillY + 31);

      // Main Big Titles
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.font = '900 52px "DM Sans", sans-serif';
      ctx.fillText("POINTS TABLE", 540, 215);

      ctx.fillStyle = "#ffda28";
      ctx.font = '800 22px "DM Sans", sans-serif';
      ctx.fillText("പോയിന്റ് പട്ടിക", 540, 252);

      // 3. Standings Table Container
      const tableX = 50;
      const tableY = 285;
      const tableW = 980;
      const tableH = 750;

      ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
      ctx.beginPath();
      ctx.roundRect(tableX, tableY, tableW, tableH, 26);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Table Header
      const headY = tableY + 54;
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.fillRect(tableX, tableY, tableW, 64);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.beginPath();
      ctx.moveTo(tableX, tableY + 64);
      ctx.lineTo(tableX + tableW, tableY + 64);
      ctx.stroke();

      ctx.font = '900 18px "DM Sans", sans-serif';
      ctx.fillStyle = "#a8c0f0";

      // Column headers
      ctx.textAlign = "center";
      ctx.fillText("#", 88, headY);

      ctx.textAlign = "left";
      ctx.fillText("CLUB", 135, headY);

      ctx.textAlign = "center";
      ctx.fillText("P", 305, headY);
      ctx.fillText("W", 355, headY);
      ctx.fillText("PW", 410, headY);
      ctx.fillText("PL", 465, headY);
      ctx.fillText("L", 520, headY);
      ctx.fillText("GF", 575, headY);
      ctx.fillText("GA", 630, headY);
      ctx.fillText("GD", 685, headY);

      ctx.fillStyle = "#ffda28";
      ctx.fillText("PTS", 745, headY);

      ctx.fillStyle = "#a8c0f0";
      ctx.textAlign = "right";
      ctx.fillText("LAST 10", 995, headY);

      // Render Rows
      const rowStartY = tableY + 64;
      const rowHeight = (tableH - 64) / 6;

      rows.slice(0, 6).forEach((r, idx) => {
        const y = rowStartY + idx * rowHeight;
        const centerY = y + rowHeight / 2;
        const pos = idx + 1;

        // Row background
        if (pos === 1) {
          ctx.fillStyle = "rgba(255, 218, 40, 0.14)";
          ctx.fillRect(tableX, y, tableW, rowHeight);
        } else if (pos <= 4) {
          ctx.fillStyle = "rgba(20, 80, 223, 0.1)";
          ctx.fillRect(tableX, y, tableW, rowHeight);
        }

        // Row bottom divider
        if (idx < 5) {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
          ctx.beginPath();
          ctx.moveTo(tableX, y + rowHeight);
          ctx.lineTo(tableX + tableW, y + rowHeight);
          ctx.stroke();
        }

        // Pos Badge
        ctx.textAlign = "center";
        const badgeSize = 34;
        const badgeX = 88;
        const badgeY = centerY - badgeSize / 2;

        ctx.fillStyle = pos === 1 ? "#ffda28" : pos <= 4 ? "#3b82f6" : "rgba(255,255,255,0.2)";
        ctx.beginPath();
        ctx.roundRect(badgeX - badgeSize / 2, badgeY, badgeSize, badgeSize, 8);
        ctx.fill();

        ctx.fillStyle = pos <= 4 ? "#071432" : "#ffffff";
        ctx.font = '900 19px "DM Sans", sans-serif';
        ctx.fillText(String(pos), badgeX, centerY + 7);

        // Club Badge & Short Name
        const badgeImg = teamBadges[idx];
        const iconSize = 38;
        const iconX = 135;
        const iconY = centerY - iconSize / 2;

        ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
        ctx.beginPath();
        ctx.arc(iconX + iconSize / 2, centerY, iconSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
        ctx.lineWidth = 1;
        ctx.stroke();

        if (badgeImg && badgeImg.complete && badgeImg.naturalWidth > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(iconX + iconSize / 2, centerY, iconSize / 2 - 2, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(badgeImg, iconX + 2, iconY + 2, iconSize - 4, iconSize - 4);
          ctx.restore();
        }

        // Short Code (CFC, KWFC, etc.)
        ctx.textAlign = "left";
        ctx.fillStyle = "#ffffff";
        ctx.font = '900 24px "DM Sans", sans-serif';
        ctx.fillText(getTeamShort(r), iconX + iconSize + 12, centerY + 8);

        // Stat numbers
        ctx.textAlign = "center";
        ctx.font = '700 21px "DM Sans", sans-serif';
        ctx.fillStyle = "#e2e8f0";

        ctx.fillText(String(r.played), 305, centerY + 7);
        ctx.fillText(String(r.regulation_wins), 355, centerY + 7);
        ctx.fillText(String(r.shootout_wins), 410, centerY + 7);
        ctx.fillText(String(r.shootout_losses), 465, centerY + 7);
        ctx.fillText(String(r.regulation_losses), 520, centerY + 7);
        ctx.fillText(String(r.goals_for), 575, centerY + 7);
        ctx.fillText(String(r.goals_against), 630, centerY + 7);

        const gd = Number(r.goal_difference);
        ctx.fillText(gd > 0 ? `+${gd}` : String(gd), 685, centerY + 7);

        // Points (Highlighted)
        ctx.font = '900 28px "DM Sans", sans-serif';
        ctx.fillStyle = "#ffda28";
        ctx.fillText(String(r.points), 745, centerY + 9);

        // Form Circles (Last 10)
        const recentCodes = form(r.team_id);
        const circleRadius = 14;
        const circleDiameter = circleRadius * 2;
        const circleGap = 7;
        const totalFormWidth = recentCodes.length * circleDiameter + (recentCodes.length - 1) * circleGap;
        let startCircleX = 995 - totalFormWidth + circleRadius;

        recentCodes.forEach((code) => {
          ctx.beginPath();
          ctx.arc(startCircleX, centerY, circleRadius, 0, Math.PI * 2);

          let circleBg = "#079447";
          let circleText = "#ffffff";
          if (code === "PW") {
            circleBg = "#73ce98";
            circleText = "#075d32";
          } else if (code === "PL") {
            circleBg = "#ffd7dc";
            circleText = "#962638";
          } else if (code === "L") {
            circleBg = "#d3202f";
            circleText = "#ffffff";
          }

          ctx.fillStyle = circleBg;
          ctx.fill();

          ctx.textAlign = "center";
          ctx.fillStyle = circleText;
          ctx.font = `900 ${code.length === 2 ? 11 : 13}px "DM Sans", sans-serif`;
          ctx.fillText(code, startCircleX, centerY + 4.5);

          startCircleX += circleDiameter + circleGap;
        });

        if (recentCodes.length === 0) {
          ctx.textAlign = "right";
          ctx.font = '700 18px "DM Sans", sans-serif';
          ctx.fillStyle = "rgba(255,255,255,0.4)";
          ctx.fillText("—", 995, centerY + 7);
        }
      });

      // 4. Legend Info Below Table
      const legendY = tableY + tableH + 42;
      ctx.textAlign = "left";

      // 1st Shield
      ctx.fillStyle = "#ffda28";
      ctx.beginPath();
      ctx.roundRect(58, legendY - 14, 16, 16, 4);
      ctx.fill();
      ctx.fillStyle = "#c9d6ff";
      ctx.font = '700 17px "DM Sans", sans-serif';
      ctx.fillText("1st: Shield Winner", 84, legendY);

      // Semi-finalists
      ctx.fillStyle = "#3b82f6";
      ctx.beginPath();
      ctx.roundRect(260, legendY - 14, 16, 16, 4);
      ctx.fill();
      ctx.fillStyle = "#c9d6ff";
      ctx.fillText("1–4: Semi-finals", 286, legendY);

      // Rules text
      ctx.textAlign = "right";
      ctx.fillStyle = "#94a3b8";
      ctx.font = '600 16px "DM Sans", sans-serif';
      ctx.fillText("3 Pts: Win · 2 Pts: PW · 1 Pt: PL · 0 Pts: Loss", 1022, legendY);

      // 5. Footer Branding
      const footerY = 1205;
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.fillRect(0, footerY, 1080, 145);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.beginPath();
      ctx.moveTo(0, footerY);
      ctx.lineTo(1080, footerY);
      ctx.stroke();

      // SBK Logo in Footer
      const sbkFooterSize = 64;
      if (sbkLogo.complete && sbkLogo.naturalWidth > 0) {
        ctx.drawImage(sbkLogo, 55, footerY + 40, sbkFooterSize, sbkFooterSize);
      }

      ctx.textAlign = "left";
      ctx.fillStyle = "#ffffff";
      ctx.font = '900 24px "DM Sans", sans-serif';
      ctx.fillText("SOCCER BLUES OF KERALAM", 135, footerY + 65);

      ctx.fillStyle = "#93c5fd";
      ctx.font = '600 18px "DM Sans", sans-serif';
      ctx.fillText("Fans predict. Football unites.", 135, footerY + 95);

      ctx.textAlign = "right";
      ctx.fillStyle = "#ffda28";
      ctx.font = '800 22px "DM Sans", sans-serif';
      ctx.fillText("sbkpredictions.vercel.app", 1025, footerY + 65);

      ctx.fillStyle = "#94a3b8";
      ctx.font = '600 17px "DM Sans", sans-serif';
      ctx.fillText("Join the Prediction Contest", 1025, footerY + 95);

      setReady(true);
    })().catch(() => {
      if (!cancelled) setError("Failed to generate graphics card");
    });

    return () => {
      cancelled = true;
    };
  }, [fixtures, rows, lang]);

  async function save(share: boolean) {
    setError("");
    setMessage("");
    try {
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.current?.toBlob((b) => (b ? resolve(b) : reject(new Error())), "image/png")
      );
      const file = new File([blob], "SLK-Standings-SBK.png", { type: "image/png" });

      if (share && typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: "Super League Kerala - Points Table",
            text: "Super League Kerala official standings via Soccer Blues of Keralam",
          });
          setMessage("Shared successfully!");
          return;
        } catch (e) {
          if ((e as Error).name === "AbortError") {
            return;
          }
        }
      }

      // Download Fallback
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.name;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Downloaded successfully!");
    } catch {
      setError("Unable to download or share image.");
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(3, 10, 28, 0.82)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          background: "#071432",
          border: "1px solid rgba(255, 255, 255, 0.18)",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "480px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.6)",
          overflow: "hidden",
        }}
      >
        {/* Modal Top Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
          }}
        >
          <div style={{ color: "white" }}>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800 }}>
              {lang === "ml" ? "പോയിന്റ് പട്ടിക ഗ്രാഫിക്സ്" : "Standings Poster"}
            </h3>
            <small style={{ color: "#a8c0f0", fontSize: "11px" }}>
              {lang === "ml" ? "ഷെയർ / ഡൗൺലോഡ് ചെയ്യാം" : "Ready to share & download"}
            </small>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                border: "none",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                color: "white",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Canvas Display Container */}
        <div
          style={{
            padding: "16px",
            overflowY: "auto",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            background: "#040c1e",
          }}
        >
          <canvas
            ref={canvas}
            style={{
              width: "100%",
              maxWidth: "380px",
              height: "auto",
              aspectRatio: "1080 / 1350",
              borderRadius: "14px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              display: "block",
            }}
          />
        </div>

        {/* Action Buttons */}
        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid rgba(255, 255, 255, 0.12)",
            background: "#06122d",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              className="button primary"
              disabled={!ready}
              onClick={() => save(true)}
              style={{
                flex: 1,
                padding: "12px",
                fontSize: "14px",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                background: "var(--yellow)",
                color: "var(--navy)",
                borderRadius: "10px",
                cursor: "pointer",
              }}
            >
              <Share2 size={18} />
              <span>{lang === "ml" ? "ഷെയർ ചെയ്യുക" : "Share"}</span>
            </button>

            <button
              type="button"
              className="button secondary"
              disabled={!ready}
              onClick={() => save(false)}
              style={{
                flex: 1,
                padding: "12px",
                fontSize: "14px",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                background: "var(--blue)",
                color: "white",
                borderRadius: "10px",
                cursor: "pointer",
                border: "none",
              }}
            >
              <Download size={18} />
              <span>{lang === "ml" ? "ഡൗൺലോഡ്" : "Download"}</span>
            </button>
          </div>

          <ErrorMessage message={error} />
          {message && (
            <p
              style={{
                margin: 0,
                textAlign: "center",
                color: "#4ade80",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              ✓ {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
