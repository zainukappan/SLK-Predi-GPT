"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { CalendarDays, ChevronRight, Goal, Handshake, MapPin, Menu, Shield, Trophy, Users } from "lucide-react";
import type { Row } from "@/lib/db";
import { ist } from "@/lib/domain";
import { LanguageSwitch, useLanguage } from "./provider";

const copy = {
  en: { overview:"Overview",matches:"Matches",table:"Points Table",players:"Players",prediction:"Prediction Leaderboard",login:"Member Login",public:"PUBLIC VIEW",title:"SUPER LEAGUE KERALA",sub:"Fixtures, results, standings and player statistics",next:"Next Match",latest:"Latest Result",noNext:"No upcoming fixture has been published.",fullTime:"Full Time",top:"Top Scorers",assists:"Assists",contrib:"Goal Contributions",played:"P",wins:"W",draws:"D",losses:"L",gf:"GF",ga:"GA",gd:"GD",pts:"Pts",rank:"Rank",member:"Member",predicted:"Matches Predicted",total:"Total Points",updated:"Updated",matchCentre:"Match Centre",events:"Goal events",noStats:"Player statistics will appear after goal events are entered.",noResults:"No finalized results yet.",home:"Home" },
  ml: { overview:"അവലോകനം",matches:"മത്സരങ്ങൾ",table:"പോയിന്റ് പട്ടിക",players:"കളിക്കാർ",prediction:"പ്രവചന ലീഡർബോർഡ്",login:"മെമ്പർ ലോഗിൻ",public:"പബ്ലിക് വ്യൂ",title:"സൂപ്പർ ലീഗ് കേരള",sub:"മത്സരങ്ങൾ, ഫലങ്ങൾ, പോയിന്റ് പട്ടിക, കളിക്കാരുടെ കണക്കുകൾ",next:"അടുത്ത മത്സരം",latest:"അവസാന ഫലം",noNext:"വരാനിരിക്കുന്ന മത്സരം പ്രസിദ്ധീകരിച്ചിട്ടില്ല.",fullTime:"ഫുൾ ടൈം",top:"ടോപ് സ്കോറേഴ്സ്",assists:"അസിസ്റ്റുകൾ",contrib:"ഗോൾ കോൺട്രിബ്യൂഷൻസ്",played:"മ",wins:"ജ",draws:"സ",losses:"പ",gf:"GF",ga:"GA",gd:"GD",pts:"പോ",rank:"റാങ്ക്",member:"അംഗം",predicted:"പ്രവചിച്ച മത്സരങ്ങൾ",total:"ആകെ പോയിന്റ്",updated:"പുതുക്കിയത്",matchCentre:"മാച്ച് സെന്റർ",events:"ഗോൾ വിവരങ്ങൾ",noStats:"ഗോൾ വിവരങ്ങൾ ചേർത്ത ശേഷം കളിക്കാരുടെ കണക്കുകൾ ഇവിടെ വരും.",noResults:"ഫലം സ്ഥിരീകരിച്ച മത്സരങ്ങളില്ല.",home:"ഹോം" }
} as const;
const leaderboardCopy = {
  en: { serial:"S.No.",winner:"Who will win the match?",score:"What will the score be?",first:"Who will score first?",round:"Round" },
  ml: { serial:"ക്രമ നമ്പർ",winner:"മത്സരത്തിൽ ആര് ജയിക്കും?",score:"സ്കോർ എന്തായിരിക്കും?",first:"ആരാണ് ആദ്യം ഗോൾ നേടുക?",round:"റൗണ്ട്" },
} as const;
const name = (row: Row, key: string, lang: "en"|"ml") => row[`${key}_${lang}`] || row[`${key}_en`] || "—";
function Badge({src,label}:{src?:string;label:string}) { return src ? <img className="slk-team-badge" src={src} alt={label} /> : <span className="slk-team-placeholder" role="img" aria-label={label}><Shield /></span>; }

export function PublicSportsHub({data}:{data:Row}) {
  const {lang} = useLanguage(), t=copy[lang], [menu,setMenu]=useState(false);
  const upcoming=[...data.fixtures].filter((f:Row)=>f.status==="scheduled"&&new Date(f.kickoff)>new Date()).sort((a:Row,b:Row)=>+new Date(a.kickoff)-+new Date(b.kickoff))[0];
  const finals=[...data.fixtures].filter((f:Row)=>f.status==="finalized").sort((a:Row,b:Row)=>+new Date(b.kickoff)-+new Date(a.kickoff));
  const latest=finals[0];
  const playerRows=(metric:"top"|"assists"|"contrib")=>{const key=metric==="top"?"goals":metric==="assists"?"assists":"contributions";return [...data.players].filter((player:Row)=>Number(player[key])>0).sort((a:Row,b:Row)=>Number(b[key])-Number(a[key])).slice(0,5);};
  return <div className="slk-public">
    <header className="slk-public-header">
      <Link href="/SuperLeagueKerala" className="slk-public-brand"><img src="/sbk-logo.png" alt="SBK"/><span>SBK <b>Football Hub</b></span></Link>
      <button className="slk-menu-button" aria-label="Menu" onClick={()=>setMenu(!menu)}><Menu/></button>
      <nav className={menu?"open":""}><a href="#overview">{t.overview}</a><a href="#matches">{t.matches}</a><a href="#table">{t.table}</a><a href="#players">{t.players}</a><a href="#predictions">{t.prediction}</a></nav>
      <LanguageSwitch />
      <Link className="slk-login" href="/">{t.login}</Link>
    </header>
    <main>
      <section className="slk-hero" id="overview"><div><span className="slk-public-pill">{t.public}</span><h1>{t.title}</h1><p>{t.sub}</p></div><img src="/slk-logo-white.webp" alt="Super League Kerala"/></section>
      <section className="slk-match-grid" id="matches">
        <MatchFeature title={t.next} fixture={upcoming} empty={t.noNext} lang={lang} action={t.matchCentre}/>
        <MatchFeature title={t.latest} fixture={latest} empty={t.noResults} lang={lang} result action={t.fullTime}/>
      </section>
      <section className="slk-data-section" id="table">
        <article className="slk-data-card slk-table-card"><CardTitle icon={<Trophy/>} title={t.table}/><Standings rows={data.table} t={t} lang={lang}/></article>
        <div className="slk-stat-cards" id="players">
          <article className="slk-data-card slk-stat-card"><CardTitle icon={<Goal/>} title={t.top}/><PlayerStats rows={playerRows("top")} metric="top" t={t} lang={lang}/></article>
          <article className="slk-data-card slk-stat-card"><CardTitle icon={<Handshake/>} title={t.assists}/><PlayerStats rows={playerRows("assists")} metric="assists" t={t} lang={lang}/></article>
          <article className="slk-data-card slk-stat-card"><CardTitle icon={<Users/>} title={t.contrib}/><PlayerStats rows={playerRows("contrib")} metric="contrib" t={t} lang={lang}/></article>
        </div>
      </section>
      <section className="slk-results-section"><div className="slk-section-title"><div><small>{t.matchCentre}</small><h2>{t.matches}</h2></div></div><div className="slk-results-grid">{finals.slice(0,6).map((f:Row)=><ResultCard key={f.id} fixture={f} events={data.events.filter((e:Row)=>e.fixture_id===f.id)} lang={lang} t={t}/>)}</div></section>
      <section className="slk-prediction-public" id="predictions"><div className="slk-section-title"><div><small>SBK COMMUNITY</small><h2>{t.prediction}</h2></div><span>{t.updated}: {ist(data.generatedAt,lang)}</span></div><PredictionLeaderboard rows={data.predictions} rounds={data.rounds} t={t} lang={lang}/></section>
    </main>
    <footer className="slk-public-footer"><img src="/sbk-logo.png" alt="SBK"/><p>Soccer Blues of Keralam · Fans predict. Football unites.</p><Link href="/">{t.login}<ChevronRight/></Link></footer>
  </div>;
}
function CardTitle({icon,title}:{icon:ReactNode;title:string}) { return <div className="slk-data-card-title"><span>{icon}</span><h2>{title}</h2></div>; }
function MatchFeature({title,fixture,empty,lang,result,action}:{title:string;fixture?:Row;empty:string;lang:"en"|"ml";result?:boolean;action:string}) { return <article className="slk-match-feature"><div className="slk-card-head"><strong>{title}</strong><span>{result?"FULL TIME":"UPCOMING"}</span></div>{fixture?<><div className="slk-versus"><div><Badge src={fixture.home_badge} label={name(fixture,"home",lang)}/><b>{name(fixture,"home",lang)}</b></div><strong>{result?`${fixture.home_goals} – ${fixture.away_goals}`:"VS"}</strong><div><Badge src={fixture.away_badge} label={name(fixture,"away",lang)}/><b>{name(fixture,"away",lang)}</b></div></div><div className="slk-match-meta"><span><CalendarDays/>{ist(fixture.kickoff,lang)}</span>{name(fixture,"venue",lang)!=="—"&&<span><MapPin/>{name(fixture,"venue",lang)}</span>}</div></>:<p className="slk-empty">{empty}</p>}</article>; }
function Standings({rows,t,lang}:{rows:Row[];t:any;lang:"en"|"ml"}) { return <div className="slk-public-table"><table><thead><tr><th>Pos</th><th>Club</th><th>{t.played}</th><th>{t.wins}</th><th>{t.draws}</th><th>{t.losses}</th><th>{t.gf}</th><th>{t.ga}</th><th>{t.gd}</th><th>{t.pts}</th></tr></thead><tbody>{rows.map(r=><tr key={r.team_id}><td><b>{r.table_position}</b></td><td><span className="slk-club"><Badge src={r.badge} label={name(r,"name",lang)}/><strong>{name(r,"name",lang)}</strong></span></td><td>{r.played}</td><td>{r.wins}</td><td>{r.draws}</td><td>{r.losses}</td><td>{r.goals_for}</td><td>{r.goals_against}</td><td>{r.goal_difference}</td><td><b>{r.points}</b></td></tr>)}</tbody></table></div>; }
function PredictionLeaderboard({rows,rounds,t,lang}:{rows:Row[];rounds:Row[];t:any;lang:"en"|"ml"}) { const labels=leaderboardCopy[lang]; return <div className="slk-public-table slk-prediction-table"><table><thead><tr><th rowSpan={2}>{labels.serial}</th><th rowSpan={2}>{t.rank}</th><th rowSpan={2}>{t.member}</th><th rowSpan={2}>{labels.winner}</th><th rowSpan={2}>{labels.score}</th><th rowSpan={2}>{labels.first}</th><th rowSpan={2}>{t.predicted}</th>{rounds.length>0&&<th colSpan={rounds.length} className="round-group">{labels.round}</th>}<th rowSpan={2}>{t.total}</th></tr>{rounds.length>0&&<tr>{rounds.map(round=><th key={round.id} title={name(round,"name",lang)}>{round.sort_order}</th>)}</tr>}</thead><tbody>{rows.map((r:Row,index:number)=><tr key={`${r.display_name}-${index}`}><td>{index+1}</td><td><span className={`slk-rank-badge rank-${r.rank}`}>{r.rank}</span></td><td><strong>{r.display_name}</strong></td><td>{r.correct}</td><td>{r.exact}</td><td>{r.first_goal_correct}</td><td>{r.participation}</td>{rounds.map(round=><td key={round.id} className="round-score">{r.round_points?.[round.id]??0}</td>)}<td><strong>{r.points}</strong></td></tr>)}</tbody></table></div>; }
function PlayerStats({rows,metric,t,lang}:{rows:Row[];metric:string;t:any;lang:"en"|"ml"}) { const key=metric==="top"?"goals":metric==="assists"?"assists":"contributions"; return rows.length?<div className="slk-player-grid">{rows.slice(0,12).map((r,i)=><article key={r.player_id}><span className="slk-player-rank">{i+1}</span><Badge src={r.badge} label={name(r,"team",lang)}/><div><strong>{name(r,"player",lang)}</strong><small>{name(r,"team",lang)}{r.shirt_number?` · #${r.shirt_number}`:""}</small></div><b>{r[key]}</b></article>)}</div>:<p className="slk-empty">{t.noStats}</p>; }
function ResultCard({fixture,events,lang,t}:{fixture:Row;events:Row[];lang:"en"|"ml";t:any}) { return <article className="slk-result-card"><small>{name(fixture,"round",lang)} · {ist(fixture.kickoff,lang)}</small><div className="slk-result-score"><Badge src={fixture.home_badge} label={name(fixture,"home",lang)}/><strong>{fixture.home_goals} – {fixture.away_goals}</strong><Badge src={fixture.away_badge} label={name(fixture,"away",lang)}/></div>{events.length>0&&<details><summary>{t.events}</summary>{events.map(e=><p key={e.id}><b>{e.minute}{e.added_time?`+${e.added_time}`:""}′</b> {name(e,"scorer",lang)}{e.assist_en?` · ${name(e,"assist",lang)}`:""}</p>)}</details>}</article>; }
