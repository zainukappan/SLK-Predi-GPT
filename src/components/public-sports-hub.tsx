"use client";
import Link from "next/link";
import { Fragment, useState, useMemo, type ReactNode } from "react";
import { CalendarDays, ChevronDown, ChevronRight, Goal, Handshake, MapPin, Menu, Shield, Trophy, Users, Share2, Sparkles } from "lucide-react";
import { StandingsShareCard } from "./standings-share-card";
import type { Row } from "@/lib/db";
import { ist } from "@/lib/domain";
import { LanguageSwitch, useLanguage } from "./provider";
import { MemberPredictions } from "./member-predictions";
import { OnlineCounter } from "./online-counter";
import { computeQualificationStatus, type TeamQualificationInfo } from "@/lib/qualification";

const copy = {
  en: { overview:"Overview",matches:"Matches",table:"Points Table",players:"Players",prediction:"Prediction Leaderboard",login:"Member Login",public:"PUBLIC VIEW",title:"SUPER LEAGUE KERALA",sub:"Fixtures, results, standings and player statistics",next:"Next Match",latest:"Latest Result",noNext:"No upcoming fixture has been published.",fullTime:"Full Time",top:"Top Scorers",assists:"Assists",contrib:"Goal Contributions",played:"P",regWins:"W",shootWins:"PW",shootLosses:"PL",regLosses:"L",gf:"GF",ga:"GA",gd:"GD",pts:"Pts",rank:"Rank",member:"Member",predicted:"Matches Predicted",total:"Total Points",updated:"Updated",matchCentre:"Match Centre",match:"Match",events:"Goal events",shootoutKicks:"Penalty shootout",scored:"Scored",missed:"Missed",recentForm:"Last 10 performances",noForm:"No completed matches yet.",noStats:"Player statistics will appear after goal events are entered.",noResults:"No finalized results yet.",home:"Home",pointsRule:"SLK table: 3 points for a 90-minute win · 2 for a shootout win · 1 for a shootout loss · 0 for a 90-minute loss.",tiebreakRule:"Tiebreakers: points, goal difference, goals scored, then away goals scored in all league matches.",predictionRule:"SBK predictions continue to use only the score and result after 90 minutes plus stoppage time. Shootouts never affect prediction points.",shootoutWon:"Won on penalties",shieldWinner:"Super League Shield Winner",semiFinalist:"Semi-finalist (Positions 1–4)",viewFull:"View full leaderboard",collapse:"Show Top 10",predictScore:"Predict your score",viewFullList:"View full list",qualifiedLegend:"Q: Qualified for Semi-Finals",shieldLegend:"W: Shield Winner",scenariosToggle:"View Semi-Final Race & Scenarios",scenariosHide:"Hide Qualification Scenarios",scenariosTitle:"Semi-Final Qualification Scenarios",scenariosSub:"What each club needs to reach the semi-finals or win the Shield",whatIsNeeded:"Qualification Requirement",remainingMatches:"Remaining Matches",maxPossible:"Max Pts",toggleWithoutPg:"90 Min",toggleWithPg:"+ PG",toggleWithoutPgHint:"90-minute regulation goals only",toggleWithPgHint:"Include penalty shootout goals (+PG)",
    leagueRoundTab: "1. League Round",
    knockoutRoundTab: "2. Knockout Round",
    knockoutTitle: "Playoffs & Knockout Bracket",
    knockoutSub: "Official semi-final fixtures, tournament bracket tree, and tiebreaker rules",
    knockoutInfoTitle: "Super League Kerala Playoffs Stage",
    knockoutInfoDesc: "The top 4 teams from the League Table qualify for the Semi-Finals. Semi-Finals are played across two legs (Home & Away). The Grand Final is a single-leg championship match.",
    semifinalsTitle: "Semifinals (2 Legs)",
    championshipTitle: "Championship Final",
    championTitle: "Champions 🏆",
    semiFinal1: "Semi-Final 1",
    semiFinal2: "Semi-Final 2",
    grandFinal: "Grand Final",
    twoLegsHomeAway: "2 Legs (Home & Away)",
    singleMatchBadge: "Single Match",
    leg1Home: "Leg 1 Home",
    leg2Home: "Leg 2 Home",
    projected: "Projected",
    winnerSf1: "Winner Semi-Final 1",
    winnerSf2: "Winner Semi-Final 2",
    aggregateWinner: "Aggregate Winner",
    slkChampionBadge: "SLK 2026 Champions",
    tbd: "TBD",
    rulesHeader: "Official Knockout Tournament Rules",
    rulesHeaderSub: "Official tournament guidelines governing the semi-finals and final",
    rule1Title: "Semi-Finals Format",
    rule1Desc: "The top Four (4) Clubs from the League Table on completion of the League Matches stage will qualify for the Semi-finals.",
    rule1Point1: "Semi-final 1: The 1st-placed team will play against the 4th-placed team in two matches.",
    rule1Point2: "Semi-final 2: The 2nd-placed team will play against the 3rd-placed team in two matches.",
    rule1Point3: "Each team will host one match (Home & Away).",
    rule2Title: "Tiebreaker Procedure",
    rule2Desc: "If aggregate scores are level after the second match of a Semi-final, or level at the end of normal time in the Final:",
    rule2Point1: "After a 5-minute interval, two 15-minute periods of extra time will be played with a 1-minute drinks break.",
    rule2Point2: "If both teams are still level after extra time, kicks from the penalty mark (shootout) determine the winner.",
    rule2Point3: "Away goals rule does not apply.",
    rule3Title: "Weather / Abandonment",
    rule3Desc: "If a match cannot be played or has to be abandoned due to adverse weather conditions:",
    rule3Point1: "League match: The result will be considered a 0-0 draw.",
    rule3Point2: "Final match: The team with the highest points on the points table will be awarded the title of League Champion.",
    scrollHint: "Scroll horizontally to view full bracket tree"
  },
  ml: { overview:"അവലോകനം",matches:"മത്സരങ്ങൾ",table:"പോയിന്റ് പട്ടിക",players:"കളിക്കാർ",prediction:"പ്രവചന ലീഡർബോർഡ്",login:"മെമ്പർ ലോഗിൻ",public:"പബ്ലിക് വ്യൂ",title:"സൂപ്പർ ലീഗ് കേരള",sub:"മത്സരങ്ങൾ, ഫലങ്ങൾ, പോയിന്റ് പട്ടിക, കളിക്കാരുടെ കണക്കുകൾ",next:"അടുത്ത മത്സരം",latest:"അവസാന ഫലം",noNext:"വരാനിരിക്കുന്ന മത്സരം പ്രസിദ്ധീകരിച്ചിട്ടില്ല.",fullTime:"ഫുൾ ടൈം",top:"ടോപ് സ്കോറേഴ്സ്",assists:"അസിസ്റ്റുകൾ",contrib:"ഗോൾ കോൺട്രിബ്യൂഷൻസ്",played:"മ",regWins:"W",shootWins:"PW",shootLosses:"PL",regLosses:"L",gf:"GF",ga:"GA",gd:"GD",pts:"പോ",rank:"റാങ്ക്",member:"അംഗം",predicted:"പ്രവചിച്ച മത്സരങ്ങൾ",total:"ആകെ പോയിന്റ്",updated:"പുതുക്കിയത്",matchCentre:"മാച്ച് സെന്റർ",match:"മത്സരം",events:"ഗോൾ വിവരങ്ങൾ",shootoutKicks:"പെനാൽറ്റി ഷൂട്ടൗട്ട്",scored:"ഗോൾ ആയി",missed:"ഗോൾ ആയില്ല",recentForm:"Last 10 performances",noForm:"പൂർത്തിയായ മത്സരങ്ങളില്ല.",noStats:"ഗോൾ വിവരങ്ങൾ ചേർത്ത ശേഷം കളിക്കാരുടെ കണക്കുകൾ ഇവിടെ വരും.",noResults:"ഫലം സ്ഥിരീകരിച്ച മത്സരങ്ങളില്ല.",home:"ഹോം",pointsRule:"SLK പട്ടിക: 90 മിനിറ്റ് ജയം 3 · ഷൂട്ടൗട്ട് ജയം 2 · ഷൂട്ടൗട്ട് തോൽവി 1 · 90 മിനിറ്റ് തോൽവി 0 പോയിന്റ്.",tiebreakRule:"ടൈബ്രേക്കർ: പോയിന്റ്, ഗോൾ വ്യത്യാസം, നേടിയ ഗോളുകൾ, എവേ മത്സരങ്ങളിൽ നേടിയ ഗോളുകൾ.",predictionRule:"SBK പ്രവചനത്തിന് 90 മിനിറ്റും സ്റ്റോപ്പേജ് സമയവും കഴിഞ്ഞുള്ള സ്കോറും ഫലവും മാത്രം. ഷൂട്ടൗട്ട് പ്രവചന പോയിന്റിനെ ബാധിക്കില്ല.",shootoutWon:"പെനാൽറ്റിയിൽ വിജയിച്ചത്",shieldWinner:"സൂപ്പർ ലീഗ് ഷീൽഡ് ജേതാവ്",semiFinalist:"സെമി ഫൈനലിസ്റ്റ് (1–4 സ്ഥാനങ്ങൾ)",viewFull:"മുഴുവൻ ലീഡർബോർഡ് കാണുക",collapse:"Top 10 മാത്രം കാണിക്കുക",predictScore:"നിങ്ങളുടെ സ്കോർ പ്രവചിക്കുക",viewFullList:"മുഴുവൻ ലിസ്റ്റ് കാണുക",qualifiedLegend:"Q: സെമി ഉറപ്പിച്ചു",shieldLegend:"W: ഷീൽഡ് ജേതാവ്",scenariosToggle:"സെമി ഫൈനൽ യോഗ്യതാ സാധ്യതകൾ കാണുക",scenariosHide:"സാധ്യതകൾ മറയ്ക്കുക",scenariosTitle:"സെമി ഫൈനൽ യോഗ്യതാ സാധ്യതകൾ",scenariosSub:"ഓരോ ക്ലബ്ബിനും സെമി ഫൈനലിലെത്താനും ഷീൽഡ് നേടാനും എന്താണ് വേണ്ടത്?",whatIsNeeded:"സെമിയിലെത്താൻ എന്ത് വേണം?",remainingMatches:"ബാക്കിയുള്ള മത്സരങ്ങൾ",maxPossible:"പരമാവധി",toggleWithoutPg:"90 മി.",toggleWithPg:"+ PG",toggleWithoutPgHint:"90 മിനിറ്റ് റെഗുലേഷൻ ഗോളുകൾ മാത്രം",toggleWithPgHint:"പെനാൽറ്റി ഷൂട്ടൗട്ട് ഗോളുകൾ കൂടി ഉൾപ്പെടുത്തുക",
    leagueRoundTab: "1. ലീഗ് റൗണ്ട്",
    knockoutRoundTab: "2. നോക്കൗട്ട് റൗണ്ട്",
    knockoutTitle: "പ്ലേഓഫ്സ് & നോക്കൗട്ട് ബ്രാക്കറ്റ്",
    knockoutSub: "സെമി ഫൈനൽ മത്സര ക്രമം, നോക്കൗട്ട് ട്രീ, ടൂർണമെന്റ് നിയമങ്ങൾ",
    knockoutInfoTitle: "സൂപ്പർ ലീഗ് കേരള പ്ലേഓഫ്സ് ഘട്ടം",
    knockoutInfoDesc: "പോയിന്റ് പട്ടികയിലെ ആദ്യ 4 സ്ഥാനക്കാരാണ് സെമി ഫൈനലിൽ ഏറ്റുമുട്ടുന്നത്. സെമി മത്സരങ്ങൾ ഹോം & എവേ അടിസ്ഥാനത്തിൽ രണ്ട് ലെഗ്ഗുകളിലായി നടക്കും. ഫൈനൽ ഒറ്റ മത്സരമായിരിക്കും.",
    semifinalsTitle: "സെമി ഫൈനലുകൾ (2 Legs)",
    championshipTitle: "ഗ്രാൻഡ് ഫൈനൽ",
    championTitle: "ചാമ്പ്യൻമാർ 🏆",
    semiFinal1: "സെമി ഫൈനൽ 1",
    semiFinal2: "സെമി ഫൈനൽ 2",
    grandFinal: "ഗ്രാൻഡ് ഫൈനൽ",
    twoLegsHomeAway: "2 ലെഗ്ഗുകൾ (Home & Away)",
    singleMatchBadge: "സിംഗിൾ മാച്ച്",
    leg1Home: "ലെഗ് 1 ഹോം",
    leg2Home: "ലെഗ് 2 ഹോം",
    projected: "പ്രൊജക്റ്റഡ്",
    winnerSf1: "വിന്നർ സെമി ഫൈനൽ 1",
    winnerSf2: "വിന്നർ സെമി ഫൈനൽ 2",
    aggregateWinner: "അഗ്രിഗേറ്റ് വിജയി",
    slkChampionBadge: "സൂപ്പർ ലീഗ് കേരള ചാമ്പ്യൻസ് 2026",
    tbd: "TBD",
    rulesHeader: "ഔദ്യോഗിക നോക്കൗട്ട് ടൂർണമെന്റ് നിയമങ്ങൾ",
    rulesHeaderSub: "സെമി ഫൈനൽ, ഫൈനൽ മത്സരങ്ങൾ നിയന്ത്രിക്കുന്ന ഔദ്യോഗിക നിയമങ്ങൾ",
    rule1Title: "സെമി ഫൈനൽ ഘടന (Format)",
    rule1Desc: "ലീഗ് റൗണ്ട് മത്സരങ്ങൾ പൂർത്തിയാകുമ്പോൾ പോയിന്റ് പട്ടികയിലെ ആദ്യ 4 ക്ലബ്ബുകളാണ് സെമി ഫൈനലിലേക്ക് യോഗ്യത നേടുക.",
    rule1Point1: "സെമി ഫൈനൽ 1: 1-ാം സ്ഥാനക്കാർ 4-ാം സ്ഥാനക്കാരുമായി രണ്ട് മത്സരങ്ങൾ കളിക്കുന്നു.",
    rule1Point2: "സെമി ഫൈനൽ 2: 2-ാം സ്ഥാനക്കാർ 3-ാം സ്ഥാനക്കാരുമായി രണ്ട് മത്സരങ്ങൾ കളിക്കുന്നു.",
    rule1Point3: "ഓരോ ടീമിനും സ്വന്തം ഗ്രൗണ്ടിൽ ഒരു മത്സരം വീതം (Home & Away) ആതിഥേയത്വം വഹിക്കാം.",
    rule2Title: "ടൈബ്രേക്കർ നടപടിക്രമം (Tiebreaker)",
    rule2Desc: "സെമി ഫൈനൽ രണ്ടാം മത്സരത്തിന് ശേഷം ആകെ ഗോളുകൾ (Aggregate) തുല്യമായാൽ, അല്ലെങ്കിൽ ഫൈനലിൽ 90 മിനിറ്റിന് ശേഷം സമനിലയായാൽ:",
    rule2Point1: "5 മിനിറ്റ് ഇടവേളയ്ക്ക് ശേഷം 15 മിനിറ്റ് വീതമുള്ള രണ്ട് എക്സ്ട്രാ ടൈം (Extra Time) കളിക്കും.",
    rule2Point2: "എക്സ്ട്രാ ടൈമിലും സമനില തുടർന്നാൽ പെനാൽറ്റി ഷൂട്ടൗട്ടിലൂടെ വിജയിയെ കണ്ടെത്തും.",
    rule2Point3: "എവേ ഗോൾസ് ആനുകൂല്യം ഉണ്ടായിരിക്കില്ല.",
    rule3Title: "കാലാവസ്ഥ / കളി തടസ്സപ്പെട്ടാൽ",
    rule3Desc: "പ്രതികൂല കാലാവസ്ഥ കാരണം മത്സരം നടത്താനാവാതെ വരികയോ ഉപേക്ഷിക്കുകയോ ചെയ്താൽ:",
    rule3Point1: "ലീഗ് മത്സരം: ഫലം 0-0 സമനിലയായി കണക്കാക്കും.",
    rule3Point2: "ഫൈനൽ മത്സരം: പോയിന്റ് പട്ടികയിൽ ഏറ്റവും കൂടുതൽ പോയിന്റുള്ള ടീമിനെ സൂപ്പർ ലീഗ് ചാമ്പ്യന്മാരായി പ്രഖ്യാപിക്കും!",
    scrollHint: "പൂർണ്ണ ബ്രാക്കറ്റ് ട്രീ കാണാൻ ഇടത്തോട്ടും വലത്തോട്ടും സ്ക്രോൾ ചെയ്യുക"
  }
} as const;
const leaderboardCopy = {
  en: { serial:"S.No.",winner:"Who will win the match?",score:"What will the score be?",first:"Who will score first?",round:"Round" },
  ml: { serial:"ക്രമ നമ്പർ",winner:"മത്സരത്തിൽ ആര് ജയിക്കും?",score:"സ്കോർ എന്തായിരിക്കും?",first:"ആരാണ് ആദ്യം ഗോൾ നേടുക?",round:"റൗണ്ട്" },
} as const;
export const name = (row: Row, key: string, lang: "en"|"ml") => row[`${key}_${lang}`] || row[`${key}_en`] || "—";
export function Badge({src,label}:{src?:string;label:string}) { return src ? <img className="slk-team-badge" src={src} alt={label} /> : <span className="slk-team-placeholder" role="img" aria-label={label}><Shield /></span>; }


export function PublicHeader() {
  const {lang} = useLanguage(), t=copy[lang];
  const [menu,setMenu]=useState(false);
  return (
    <header className="slk-public-header">
      <Link href="/SuperLeagueKerala" className="slk-public-brand"><img src="/sbk-logo.png" alt="SBK"/><span>SBK <b>Football Hub</b></span></Link>
      <button className="slk-menu-button" aria-label="Menu" onClick={()=>setMenu(!menu)}><Menu/></button>
      <nav className={menu?"open":""}>
        <Link href="/SuperLeagueKerala#overview">{t.overview}</Link>
        <Link href="/SuperLeagueKerala#matches">{t.matches}</Link>
        <Link href="/SuperLeagueKerala#table">{t.table}</Link>
        <Link href="/SuperLeagueKerala#players">{t.players}</Link>
        <Link href="/SuperLeagueKerala#predictions">{t.prediction}</Link>
        <Link href="/news" className="slk-news-link">{lang === "ml" ? "വാർത്തകൾ" : "News Portal"}</Link>
      </nav>
      <LanguageSwitch />
      <Link className="slk-login" href="/">{t.login}</Link>
    </header>
  );
}

const toDate = (v: any) => {
  if (v instanceof Date) return v;
  if (typeof v === "string") {
    const s = v.includes(" ") && !v.includes("T") ? v.replace(" ", "T") : v;
    const d = new Date(s);
    return isNaN(d.getTime()) ? new Date(0) : d;
  }
  return new Date(v || 0);
};

export function sortPlayerStats(
  list: Row[],
  metric: "top" | "assists" | "contrib",
  includeShootout: boolean = false
): Row[] {
  return [...list]
    .map((player: Row) => {
      const regGoals = Number(player.regulation_goals ?? player.goals ?? 0);
      const totalGoals = Number(player.goals ?? 0);
      const assists = Number(player.assists ?? 0);
      const effectiveGoals = includeShootout ? totalGoals : regGoals;
      const effectiveContrib = effectiveGoals + assists;
      const displayValue =
        metric === "top"
          ? effectiveGoals
          : metric === "assists"
          ? assists
          : effectiveContrib;

      return {
        ...player,
        _displayValue: displayValue,
        _effectiveGoals: effectiveGoals,
        _effectiveContrib: effectiveContrib,
      };
    })
    .filter((player: Row) => Number(player._displayValue) > 0)
    .sort((a: Row, b: Row) => {
      const aVal = Number(a._displayValue);
      const bVal = Number(b._displayValue);
      const diff = bVal - aVal;
      if (diff !== 0) return diff;

      const aReg = Number(a.regulation_goals ?? a.goals ?? 0);
      const bReg = Number(b.regulation_goals ?? b.goals ?? 0);
      const aGoals = Number(a.goals ?? 0);
      const bGoals = Number(b.goals ?? 0);
      const aAssists = Number(a.assists ?? 0);
      const bAssists = Number(b.assists ?? 0);

      if (metric === "top") {
        if (includeShootout) {
          // Priority to normal time (regulation) goals when total goals are equal
          const regDiff = bReg - aReg;
          if (regDiff !== 0) return regDiff;
          const shootDiff = Number(b.shootout_goals ?? 0) - Number(a.shootout_goals ?? 0);
          if (shootDiff !== 0) return shootDiff;
        }
        const assistDiff = bAssists - aAssists;
        if (assistDiff !== 0) return assistDiff;
        return (a.player_en || "").localeCompare(b.player_en || "");
      }

      if (metric === "contrib") {
        if (includeShootout) {
          // When total contributions are equal: total goals first, then regulation goals, then assists
          const goalsDiff = bGoals - aGoals;
          if (goalsDiff !== 0) return goalsDiff;
        }
        const regDiff = bReg - aReg;
        if (regDiff !== 0) return regDiff;
        const assistDiff = bAssists - aAssists;
        if (assistDiff !== 0) return assistDiff;
        return (a.player_en || "").localeCompare(b.player_en || "");
      }

      // metric === "assists": regulation goals first, then total goals, then name
      const regDiff = bReg - aReg;
      if (regDiff !== 0) return regDiff;
      const goalsDiff = bGoals - aGoals;
      if (goalsDiff !== 0) return goalsDiff;
      return (a.player_en || "").localeCompare(b.player_en || "");
    });
}

export function ShootoutToggle({
  value,
  onChange,
  t,
}: {
  value: boolean;
  onChange: (val: boolean) => void;
  t: any;
}) {
  return (
    <div
      className="slk-segmented-toggle"
      role="group"
      aria-label="Penalty shootout toggle"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={`slk-segment-btn ${!value ? "active" : ""}`}
        onClick={() => onChange(false)}
        title={t.toggleWithoutPgHint}
      >
        <span>{t.toggleWithoutPg}</span>
      </button>
      <button
        type="button"
        className={`slk-segment-btn ${value ? "active" : ""}`}
        onClick={() => onChange(true)}
        title={t.toggleWithPgHint}
      >
        <span>{t.toggleWithPg}</span>
      </button>
    </div>
  );
}

export function CardTitle({
  icon,
  title,
  action,
}: {
  icon: ReactNode;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="slk-data-card-title">
      <div>
        <span>{icon}</span>
        <h2>{title}</h2>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function PublicSportsHub({data}:{data:Row}) {
    const {lang} = useLanguage(), t=copy[lang], [menu,setMenu]=useState(false), [showShareModal, setShowShareModal] = useState(false);
    const [shootoutTop, setShootoutTop] = useState(false);
    const [shootoutContrib, setShootoutContrib] = useState(false);
    const [stageTab, setStageTab] = useState<"league" | "knockout">("league");
    const upcoming=[...data.fixtures].filter((f:Row)=>f.status==="scheduled"&&toDate(f.kickoff)>new Date()).sort((a:Row,b:Row)=>+toDate(a.kickoff)-+toDate(b.kickoff))[0];
    const finals=[...data.fixtures].filter((f:Row)=>f.status==="finalized").sort((a:Row,b:Row)=>+toDate(b.kickoff)-+toDate(a.kickoff));
    const latest=finals[0];
    const playerRows=(metric:"top"|"assists"|"contrib", includePg: boolean = false)=>sortPlayerStats(data.players, metric, includePg).slice(0,5);
    return <div className="slk-public">
      <PublicHeader />
      <main>
      <section className="slk-hero" id="overview"><div><span className="slk-public-pill">{t.public}</span><h1>{t.title}</h1><p>{t.sub}</p></div><img src="/slk-logo-white.webp" alt="Super League Kerala"/></section>
      <section className="slk-match-grid" id="matches">
        <MatchFeature title={t.next} fixture={upcoming} empty={t.noNext} lang={lang} action={t.matchCentre}/>
        <MatchFeature title={t.latest} fixture={latest} empty={t.noResults} lang={lang} result action={t.fullTime}/>
      </section>
      <section className="slk-data-section" id="table">
        <article className="slk-data-card slk-table-card">
          <div className="slk-table-card-header">
            {/* Left: Prominent Stage Switcher (Swapped to start!) */}
            <div className="slk-stage-nav-toggle" role="tablist" aria-label="Tournament stage toggle">
              <button
                type="button"
                role="tab"
                aria-selected={stageTab === "league"}
                className={`slk-stage-nav-btn ${stageTab === "league" ? "active" : ""}`}
                onClick={() => setStageTab("league")}
              >
                <span className="slk-stage-icon">📊</span>
                <span>{t.leagueRoundTab}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={stageTab === "knockout"}
                className={`slk-stage-nav-btn ${stageTab === "knockout" ? "active" : ""}`}
                onClick={() => setStageTab("knockout")}
              >
                <span className="slk-stage-icon">⚔️</span>
                <span>{t.knockoutRoundTab}</span>
              </button>
            </div>

            {/* Right: Stage Title with Trophy Icon (Swapped) */}
            <div className="slk-table-header-title">
              <span><Trophy size={18} /></span>
              <h2>{stageTab === "league" ? t.table : t.knockoutTitle}</h2>
            </div>
          </div>
          {stageTab === "league" ? (
            <>
              <div className="slk-points-note">
                <strong>{t.pointsRule}</strong>
                <span>{t.tiebreakRule}</span>
                <span>{t.predictionRule}</span>
              </div>
              <div className="slk-table-legend" aria-label="Standings highlights" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 18px", alignItems: "center" }}>
                  <span><i className="shield"/>{t.shieldWinner}</span>
                  <span><i className="semifinal"/>{t.semiFinalist}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <b className="slk-status-badge slk-badge-q" style={{ margin: 0, padding: "2px 6px" }}>Q</b>
                    <span>{t.qualifiedLegend}</span>
                  </span>
                </div>
                <button type="button" className="button primary small" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 800, padding: "6px 14px", borderRadius: "8px", background: "var(--yellow)", color: "var(--navy)", cursor: "pointer", border: "none", boxShadow: "0 2px 6px rgba(0,0,0,0.1)", marginLeft: "auto" }} onClick={()=>setShowShareModal(true)}>
                  <Share2 size={14} />
                  <span>Share Table</span>
                </button>
              </div>
              <Standings rows={data.table} fixtures={data.fixtures} t={t} lang={lang}/>
              {showShareModal && <StandingsShareCard rows={data.table} fixtures={data.fixtures} onClose={()=>setShowShareModal(false)} />}
            </>
          ) : (
            <KnockoutStage rows={data.table} fixtures={data.fixtures} t={t} lang={lang} />
          )}
        </article>
        <div className="slk-stat-cards" id="players" style={{ scrollMarginTop: "90px" }}>
          <article className="slk-data-card slk-stat-card">
            <CardTitle
              icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="12 6 16.5 9 14.5 14 9.5 14 7.5 9"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="16.5" y1="9" x2="21.5" y2="8"/><line x1="14.5" y1="14" x2="18" y2="19"/><line x1="9.5" y1="14" x2="6" y2="19"/><line x1="7.5" y1="9" x2="2.5" y2="8"/></svg>}
              title={t.top}
              action={<ShootoutToggle value={shootoutTop} onChange={setShootoutTop} t={t} />}
            />
            <PlayerStats rows={playerRows("top", shootoutTop)} metric="top" includeShootout={shootoutTop} t={t} lang={lang}/>
            <div className="slk-stat-card-footer">
              <Link href={`/top-scorers?tab=top${shootoutTop ? '&pg=1' : ''}`} className="slk-view-full-link">
                <span>{t.viewFullList}</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </article>
          <article className="slk-data-card slk-stat-card">
            <CardTitle icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 15v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3c0-1.5-1-3-2.5-3.5L15 10l-2-3-6 3c-1.5.5-2.5 2-2.5 3.5V15z"/><line x1="7" y1="18" x2="7" y2="21"/><line x1="11" y1="18" x2="11" y2="21"/><line x1="15" y1="18" x2="15" y2="21"/><line x1="13" y1="10" x2="16" y2="14"/></svg>} title={t.assists}/>
            <PlayerStats rows={playerRows("assists", false)} metric="assists" t={t} lang={lang}/>
            <div className="slk-stat-card-footer">
              <Link href="/top-scorers?tab=assists" className="slk-view-full-link">
                <span>{t.viewFullList}</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </article>
          <article className="slk-data-card slk-stat-card">
            <CardTitle
              icon={<Users/>}
              title={t.contrib}
              action={<ShootoutToggle value={shootoutContrib} onChange={setShootoutContrib} t={t} />}
            />
            <PlayerStats rows={playerRows("contrib", shootoutContrib)} metric="contrib" includeShootout={shootoutContrib} t={t} lang={lang}/>
            <div className="slk-stat-card-footer">
              <Link href={`/top-scorers?tab=contrib${shootoutContrib ? '&pg=1' : ''}`} className="slk-view-full-link">
                <span>{t.viewFullList}</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </article>
        </div>
      </section>
      <section className="slk-results-section"><div className="slk-section-title"><div><small>{t.matchCentre}</small><h2>{t.matches}</h2></div></div><div className="slk-results-grid">{finals.slice(0,6).map((f:Row)=><ResultCard key={f.id} fixture={f} events={data.events.filter((e:Row)=>e.fixture_id===f.id)} kicks={data.shootoutKicks.filter((k:Row)=>k.fixture_id===f.id)} lang={lang} t={t}/>)}</div></section>
      <section className="slk-prediction-public" id="predictions"><div className="slk-section-title"><div><small>SBK COMMUNITY</small><h2>{t.prediction}</h2></div><div className="slk-prediction-actions"><span>{t.updated}: {ist(data.generatedAt,lang)}</span><Link href="/" className="slk-predict-cta">{t.predictScore}<ChevronRight/></Link></div></div><PredictionLeaderboard rows={data.predictions} rounds={data.rounds} memberPredictions={data.memberPredictions} t={t} lang={lang}/></section>
    </main>
    <footer className="slk-public-footer"><div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}><img src="/sbk-logo.png" alt="SBK"/><OnlineCounter /></div><p>Soccer Blues of Keralam · Fans predict. Football unites.</p><Link href="/">{t.login}<ChevronRight/></Link></footer>
  </div>;
}
function MatchFeature({title,fixture,empty,lang,result,action}:{title:string;fixture?:Row;empty:string;lang:"en"|"ml";result?:boolean;action:string}) { const t=copy[lang]; return <article className={`slk-match-feature ${result?"result":"upcoming"}`}><div className="slk-card-head"><strong>{title}</strong><span className={result?"result":"upcoming"}>{result?"FULL TIME":"UPCOMING"}</span></div>{fixture?<><strong className="match-number-label">{t.match} {fixture.match_number}</strong><div className="slk-versus"><div><Badge src={fixture.home_badge} label={name(fixture,"home",lang)}/><b>{name(fixture,"home",lang)}</b></div><strong>{result?`${fixture.home_goals} – ${fixture.away_goals}`:"VS"}</strong><div><Badge src={fixture.away_badge} label={name(fixture,"away",lang)}/><b>{name(fixture,"away",lang)}</b></div></div><div className="slk-match-footer"><div className="slk-match-meta"><span><CalendarDays/>{ist(fixture.kickoff,lang)}</span>{name(fixture,"venue",lang)!=="—"&&<span><MapPin/>{name(fixture,"venue",lang)}</span>}</div>{!result&&<Link href="/" className="slk-predict-cta">{t.predictScore}<ChevronRight/></Link>}</div></>:<p className="slk-empty">{empty}</p>}</article>; }
  function Standings({rows,fixtures,t,lang}:{rows:Row[];fixtures:Row[];t:any;lang:"en"|"ml"}) {
    const [showScenarios, setShowScenarios] = useState(false);
    const qualMap = useMemo(() => computeQualificationStatus(rows, fixtures), [rows, fixtures]);
    const form=(teamId:string)=>fixtures.filter(f=>f.status==="finalized"&&(f.home_id===teamId||f.away_id===teamId)).sort((a,b)=>+toDate(b.kickoff)-+toDate(a.kickoff)).slice(0,10).map(f=>{const home=f.home_id===teamId,forGoals=Number(home?f.home_goals:f.away_goals),against=Number(home?f.away_goals:f.home_goals),code=forGoals>against?"W":forGoals<against?"L":f.shootout_winner===(home?"home":"away")?"PW":"PL";const opponent=home?name(f,"away",lang):name(f,"home",lang);return {id:String(f.id),home_goals:f.home_goals,away_goals:f.away_goals,code,opponent};});
    return (
      <div className="slk-standings-container">
        <div className="slk-public-table">
          <table>
            <thead>
              <tr>
                <th>Pos</th>
                <th>Club</th>
                <th>{t.played}</th>
                <th title="90-minute wins">{t.regWins}</th>
                <th title="Penalty shootout wins">{t.shootWins}</th>
                <th title="Penalty shootout losses">{t.shootLosses}</th>
                <th title="90-minute losses">{t.regLosses}</th>
                <th>{t.gf}</th>
                <th>{t.ga}</th>
                <th>{t.gd}</th>
                <th>{t.pts}</th>
                <th style={{ minWidth: "160px", whiteSpace: "nowrap" }}>{t.recentForm}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r=>{
                const position=Number(r.table_position),prev=r.previous_position?Number(r.previous_position):position,movement=prev-position,recent=form(r.team_id),status=qualMap[r.team_id];
                return (
                  <tr key={r.team_id} className={`${position===1?"slk-shield-row":position<=4?"slk-semifinal-row":""}`}>
                    <td>
                      <div className="slk-pos-wrap">
                        <b>{r.table_position}</b>
                        {movement>0?<span className="pos-up">↑ {movement}</span>:movement<0?<span className="pos-down">↓ {-movement}</span>:<span className="pos-same">-</span>}
                      </div>
                    </td>
                    <td>
                      <span className="slk-club">
                        <Badge src={r.badge} label={name(r,"name",lang)}/>
                        <strong style={{ display: "inline-flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          <span>{name(r,"name",lang)}</span>
                          {status?.isShieldWinner && (
                            <span className="slk-status-badge slk-badge-shield" title={lang === "ml" ? "സൂപ്പർ ലീഗ് ഷീൽഡ് ജേതാവ്" : "Super League Shield Winner"}>
                              🏆 {lang === "ml" ? "ഷീൽഡ് ജേതാവ്" : "Shield Winner"}
                            </span>
                          )}
                          {!status?.isShieldWinner && status?.isQualified && (
                            <span className="slk-status-badge slk-badge-q" title={lang === "ml" ? "സെമി ഫൈനൽ ഉറപ്പിച്ചു" : "Qualified for Semi-Finals"}>
                              Q
                            </span>
                          )}
                          {status?.isEliminated && (
                            <span className="slk-status-badge slk-badge-e" title={lang === "ml" ? "പുറത്തായി" : "Eliminated"}>
                              E
                            </span>
                          )}
                        </strong>
                      </span>
                    </td>
                    <td>{r.played}</td>
                    <td>{r.regulation_wins}</td>
                    <td>{r.shootout_wins}</td>
                    <td>{r.shootout_losses}</td>
                    <td>{r.regulation_losses}</td>
                    <td>{r.goals_for}</td>
                    <td>{r.goals_against}</td>
                    <td>{r.goal_difference}</td>
                    <td><b>{r.points}</b></td>
                    <td>{recent.length?<div className="slk-form-strip" style={{ display: "flex", gap: "5px", alignItems: "center", flexWrap: "nowrap" }}>{recent.map(match=><span key={match.id} className={`form-${match.code.toLowerCase()}`} title={`${match.opponent} · ${match.home_goals}–${match.away_goals}`} style={{ width: "26px", height: "26px", fontSize: "10px", fontWeight: 800, borderRadius: "50%", display: "grid", placeItems: "center", flexShrink: 0 }}>{match.code}</span>)}</div>:<small style={{ color: "var(--muted)" }}>—</small>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="slk-scenarios-action-bar">
          <button
            type="button"
            className={`slk-scenarios-btn ${showScenarios ? "active" : ""}`}
            onClick={() => setShowScenarios(!showScenarios)}
            aria-expanded={showScenarios}
          >
            <Sparkles size={16} />
            <span>{showScenarios ? t.scenariosHide : t.scenariosToggle}</span>
            <ChevronDown size={15} style={{ transform: showScenarios ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
          </button>
        </div>

        {showScenarios && (
          <QualificationScenarios qualMap={qualMap} rows={rows} lang={lang} t={t} />
        )}
      </div>
    );
  }

  function QualificationScenarios({
    qualMap,
    rows,
    lang,
    t,
  }: {
    qualMap: Record<string, TeamQualificationInfo>;
    rows: Row[];
    lang: "en" | "ml";
    t: any;
  }) {
    return (
      <div className="slk-scenarios-panel">
        <div className="slk-scenarios-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles className="sparkle-icon" size={18} />
            <h3>{t.scenariosTitle}</h3>
          </div>
          <p>{t.scenariosSub}</p>
        </div>
        <div className="slk-scenarios-grid">
          {rows.map((r) => {
            const q = qualMap[r.team_id];
            if (!q) return null;
            const statusBadge = lang === "ml" ? q.statusBadgeMl : q.statusBadgeEn;
            const needText = lang === "ml" ? q.needMl : q.needEn;

            return (
              <div key={q.teamId} className={`slk-scenario-card ${q.statusClass}`}>
                <div className="slk-scenario-card-head">
                  <div className="slk-scenario-team">
                    <span className="slk-scenario-pos">#{q.pos}</span>
                    <Badge src={q.badge} label={name(r, "name", lang)} />
                    <div>
                      <strong>{name(r, "name", lang)}</strong>
                      <small>
                        {t.pts}: <b>{q.pts}</b> · {t.played}: {q.played} · {t.maxPossible}: <b>{q.maxPts}</b>
                      </small>
                    </div>
                  </div>
                  <span className={`slk-scenario-tag ${q.statusClass}`}>{statusBadge}</span>
                </div>

                <div className="slk-scenario-body">
                  <div className="slk-scenario-need">
                    <small>{t.whatIsNeeded}</small>
                    <p>{needText}</p>
                  </div>

                  {q.remainingFixtures.length > 0 && (
                    <div className="slk-scenario-fixtures">
                      <small>
                        {t.remainingMatches} ({q.remCount}):
                      </small>
                      <div className="slk-scenario-chips">
                        {q.remainingFixtures.map((f) => (
                          <span
                            key={f.matchNumber}
                            className="slk-fixture-chip"
                            title={`${f.roundEn} · ${new Date(f.kickoff).toLocaleDateString()}`}
                          >
                            <b>M{f.matchNumber}</b> vs {lang === "ml" ? f.opponentMl : f.opponentEn}
                            <small>({f.isHome ? (lang === "ml" ? "ഹോം" : "H") : (lang === "ml" ? "എവേ" : "A")})</small>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function KnockoutStage({
    rows,
    fixtures,
    t,
    lang,
  }: {
    rows: Row[];
    fixtures: Row[];
    t: any;
    lang: "en" | "ml";
  }) {
    const qualMap = useMemo(() => computeQualificationStatus(rows, fixtures), [rows, fixtures]);

    const sorted = [...rows].sort((a, b) => Number(a.table_position) - Number(b.table_position));
    const team1 = sorted[0];
    const team2 = sorted[1];
    const team3 = sorted[2];
    const team4 = sorted[3];

    const q1 = team1 ? qualMap[team1.team_id] : null;
    const q2 = team2 ? qualMap[team2.team_id] : null;
    const q3 = team3 ? qualMap[team3.team_id] : null;
    const q4 = team4 ? qualMap[team4.team_id] : null;

    return (
      <div className="slk-knockout-container">
        <div className="slk-points-note" style={{ background: "#f0f6ff", borderLeftColor: "#2563eb", marginBottom: "16px" }}>
          <strong style={{ color: "#1d4ed8", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>⚔️</span>
            <span>{t.knockoutInfoTitle}</span>
          </strong>
          <span style={{ color: "#334155" }}>{t.knockoutInfoDesc}</span>
        </div>

        <div className="slk-bracket-scroll-hint">
          <small>{t.scrollHint}</small>
        </div>

        <div className="slk-bracket-tree-wrapper">
          <div className="slk-bracket-tree">

            {/* Column 1: Semifinals */}
            <div className="slk-bracket-col slk-bracket-semis">
              <div className="slk-bracket-col-header">
                <span>{t.semifinalsTitle}</span>
              </div>

              <div className="slk-bracket-matches-stack">
                {/* Semi-Final 1: #1 vs #4 */}
                <div className="slk-match-box slk-match-sf">
                  <div className="slk-match-box-head">
                    <div className="slk-match-title-wrap">
                      <span className="slk-match-number-badge">SF 1</span>
                      <strong>{t.semiFinal1}</strong>
                    </div>
                    <span className="slk-leg-badge">{t.twoLegsHomeAway}</span>
                  </div>

                  <div className="slk-match-team-row">
                    <div className="slk-team-info">
                      <span className="slk-team-seed seed-1">1</span>
                      <Badge src={team1?.badge} label={team1 ? name(team1, "name", lang) : "Seed 1"} />
                      <div className="slk-team-name-wrap">
                        <strong className="slk-team-name">{team1 ? name(team1, "name", lang) : "1st Place"}</strong>
                        <span className="slk-team-leg-sub">{t.leg2Home}</span>
                      </div>
                    </div>
                    <div className="slk-team-status">
                      {q1?.isQualified ? (
                        <span className="slk-status-badge slk-badge-q" title={t.qualifiedLegend}>Q</span>
                      ) : (
                        <span className="slk-projected-badge">{t.projected}</span>
                      )}
                    </div>
                  </div>

                  <div className="slk-match-team-row">
                    <div className="slk-team-info">
                      <span className="slk-team-seed">4</span>
                      <Badge src={team4?.badge} label={team4 ? name(team4, "name", lang) : "Seed 4"} />
                      <div className="slk-team-name-wrap">
                        <strong className="slk-team-name">{team4 ? name(team4, "name", lang) : "4th Place"}</strong>
                        <span className="slk-team-leg-sub">{t.leg1Home}</span>
                      </div>
                    </div>
                    <div className="slk-team-status">
                      {q4?.isQualified ? (
                        <span className="slk-status-badge slk-badge-q" title={t.qualifiedLegend}>Q</span>
                      ) : (
                        <span className="slk-projected-badge">{t.projected}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Semi-Final 2: #2 vs #3 */}
                <div className="slk-match-box slk-match-sf">
                  <div className="slk-match-box-head">
                    <div className="slk-match-title-wrap">
                      <span className="slk-match-number-badge">SF 2</span>
                      <strong>{t.semiFinal2}</strong>
                    </div>
                    <span className="slk-leg-badge">{t.twoLegsHomeAway}</span>
                  </div>

                  <div className="slk-match-team-row">
                    <div className="slk-team-info">
                      <span className="slk-team-seed seed-2">2</span>
                      <Badge src={team2?.badge} label={team2 ? name(team2, "name", lang) : "Seed 2"} />
                      <div className="slk-team-name-wrap">
                        <strong className="slk-team-name">{team2 ? name(team2, "name", lang) : "2nd Place"}</strong>
                        <span className="slk-team-leg-sub">{t.leg2Home}</span>
                      </div>
                    </div>
                    <div className="slk-team-status">
                      {q2?.isQualified ? (
                        <span className="slk-status-badge slk-badge-q" title={t.qualifiedLegend}>Q</span>
                      ) : (
                        <span className="slk-projected-badge">{t.projected}</span>
                      )}
                    </div>
                  </div>

                  <div className="slk-match-team-row">
                    <div className="slk-team-info">
                      <span className="slk-team-seed">3</span>
                      <Badge src={team3?.badge} label={team3 ? name(team3, "name", lang) : "Seed 3"} />
                      <div className="slk-team-name-wrap">
                        <strong className="slk-team-name">{team3 ? name(team3, "name", lang) : "3rd Place"}</strong>
                        <span className="slk-team-leg-sub">{t.leg1Home}</span>
                      </div>
                    </div>
                    <div className="slk-team-status">
                      {q3?.isQualified ? (
                        <span className="slk-status-badge slk-badge-q" title={t.qualifiedLegend}>Q</span>
                      ) : (
                        <span className="slk-projected-badge">{t.projected}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SVG Connector 1: Semis to Final */}
            <div className="slk-bracket-connector-wrap">
              <svg className="slk-bracket-svg" viewBox="0 0 48 270" fill="none" preserveAspectRatio="none">
                <path d="M 0 55 H 24 V 135 H 48" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 0 215 H 24 V 135" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Column 2: Final Match */}
            <div className="slk-bracket-col slk-bracket-final">
              <div className="slk-bracket-col-header final-header">
                <span>⚡ {t.championshipTitle}</span>
              </div>

              <div className="slk-match-box slk-final-box">
                <div className="slk-match-box-head final-head">
                  <div className="slk-match-title-wrap">
                    <span className="slk-match-number-badge final-badge">FINAL</span>
                    <strong>{t.grandFinal}</strong>
                  </div>
                  <span className="slk-leg-badge final-leg">{t.singleMatchBadge}</span>
                </div>

                <div className="slk-match-team-row">
                  <div className="slk-team-info">
                    <span className="slk-team-seed final-seed">SF1</span>
                    <div className="slk-team-placeholder-final">🏆</div>
                    <div className="slk-team-name-wrap">
                      <strong className="slk-team-name">{t.winnerSf1}</strong>
                      <span className="slk-team-leg-sub">#1 vs #4 {t.aggregateWinner}</span>
                    </div>
                  </div>
                  <span className="slk-final-score-ph">—</span>
                </div>

                <div className="slk-match-team-row">
                  <div className="slk-team-info">
                    <span className="slk-team-seed final-seed">SF2</span>
                    <div className="slk-team-placeholder-final">🏆</div>
                    <div className="slk-team-name-wrap">
                      <strong className="slk-team-name">{t.winnerSf2}</strong>
                      <span className="slk-team-leg-sub">#2 vs #3 {t.aggregateWinner}</span>
                    </div>
                  </div>
                  <span className="slk-final-score-ph">—</span>
                </div>

                <div className="slk-final-footer">
                  <small>90 Mins + Extra Time + Penalties</small>
                </div>
              </div>
            </div>

            {/* SVG Connector 2: Final to Champion */}
            <div className="slk-bracket-connector-wrap">
              <svg className="slk-bracket-svg" viewBox="0 0 48 270" fill="none" preserveAspectRatio="none">
                <path d="M 0 135 H 48" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 4" />
              </svg>
            </div>

            {/* Column 3: Champions */}
            <div className="slk-bracket-col slk-bracket-champ">
              <div className="slk-bracket-col-header champ-header">
                <span>{t.championTitle}</span>
              </div>

              <div className="slk-champ-box">
                <div className="slk-champ-trophy">
                  <Trophy size={24} />
                </div>
                <span className="slk-champ-badge-label">{t.slkChampionBadge}</span>
                <strong className="slk-champ-winner-name">{t.tbd}</strong>
                <small className="slk-champ-sub">Super League Kerala Trophy</small>
              </div>
            </div>

          </div>
        </div>

        {/* Tournament Rules Section */}
        <div className="slk-rules-section">
          <div className="slk-rules-title-bar">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "17px" }}>📜</span>
              <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "var(--navy)" }}>{t.rulesHeader}</h3>
            </div>
            <small style={{ color: "var(--muted)", fontWeight: 500 }}>{t.rulesHeaderSub}</small>
          </div>

          <div className="slk-rules-grid">
            <div className="slk-rule-card">
              <h4>
                <span className="slk-rule-badge">4</span>
                <span>{t.rule1Title}</span>
              </h4>
              <p>{t.rule1Desc}</p>
              <ul>
                <li>{t.rule1Point1}</li>
                <li>{t.rule1Point2}</li>
                <li>{t.rule1Point3}</li>
              </ul>
            </div>

            <div className="slk-rule-card">
              <h4>
                <span className="slk-rule-badge" style={{ background: "#ecfdf5", color: "#059669" }}>6</span>
                <span>{t.rule2Title}</span>
              </h4>
              <p>{t.rule2Desc}</p>
              <ul>
                <li>{t.rule2Point1}</li>
                <li>{t.rule2Point2}</li>
                <li><strong>{t.rule2Point3}</strong></li>
              </ul>
            </div>

            <div className="slk-rule-card">
              <h4>
                <span className="slk-rule-badge" style={{ background: "#fffbeb", color: "#d97706" }}>7</span>
                <span>{t.rule3Title}</span>
              </h4>
              <p>{t.rule3Desc}</p>
              <ul>
                <li><strong>{t.rule3Point1}</strong></li>
                <li><strong>{t.rule3Point2}</strong></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }
  function PredictionLeaderboard({rows,rounds,memberPredictions,t,lang}:{rows:Row[];rounds:Row[];memberPredictions:Row[];t:any;lang:"en"|"ml"}) { const labels=leaderboardCopy[lang],[expanded,setExpanded]=useState<string|null>(null),[showAll,setShowAll]=useState(false),visibleRows=showAll?rows:rows.slice(0,10); return <div className="slk-public-table slk-prediction-table"><table><thead><tr><th rowSpan={2}>{labels.serial}</th><th rowSpan={2}>{t.rank}</th><th rowSpan={2}>{t.member}</th><th rowSpan={2}>{labels.winner}</th><th rowSpan={2}>{labels.score}</th><th rowSpan={2}>{labels.first}</th><th rowSpan={2}>{t.predicted}</th>{rounds.length>0&&<th colSpan={rounds.length} className="round-group">{labels.round}</th>}<th rowSpan={2}>{t.total}</th></tr>{rounds.length>0&&<tr>{rounds.map(round=><th key={round.id} title={name(round,"name",lang)}>{round.sort_order}</th>)}</tr>}</thead><tbody>{visibleRows.map((r:Row,index:number)=>{const position=Number(r.rank),prev=r.previous_rank?Number(r.previous_rank):position,movement=prev-position;return <Fragment key={r.public_key}><tr><td>{index+1}</td><td><div className="slk-pos-wrap"><span className={`slk-rank-badge rank-${r.rank}`}>{r.rank}</span>{movement>0?<span className="pos-up">↑ {movement}</span>:movement<0?<span className="pos-down">↓ {-movement}</span>:<span className="pos-same">-</span>}</div></td><td><button className="member-prediction-toggle" aria-expanded={expanded===r.public_key} aria-controls={`public-predictions-${r.public_key}`} onClick={()=>setExpanded(expanded===r.public_key?null:r.public_key)}><strong>{r.display_name}</strong><ChevronDown size={14}/></button></td><td>{r.correct}</td><td>{r.exact}</td><td>{r.first_goal_correct}</td><td>{r.participation}</td>{rounds.map(round=><td key={round.id} className="round-score">{r.round_points?.[round.id]??0}</td>)}<td><strong>{r.points}</strong></td></tr>{expanded===r.public_key&&<tr className="member-prediction-row" id={`public-predictions-${r.public_key}`}><td colSpan={8+rounds.length}><div className="member-prediction-heading"><strong>{r.display_name}</strong><button className="text-button" onClick={()=>setExpanded(null)}>{lang==="ml"?"പ്രവചനങ്ങൾ മറയ്ക്കുക":"Hide predictions"}</button></div><MemberPredictions rows={memberPredictions.filter((item:Row)=>item.public_key===r.public_key)}/></td></tr>}</Fragment>})}</tbody></table>{rows.length>10&&<div className="slk-leaderboard-more"><button onClick={()=>{setShowAll(!showAll);setExpanded(null);}}>{showAll?t.collapse:t.viewFull}<ChevronDown className={showAll?"open":""}/></button></div>}</div>; }
function PlayerStats({rows,metric,includeShootout=false,t,lang}:{rows:Row[];metric:string;includeShootout?:boolean;t:any;lang:"en"|"ml"}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  const key = metric === "top" ? "goals" : metric === "assists" ? "assists" : "contributions";
  const isGoalMetric = metric === "top" || metric === "contrib";
  return rows.length ? (
    <div key={`${metric}-${includeShootout}`} className="slk-player-grid slk-animated-list">
      {rows.slice(0, 12).map((r, i) => {
        const isExp = !!expanded[r.player_id];
        const regGoals = Number(r.regulation_goals ?? r.goals ?? 0);
        const shootGoals = Number(r.shootout_goals ?? 0);
        const effectiveGoals = Number(r._effectiveGoals ?? (includeShootout ? r.goals : regGoals));
        return (
          <article
            key={r.player_id}
            onClick={() => isGoalMetric && toggle(r.player_id)}
            style={{ cursor: isGoalMetric ? "pointer" : "default", transition: "background 0.15s ease", background: isExp ? "#f8fbff" : undefined }}
            title={isGoalMetric ? (lang === "ml" ? "പേരിൽ ക്ലിക്ക് ചെയ്താൽ G, PG കാണാം" : "Click to view G & PG breakdown") : undefined}
          >
            <span className="slk-player-rank">{i + 1}</span>
            <Badge src={r.badge} label={name(r, "team", lang)} />
            <div>
              <strong style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <span style={{ borderBottom: isGoalMetric ? "1px dashed rgba(20,80,223,0.35)" : "none" }}>{name(r, "player", lang)}</span>
              </strong>
              <small>{name(r, "team", lang)}{r.shirt_number ? ` · #${r.shirt_number}` : ""}</small>
              {isGoalMetric && isExp && (
                <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "6px", flexWrap: "wrap" }}>
                  <span
                    className="slk-pill-g"
                    title={lang === "ml" ? "90 മിനിറ്റിൽ നേടിയ ഗോൾ" : "90-minute regulation goals"}
                  >
                    <span>G</span> <b>{regGoals}</b>
                  </span>
                  <span
                    className="slk-pill-pg"
                    title={lang === "ml" ? "സമനില-പെനാൽറ്റിയിൽ നേടിയ ഗോൾ" : "Penalty shootout goals"}
                  >
                    <span>PG</span> <b>{shootGoals}</b>
                  </span>
                </div>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <b className="slk-stat-value" style={{ fontSize: "18px" }}>{r._displayValue ?? r[key]}</b>
              {metric === "contrib" && (
                <div style={{ fontSize: "11px", color: "var(--muted)", whiteSpace: "nowrap", fontWeight: 700, marginTop: "2px" }}>
                  {effectiveGoals} {lang === 'ml' ? 'ഗോൾ' : 'G'} + {r.assists} {lang === 'ml' ? 'അസിസ്റ്റ്' : 'A'}
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  ) : <p className="slk-empty">{t.noStats}</p>;
}
function ResultCard({fixture,events,kicks,lang,t}:{fixture:Row;events:Row[];kicks:Row[];lang:"en"|"ml";t:any}) { const shootoutTeam=fixture.shootout_winner?name(fixture,fixture.shootout_winner,lang):null; return <article className="slk-result-card"><small><b className="match-number-label">{t.match} {fixture.match_number}</b> · {name(fixture,"round",lang)} · {ist(fixture.kickoff,lang)}</small><div className="slk-result-score"><Badge src={fixture.home_badge} label={name(fixture,"home",lang)}/><strong>{fixture.home_goals} – {fixture.away_goals}</strong><Badge src={fixture.away_badge} label={name(fixture,"away",lang)}/></div>{shootoutTeam&&<p className="slk-shootout-result">{t.shootoutWon}: <b>{shootoutTeam}</b></p>}{events.length>0&&<details><summary>{t.events}</summary>{events.map(e=><p key={e.id}><b>{e.minute}{e.added_time?`+${e.added_time}`:""}′</b> {name(e,"scorer",lang)}{e.assist_en?` · ${name(e,"assist",lang)}`:""}</p>)}</details>}{kicks.length>0&&<details><summary>{t.shootoutKicks}</summary>{kicks.map(k=><p key={k.id} className={k.scored?"shootout-scored":"shootout-missed"}><b>{k.scored?"✓":"×"}</b> {name(k,"player",lang)} · {k.scored?t.scored:t.missed}</p>)}</details>}</article>; }
