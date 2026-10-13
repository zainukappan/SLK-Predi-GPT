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
        await document.fonts.load('800 32px "DM Sans"');
        await document.fonts.load('900 48px "DM Sans"');
        await document.fonts.load('700 28px "Noto Sans Malayalam"');
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

      const displayRows = rows.slice(0, 6);
      const teamBadges = await Promise.all(
        displayRows.map((r) => loadBadge(r.badge))
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
      ctx.font = '900 25px "DM Sans", sans-serif';
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
      ctx.font = '900 54px "DM Sans", sans-serif';
      ctx.fillText("POINTS TABLE", 540, 212);

      ctx.fillStyle = "#ffda28";
      ctx.font = '800 24px "Noto Sans Malayalam", "DM Sans", sans-serif';
      ctx.fillText("പോയിന്റ് പട്ടിക", 540, 250);

      // 3. Dynamic Snug Table Layout & Off-White Theme
      const allForms = displayRows.map((r) => form(r.team_id));
      const maxFormCount = Math.max(1, ...allForms.map((f) => f.length));

      // Scale form circles based on how many matches have been played (up to 10)
      const circleRadius = maxFormCount <= 5 ? 17 : maxFormCount <= 7 ? 14 : 11.5;
      const circleDiameter = circleRadius * 2;
      const circleGap = maxFormCount <= 5 ? 6 : maxFormCount <= 7 ? 5 : 3.5;

      const formStripMaxW =
        maxFormCount * circleDiameter + Math.max(0, maxFormCount - 1) * circleGap;
      const formColWidth = Math.max(116, formStripMaxW);

      // Relative X positions inside table
      const colRank = 44;
      const colClubLogo = 82;
      const colClubText = 140;
      const colP = 278;
      const statStep = 54;
      const colW = colP + statStep * 1;
      const colPW = colP + statStep * 2;
      const colPL = colP + statStep * 3;
      const colL = colP + statStep * 4;
      const colGF = colP + statStep * 5;
      const colGA = colP + statStep * 6;
      const colGD = colP + statStep * 7;
      const colPts = colGD + 62;
      const colFormLeft = colPts + 44;
      const colFormRight = colFormLeft + formColWidth;

      const tableW = Math.min(1040, colFormRight + 28);
      const tableX = Math.round((1080 - tableW) / 2);
      const tableY = 278;
      const headH = 72;
      const rowH = 115;
      const tableH = headH + rowH * displayRows.length;

      // Draw Table Drop Shadow & Clipped Off-White Container
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
      ctx.shadowBlur = 32;
      ctx.shadowOffsetY = 12;
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.roundRect(tableX, tableY, tableW, tableH, 24);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(tableX, tableY, tableW, tableH, 24);
      ctx.clip();

      // Table Header Background (Cool Slate Off-White)
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(tableX, tableY, tableW, headH);

      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tableX, tableY + headH);
      ctx.lineTo(tableX + tableW, tableY + headH);
      ctx.stroke();

      // Header Labels (Larger 22px Bold Font)
      const headTextY = tableY + 44;
      ctx.font = '900 22px "DM Sans", sans-serif';
      ctx.fillStyle = "#334155";

      ctx.textAlign = "center";
      ctx.fillText("#", tableX + colRank, headTextY);

      ctx.textAlign = "left";
      ctx.fillText("CLUB", tableX + colClubLogo, headTextY);

      ctx.textAlign = "center";
      ctx.fillText("P", tableX + colP, headTextY);
      ctx.fillText("W", tableX + colW, headTextY);
      ctx.fillText("PW", tableX + colPW, headTextY);
      ctx.fillText("PL", tableX + colPL, headTextY);
      ctx.fillText("L", tableX + colL, headTextY);
      ctx.fillText("GF", tableX + colGF, headTextY);
      ctx.fillText("GA", tableX + colGA, headTextY);
      ctx.fillText("GD", tableX + colGD, headTextY);

      ctx.fillStyle = "#0c49cb";
      ctx.font = '900 23px "DM Sans", sans-serif';
      ctx.fillText("PTS", tableX + colPts, headTextY);

      ctx.fillStyle = "#334155";
      ctx.font = '900 21px "DM Sans", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText("LAST 10", tableX + colFormLeft + formColWidth / 2, headTextY);

      // Render Each Team Row
      const rowStartY = tableY + headH;

      displayRows.forEach((r, idx) => {
        const y = rowStartY + idx * rowH;
        const centerY = y + rowH / 2;
        const pos = idx + 1;

        // Off-White Row Background & Left Accent Strip
        if (pos === 1) {
          ctx.fillStyle = "#fff7cf";
          ctx.fillRect(tableX, y, tableW, rowH);
          ctx.fillStyle = "#e6b900";
          ctx.fillRect(tableX, y, 8, rowH);
        } else if (pos <= 4) {
          ctx.fillStyle = "#edf7ff";
          ctx.fillRect(tableX, y, tableW, rowH);
          ctx.fillStyle = "#2563eb";
          ctx.fillRect(tableX, y, 8, rowH);
        } else {
          ctx.fillStyle = idx % 2 === 0 ? "#f8fafc" : "#f1f5f9";
          ctx.fillRect(tableX, y, tableW, rowH);
        }

        // Row bottom divider
        if (idx < displayRows.length - 1) {
          ctx.strokeStyle = "#dbe3ef";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(tableX, y + rowH);
          ctx.lineTo(tableX + tableW, y + rowH);
          ctx.stroke();
        }

        // Position Badge (Larger 40x40, 24px font)
        ctx.textAlign = "center";
        const badgeSize = 40;
        const badgeCenterX = tableX + colRank;
        const badgeTopY = centerY - badgeSize / 2;

        ctx.fillStyle =
          pos === 1 ? "#ffda28" : pos <= 4 ? "#2563eb" : "#e2e8f0";
        ctx.beginPath();
        ctx.roundRect(
          badgeCenterX - badgeSize / 2,
          badgeTopY,
          badgeSize,
          badgeSize,
          10
        );
        ctx.fill();

        if (pos === 1) {
          ctx.strokeStyle = "#e5b900";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        ctx.fillStyle = pos === 1 ? "#071432" : pos <= 4 ? "#ffffff" : "#1e293b";
        ctx.font = '900 24px "DM Sans", sans-serif';
        ctx.fillText(String(pos), badgeCenterX, centerY + 8);

        // Club Logo Circle (Larger 48x48 on crisp white circle)
        const badgeImg = teamBadges[idx];
        const iconSize = 48;
        const iconX = tableX + colClubLogo;
        const iconY = centerY - iconSize / 2;

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(iconX + iconSize / 2, centerY, iconSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (badgeImg && badgeImg.complete && badgeImg.naturalWidth > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(iconX + iconSize / 2, centerY, iconSize / 2 - 3, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(badgeImg, iconX + 4, iconY + 4, iconSize - 8, iconSize - 8);
          ctx.restore();
        }

        // Short Code (CFC, KWFC, etc. - Larger 29px Deep Navy)
        ctx.textAlign = "left";
        ctx.fillStyle = "#071a3d";
        ctx.font = '900 29px "DM Sans", sans-serif';
        ctx.fillText(getTeamShort(r), tableX + colClubText, centerY + 10);

        // Stat Numbers (Larger 27px Dark Slate-Navy)
        ctx.textAlign = "center";
        ctx.font = '800 27px "DM Sans", sans-serif';
        ctx.fillStyle = "#1e293b";

        ctx.fillText(String(r.played), tableX + colP, centerY + 9);
        ctx.fillText(String(r.regulation_wins), tableX + colW, centerY + 9);
        ctx.fillText(String(r.shootout_wins), tableX + colPW, centerY + 9);
        ctx.fillText(String(r.shootout_losses), tableX + colPL, centerY + 9);
        ctx.fillText(String(r.regulation_losses), tableX + colL, centerY + 9);
        ctx.fillText(String(r.goals_for), tableX + colGF, centerY + 9);
        ctx.fillText(String(r.goals_against), tableX + colGA, centerY + 9);

        // Goal Difference with semantic color
        const gd = Number(r.goal_difference);
        ctx.font = '900 27px "DM Sans", sans-serif';
        ctx.fillStyle = gd > 0 ? "#077a3e" : gd < 0 ? "#c81e2b" : "#475569";
        ctx.fillText(gd > 0 ? `+${gd}` : String(gd), tableX + colGD, centerY + 9);

        // Points (Highlighted Larger 34px Royal Blue)
        ctx.font = '900 34px "DM Sans", sans-serif';
        ctx.fillStyle = "#0c49cb";
        ctx.fillText(String(r.points), tableX + colPts, centerY + 11);

        // Form Circles (Last 10)
        const recentCodes = allForms[idx];
        if (recentCodes.length > 0) {
          const rowFormW =
            recentCodes.length * circleDiameter +
            Math.max(0, recentCodes.length - 1) * circleGap;
          let startCircleX =
            tableX +
            colFormLeft +
            (formColWidth - rowFormW) / 2 +
            circleRadius;

          recentCodes.forEach((code) => {
            ctx.beginPath();
            ctx.arc(startCircleX, centerY, circleRadius, 0, Math.PI * 2);

            let circleBg = "#079447";
            let circleText = "#ffffff";
            let circleBorder = "";
            if (code === "PW") {
              circleBg = "#bcefd0";
              circleText = "#075d32";
              circleBorder = "#52b77a";
            } else if (code === "PL") {
              circleBg = "#ffd7dc";
              circleText = "#962638";
              circleBorder = "#e58895";
            } else if (code === "L") {
              circleBg = "#d3202f";
              circleText = "#ffffff";
            }

            ctx.fillStyle = circleBg;
            ctx.fill();

            if (circleBorder) {
              ctx.strokeStyle = circleBorder;
              ctx.lineWidth = 1.5;
              ctx.stroke();
            }

            ctx.textAlign = "center";
            ctx.fillStyle = circleText;
            const fontSize =
              circleRadius >= 16
                ? code.length === 2
                  ? 13
                  : 15
                : code.length === 2
                ? 10.5
                : 12.5;
            ctx.font = `900 ${fontSize}px "DM Sans", sans-serif`;
            ctx.fillText(code, startCircleX, centerY + fontSize * 0.35);

            startCircleX += circleDiameter + circleGap;
          });
        } else {
          ctx.textAlign = "center";
          ctx.font = '700 22px "DM Sans", sans-serif';
          ctx.fillStyle = "#94a3b8";
          ctx.fillText("—", tableX + colFormLeft + formColWidth / 2, centerY + 8);
        }
      });

      ctx.restore();

      // Crisp border around the off-white table
      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(tableX, tableY, tableW, tableH, 24);
      ctx.stroke();

      // 4. Legend Info Below Table
      const legendY = tableY + tableH + 42;
      ctx.textAlign = "left";

      // 1st Shield
      ctx.fillStyle = "#ffda28";
      ctx.beginPath();
      ctx.roundRect(tableX + 6, legendY - 15, 18, 18, 4);
      ctx.fill();
      ctx.fillStyle = "#e2e8f0";
      ctx.font = '700 18px "DM Sans", sans-serif';
      ctx.fillText("1st: Shield Winner", tableX + 32, legendY);

      // Semi-finalists
      ctx.fillStyle = "#3b82f6";
      ctx.beginPath();
      ctx.roundRect(tableX + 225, legendY - 15, 18, 18, 4);
      ctx.fill();
      ctx.fillStyle = "#e2e8f0";
      ctx.fillText("1–4: Semi-finals", tableX + 251, legendY);

      // Rules text
      ctx.textAlign = "right";
      ctx.fillStyle = "#cbd5e1";
      ctx.font = '600 17px "DM Sans", sans-serif';
      ctx.fillText(
        "3 Pts: Win · 2 Pts: PW · 1 Pt: PL · 0 Pts: Loss",
        tableX + tableW - 6,
        legendY
      );

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
            text: "Super League Kerala standings via Soccer Blues of Keralam",
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
