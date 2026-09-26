"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Share2 } from "lucide-react";
import { ist, type Lang } from "@/lib/domain";
import type { Row } from "@/lib/db";
import { ErrorMessage, useLanguage } from "./provider";
import type { Key } from "@/lib/i18n";

const localized = (row: Row, prefix: string, lang: Lang) => row[prefix + "_" + lang] || row[prefix + "_en"];
const localBadges: Record<string, string> = {
  "calicut.webp": "/team-badges/calicut.webp",
  "kochi.webp": "/team-badges/kochi.webp",
  "kannur.webp": "/team-badges/kannur.webp",
  "mallapuram.webp": "/team-badges/malappuram.webp",
  "kombans.webp": "/team-badges/kombans.webp",
  "thrissur.webp": "/team-badges/thrissur.webp",
};

function shareCardBadge(source: unknown) {
  if (typeof source !== "string" || !source) return "";
  const file = source.split("/").pop()?.toLowerCase() ?? "";
  return localBadges[file] ?? source;
}

export type SavedPrediction = {
  home: number;
  away: number;
  winner: "home" | "draw" | "away";
  firstGoal: "home" | "away" | "nobody";
  savedAt?: string | null;
};

export function PredictionShareCard({ fixture, prediction, displayName, locked, demo }: {
  fixture: Row;
  prediction: SavedPrediction;
  displayName: string;
  locked: boolean;
  demo: boolean;
}) {
  const { t, lang } = useLanguage();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    (async () => {
      await document.fonts.ready;
      await document.fonts.load('700 32px "Noto Sans Malayalam"');
      await document.fonts.load('700 32px "DM Sans"');
      const logo = new Image();
      logo.src = "/sbk-logo.png";
      await logo.decode();
      const loadBadge = async (source: unknown) => {
        if (typeof source !== "string" || !source) return null;
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.src = shareCardBadge(source);
        try { await image.decode(); return image; } catch { return null; }
      };
      const [homeBadge, awayBadge] = await Promise.all([
        loadBadge(fixture.home_badge),
        loadBadge(fixture.away_badge),
      ]);
      if (cancelled || !canvas.current) return;
      const c = canvas.current, ctx = c.getContext("2d")!;
      const font = lang === "ml" ? '"Noto Sans Malayalam"' : '"DM Sans"';
      c.width = 1080; c.height = 1350;
      const bg = ctx.createLinearGradient(0, 0, 1080, 1350);
      bg.addColorStop(0, "#071432"); bg.addColorStop(.55, "#102b7b"); bg.addColorStop(1, "#071432");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, 1080, 1350);
      ctx.strokeStyle = "#ffffff10"; ctx.lineWidth = 2;
      for (let x = -650; x < 1600; x += 95) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 760, 1350); ctx.stroke(); }
      ctx.fillStyle = "#ffcf18"; ctx.fillRect(0, 0, 1080, 18);
      ctx.textAlign = "center";

      const fit = (value: string, maxWidth: number, start: number, min = 18) => {
        let size = start;
        while (size > min) { ctx.font = `700 ${size}px ${font}`; if (ctx.measureText(value).width <= maxWidth) break; size -= 2; }
        return size;
      };
      const write = (value: string, x: number, y: number, size: number, color = "#fff", weight = 700, maxWidth?: number) => {
        ctx.fillStyle = color; ctx.font = `${weight} ${size}px ${font}`; ctx.fillText(value, x, y, maxWidth);
      };
      const drawBadge = (image: HTMLImageElement | null, x: number, y: number, initials: string) => {
        if (image) {
          const scale = Math.min(160 / image.naturalWidth, 145 / image.naturalHeight);
          const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
          ctx.drawImage(image, x - width / 2, y - height / 2, width, height);
          return;
        }
        ctx.fillStyle = "#112f88"; ctx.beginPath(); ctx.arc(x, y, 65, 0, Math.PI * 2); ctx.fill();
        write(initials, x, y + 13, 35, "#ffcf18", 700, 100);
      };
      const homeName = localized(fixture, "home", lang), awayName = localized(fixture, "away", lang);
      const winner = prediction.winner === "home" ? homeName : prediction.winner === "away" ? awayName : t("draw");
      const firstGoal = prediction.firstGoal === "home" ? homeName : prediction.firstGoal === "away" ? awayName : t("nobody");

      ctx.drawImage(logo, 455, 45, 170, 170);
      write(lang === "ml" ? "എന്റെ പ്രവചനം" : "MY PREDICTION", 540, 246, 24, "#fff", 700, 900);
      write(displayName, 540, 310, fit(displayName, 850, 51, 28), "#ffcf18", 700, 880);
      write("SUPER LEAGUE KERALA", 540, 354, 27, "#fff", 700, 900);
      write("PREDICTION CONTEST", 540, 390, 27, "#fff", 700, 900);
      write(localized(fixture, "round", lang), 540, 428, 20, "#c9d6ff", 600, 900);
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.roundRect(60, 460, 960, 680, 38); ctx.fill();
      drawBadge(homeBadge, 285, 560, String(fixture.home_short ?? "H").slice(0, 3));
      drawBadge(awayBadge, 795, 560, String(fixture.away_short ?? "A").slice(0, 3));
      write("VS", 540, 570, 27, "#7a86a2");
      write(String(prediction.home), 395, 710, 108, "#112f88"); write("–", 540, 702, 62, "#9aa5bb"); write(String(prediction.away), 685, 710, 108, "#112f88");
      write(ist(fixture.kickoff, lang), 540, 762, 22, "#65718b", 600, 850);
      const cards = [["1", t("winnerQuestion"), winner], ["2", t("scoreQuestion"), `${prediction.home} – ${prediction.away}`], ["3", t("firstGoalQuestion"), firstGoal]];
      cards.forEach(([number, label, value], index) => {
        const x = 105 + index * 300;
        ctx.fillStyle = index === 1 ? "#fff6c5" : "#eef3ff"; ctx.beginPath(); ctx.roundRect(x, 810, 270, 275, 24); ctx.fill();
        ctx.fillStyle = "#ffcf18"; ctx.beginPath(); ctx.arc(x + 42, 852, 23, 0, Math.PI * 2); ctx.fill();
        write(number, x + 42, 861, 20, "#0b1d4b"); write(label, x + 135, 915, 19, "#66718b", 600, 235);
        write(value, x + 135, 1012, fit(value, 235, index === 1 ? 48 : 29), "#0b1d4b", 700, 235);
      });
      write(`${locked ? t("locked") : t("savedPrediction")} · ${ist(prediction.savedAt ?? new Date().toISOString(), lang)}`, 540, 1248, 20, "#c9d6ff", 600, 930);
      if (demo) write(t("sample"), 540, 1282, 19, "#ffcf18");
      write(t("tagline"), 540, 1318, 19, "#ffcf18", 700, 900);
      setReady(true);
    })().catch(() => { if (!cancelled) setError("networkError"); });
    return () => { cancelled = true; };
  }, [demo, displayName, fixture, lang, locked, prediction, t]);

  async function save(share: boolean) {
    setError(""); setMessage("");
    try {
      const blob = await new Promise<Blob>((resolve, reject) => canvas.current?.toBlob((value) => value ? resolve(value) : reject(new Error()), "image/png"));
      const file = new File([blob], "SBK-my-prediction.png", { type: "image/png" });
      if (share && navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], title: t("sharePrediction") }); setMessage("shareReady"); }
        catch (e) { if ((e as Error).name === "AbortError") setMessage("shareCancelled"); else throw e; }
        return;
      }
      const url = URL.createObjectURL(blob), anchor = document.createElement("a");
      anchor.href = url; anchor.download = file.name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      if (share) setMessage("downloadFallback");
    } catch { setError("networkError"); }
  }

  return <section className="prediction-share-panel">
    <div><h3>{t("sharePrediction")}</h3><p>{t("sharePredictionHelp")}</p></div>
    <canvas ref={canvas} className="prediction-canvas" aria-label={t("predictionCard")} role="img" />
    <div className="button-row">
      <button className="button primary" disabled={!ready} onClick={() => save(true)}><Share2 size={18} />{t("sharePrediction")}</button>
      <button className="button secondary" disabled={!ready} onClick={() => save(false)}><Download size={18} />{t("download")}</button>
    </div>
    <ErrorMessage message={error} />
    {message && <p role="status" className="message success">{t(message as Key)}</p>}
  </section>;
}
