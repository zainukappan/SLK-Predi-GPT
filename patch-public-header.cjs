const fs = require('fs');
let ts = fs.readFileSync('src/components/public-sports-hub.tsx', 'utf8');

// First replace the inline header with the new PublicHeader component
const oldHeaderRegex = /<header className="slk-public-header">[\s\S]*?<\/header>/;

const newPublicHeader = `
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

export function PublicSportsHub({data}:{data:Row}) {
    const {lang} = useLanguage(), t=copy[lang], [menu,setMenu]=useState(false);
    const upcoming=[...data.fixtures].filter((f:Row)=>f.status==="scheduled"&&new Date(f.kickoff)>new Date()).sort((a:Row,b:Row)=>+new Date(a.kickoff)-+new Date(b.kickoff))[0];
    const finals=[...data.fixtures].filter((f:Row)=>f.status==="finalized").sort((a:Row,b:Row)=>+new Date(b.kickoff)-+new Date(a.kickoff));
    const latest=finals[0];
    const playerRows=(metric:"top"|"assists"|"contrib")=>{const key=metric==="top"?"goals":metric==="assists"?"assists":"contributions";return [...data.players].filter((player:Row)=>Number(player[key])>0).sort((a:Row,b:Row)=>Number(b[key])-Number(a[key])).slice(0,5);};
    return <div className="slk-public">
      <PublicHeader />`;

// Because PublicSportsHub is declared on one line initially, let's just do string replacement
ts = ts.replace(/export function PublicSportsHub[\s\S]*?<main>/, newPublicHeader + '\n      <main>');

fs.writeFileSync('src/components/public-sports-hub.tsx', ts);
