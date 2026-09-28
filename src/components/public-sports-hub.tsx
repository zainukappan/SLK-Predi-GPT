"use client";
import Link from "next/link";
import { useState } from "react";
import { CalendarDays, ChevronRight, Clock3, Goal, Handshake, MapPin, Menu, Shield, Trophy, Users } from "lucide-react";
import type { Row } from "@/lib/db";
import { ist } from "@/lib/domain";
import { LanguageSwitch, useLanguage } from "./provider";

const copy = {
  en: { overview:"Overview",matches:"Matches",table:"Points Table",players:"Players",prediction:"Prediction Leaderboard",login:"Member Login",public:"PUBLIC VIEW",title:"SUPER LEAGUE KERALA",sub:"Fixtures, results, standings and player statistics",next:"Next Match",latest:"Latest Result",noNext:"No upcoming fixture has been published.",fullTime:"Full Time",top:"Top Scorers",assists:"Assists",contrib:"Goal Contributions",played:"P",wins:"W",draws:"D",losses:"L",gf:"GF",ga:"GA",gd:"GD",pts:"Pts",rank:"Rank",member:"Member",predicted:"Matches Predicted",total:"Total Points",updated:"Updated",matchCentre:"Match Centre",events:"Goal events",noStats:"Player statistics will appear after goal events are entered.",noResults:"No finalized results yet.",home:"Home" },
  ml: { overview:"അവലോകനം",matches:"മത്സരങ്ങൾ",table:"പോയിന്റ് പട്ടിക",players:"കളിക്കാർ",prediction:"പ്രവചന ലീഡർബോർഡ്",login:"മെമ്പർ ലോഗിൻ",public:"പബ്ലിക് വ്യൂ",title:"സൂപ്പർ ലീഗ് കേരള",sub:"മത്സരങ്ങൾ, ഫലങ്ങൾ, പോയിന്റ് പട്ടിക, കളിക്കാരുടെ കണക്കുകൾ",next:"അടുത്ത മത്സരം",latest:"അവസാന ഫലം",noNext:"വരാനിരിക്കുന്ന മത്സരം പ്രസിദ്ധീകരിച്ചിട്ടില്ല.",fullTime:"ഫുൾ ടൈം",top:"ടോപ് സ്കോറേഴ്സ്",assists:"അസിസ്റ്റുകൾ",contrib:"ഗോൾ കോൺട്രിബ്യൂഷൻസ്",played:"മ",wins:"ജ",draws:"സ",losses:"പ",gf:"GF",ga:"GA",gd:"GD",pts:"പോ",rank:"റാങ്ക്",member:"അംഗം",predicted:"പ്രവചിച്ച മത്സരങ്ങൾ",total:"ആകെ പോയിന്റ്",updated:"പുതുക്കിയത്",matchCentre:"മാച്ച് സെന്റർ",events:"ഗോൾ വിവരങ്ങൾ",noStats:"ഗോൾ വിവരങ്ങൾ ചേർത്ത ശേഷം കളിക്കാരുടെ കണക്കുകൾ ഇവിടെ വരും.",noResults:"ഫലം സ്ഥിരീകരിച്ച മത്സരങ്ങളില്ല.",home:"ഹോം" }
} as const;
const name = (row: Row, key: string, lang: "en"|"ml") => row[`${key}_${lang}`] || row[`${key}_en`] || "—";
function Badge({src,label}:{src?:string;label:string}) { return src ? <img className="slk-team-badge" src={src} alt="" /> : <span className="slk-team-placeholder"><Shield /></span>; }

export function PublicSportsHub({data}:{data:Row}) {
  const {lang} = useLanguage(), t=copy[lang], [tab,setTab]=useState<"table"|"top"|"assists"|"contrib">("table"), [menu,setMenu]=useState(false);
  const upcoming=[...data.fixtures].filter((f:Row)=>f.status==="scheduled"&&new Date(f.kickoff)>new Date()).sort((a:Row,b:Row)=>+new Date(a.kickoff)-+new Date(b.kickoff))[0];
  const finals=[...data.fixtures].filter((f:Row)=>f.status==="finalized").sort((a:Row,b:Row)=>+new Date(b.kickoff)-+new Date(a.kickoff));
  const latest=finals[0];
  const playerRows=[...data.players].sort((a:Row,b:Row)=>Number(b[tab==="top"?"goals":tab==="assists"?"assists":"contributions"])-Number(a[tab==="top"?"goals":tab==="assists"?"assists":"contributions"]));
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
        <div className="slk-tabs" role="tablist">
          {(["table","top","assists","contrib"] as const).map(key=><button key={key} className={tab===key?"active":""} onClick={()=>setTab(key)}>{key==="table"?<Trophy/>:key==="top"?<Goal/>:key==="assists"?<Handshake/>:<Users/>}{t[key]}</button>)}
        </div>
        {tab==="table" ? <Standings rows={data.table} t={t} lang={lang}/> : <PlayerStats rows={playerRows} metric={tab} t={t} lang={lang}/>} 
      </section>
      <section className="slk-results-section"><div className="slk-section-title"><div><small>{t.matchCentre}</small><h2>{t.matches}</h2></div></div><div className="slk-results-grid">{finals.slice(0,6).map((f:Row)=><ResultCard key={f.id} fixture={f} events={data.events.filter((e:Row)=>e.fixture_id===f.id)} lang={lang} t={t}/>)}</div></section>
      <section className="slk-prediction-public" id="predictions"><div className="slk-section-title"><div><small>SBK COMMUNITY</small><h2>{t.prediction}</h2></div><span>{t.updated}: {ist(data.generatedAt,lang)}</span></div><div className="slk-public-table"><table><thead><tr><th>{t.rank}</th><th>{t.member}</th><th>{t.predicted}</th><th>{t.total}</th></tr></thead><tbody>{data.predictions.slice(0,20).map((r:Row)=><tr key={r.display_name}><td><b>#{r.rank}</b></td><td>{r.display_name}</td><td>{r.participation}</td><td><strong>{r.points}</strong></td></tr>)}</tbody></table></div></section>
    </main>
    <footer className="slk-public-footer"><img src="/sbk-logo.png" alt="SBK"/><p>Soccer Blues of Keralam · Fans predict. Football unites.</p><Link href="/">{t.login}<ChevronRight/></Link></footer>
  </div>;
}
function MatchFeature({title,fixture,empty,lang,result,action}:{title:string;fixture?:Row;empty:string;lang:"en"|"ml";result?:boolean;action:string}) { return <article className="slk-match-feature"><div className="slk-card-head"><strong>{title}</strong><span>{result?"FULL TIME":"UPCOMING"}</span></div>{fixture?<><div className="slk-versus"><div><Badge src={fixture.home_badge} label={name(fixture,"home",lang)}/><b>{name(fixture,"home",lang)}</b></div><strong>{result?`${fixture.home_goals} – ${fixture.away_goals}`:"VS"}</strong><div><Badge src={fixture.away_badge} label={name(fixture,"away",lang)}/><b>{name(fixture,"away",lang)}</b></div></div><div className="slk-match-meta"><span><CalendarDays/>{ist(fixture.kickoff,lang)}</span>{name(fixture,"venue",lang)!=="—"&&<span><MapPin/>{name(fixture,"venue",lang)}</span>}</div></>:<p className="slk-empty">{empty}</p>}</article>; }
function Standings({rows,t,lang}:{rows:Row[];t:any;lang:"en"|"ml"}) { return <div className="slk-public-table"><table><thead><tr><th>Pos</th><th>Club</th><th>{t.played}</th><th>{t.wins}</th><th>{t.draws}</th><th>{t.losses}</th><th>{t.gf}</th><th>{t.ga}</th><th>{t.gd}</th><th>{t.pts}</th></tr></thead><tbody>{rows.map(r=><tr key={r.team_id}><td><b>{r.table_position}</b></td><td><span className="slk-club"><Badge src={r.badge} label={name(r,"name",lang)}/><strong>{name(r,"name",lang)}</strong></span></td><td>{r.played}</td><td>{r.wins}</td><td>{r.draws}</td><td>{r.losses}</td><td>{r.goals_for}</td><td>{r.goals_against}</td><td>{r.goal_difference}</td><td><b>{r.points}</b></td></tr>)}</tbody></table></div>; }
function PlayerStats({rows,metric,t,lang}:{rows:Row[];metric:string;t:any;lang:"en"|"ml"}) { const key=metric==="top"?"goals":metric==="assists"?"assists":"contributions"; return rows.length?<div className="slk-player-grid">{rows.slice(0,12).map((r,i)=><article key={r.player_id}><span className="slk-player-rank">{i+1}</span><Badge src={r.badge} label={name(r,"team",lang)}/><div><strong>{name(r,"player",lang)}</strong><small>{name(r,"team",lang)}{r.shirt_number?` · #${r.shirt_number}`:""}</small></div><b>{r[key]}</b></article>)}</div>:<p className="slk-empty">{t.noStats}</p>; }
function ResultCard({fixture,events,lang,t}:{fixture:Row;events:Row[];lang:"en"|"ml";t:any}) { return <article className="slk-result-card"><small>{name(fixture,"round",lang)} · {ist(fixture.kickoff,lang)}</small><div><span>{name(fixture,"home",lang)}</span><strong>{fixture.home_goals} – {fixture.away_goals}</strong><span>{name(fixture,"away",lang)}</span></div>{events.length>0&&<details><summary>{t.events}</summary>{events.map(e=><p key={e.id}><b>{e.minute}{e.added_time?`+${e.added_time}`:""}′</b> {name(e,"scorer",lang)}{e.assist_en?` · ${name(e,"assist",lang)}`:""}</p>)}</details>}</article>; }
