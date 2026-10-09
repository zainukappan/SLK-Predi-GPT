import { loadPublicSportsData } from "@/lib/service";
import Link from "next/link";
import { headers } from "next/headers";
import { ChevronRight, Clock, Flame } from "lucide-react";
import { PublicHeader } from "@/components/public-sports-hub";
import type { Row } from "@/lib/db";

export default async function NewsIndexPage() {
  const data = await loadPublicSportsData();
  const head = await headers();
  const langHeader = head.get("accept-language") || "en";
  const lang = langHeader.includes("ml") ? "ml" : "en";
  
  const news = (data as any).news || [];
  
  // Categorize news (mock logic: first item is featured, next 3 are trending, rest are latest)
  const featured = news[0];
  const trending = news.slice(1, 4);
  const latest = news.slice(4);

  const t = lang === "ml" 
    ? { title: "വാർത്തകൾ", readMore: "വായിക്കുക", trending: "കൂടുതൽ വായിച്ചത്", all: "എല്ലാം", football: "ഫുട്ബോൾ", cricket: "ക്രിക്കറ്റ്", athletics: "അത്‌ലറ്റിക്സ്", others: "മറ്റു വാർത്തകൾ", latest: "പുതിയ വാർത്തകൾ", breaking: "പ്രധാന വാർത്തകൾ" } 
    : { title: "News Portal", readMore: "Read more", trending: "Trending", all: "All", football: "Football", cricket: "Cricket", athletics: "Athletics", others: "Others", latest: "Latest Updates", breaking: "Breaking" };

  const getCatColor = (cat: string) => {
    switch (cat) {
      case "cricket": return "#16dfd0";
      case "athletics": return "#ef4444";
      case "others": return "var(--navy)";
      default: return "var(--blue)";
    }
  };

  const getCatLabel = (cat: string) => {
    switch (cat) {
      case "cricket": return t.cricket;
      case "athletics": return t.athletics;
      case "others": return t.others;
      default: return t.football;
    }
  };

  return (
    <div className="slk-public-layout slk-public">
      <PublicHeader />
      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "20px 24px 50px", display: "flex", flexDirection: "column", gap: "40px" }}>
        
        {/* Categories Nav */}
        <nav style={{ display: "flex", overflowX: "auto", gap: "24px", borderBottom: "2px solid var(--border)", paddingBottom: "10px", marginTop: "10px" }}>
          <button style={{ border: "none", background: "none", color: "var(--blue)", borderBottom: "4px solid var(--blue)", fontWeight: 900, fontSize: "16px", padding: "4px 8px", cursor: "pointer", textTransform: "uppercase" }}>{t.all}</button>
          <button style={{ border: "none", background: "none", color: "#65738c", fontWeight: 700, fontSize: "16px", padding: "4px 8px", cursor: "pointer", textTransform: "uppercase" }}>{t.football}</button>
          <button style={{ border: "none", background: "none", color: "#65738c", fontWeight: 700, fontSize: "16px", padding: "4px 8px", cursor: "pointer", textTransform: "uppercase" }}>{t.cricket}</button>
          <button style={{ border: "none", background: "none", color: "#65738c", fontWeight: 700, fontSize: "16px", padding: "4px 8px", cursor: "pointer", textTransform: "uppercase" }}>{t.athletics}</button>
          <button style={{ border: "none", background: "none", color: "#65738c", fontWeight: 700, fontSize: "16px", padding: "4px 8px", cursor: "pointer", textTransform: "uppercase" }}>{t.others}</button>
        </nav>

        {featured && (
          <section className="slk-news-hero" style={{ display: "grid", gap: "24px" }}>
            <article className="slk-data-card" style={{ padding: 0, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <Link href={`/news/${featured.slug}`} style={{ flex: 1, textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column" }}>
                <div style={{ position: "relative", width: "100%", height: "450px", backgroundColor: "#f1f5f9" }}>
                  {featured.image_url && <img src={featured.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(7,26,61,0.95), rgba(7,26,61,0.4), transparent)" }}></div>
                  
                  <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", padding: "40px", color: "white" }}>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
                      <span style={{ padding: "4px 12px", background: "var(--yellow)", color: "var(--navy)", fontSize: "11px", fontWeight: 900, borderRadius: "4px", textTransform: "uppercase" }}>{t.breaking}</span>
                      {featured.tags && featured.tags.map((tag: string) => (
                        <span key={tag} style={{ padding: "4px 12px", background: "rgba(255,255,255,0.2)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.3)", color: "white", fontSize: "11px", fontWeight: 700, borderRadius: "4px" }}>#{tag}</span>
                      ))}
                    </div>
                    <h1 style={{ fontSize: "36px", fontWeight: 900, lineHeight: 1.2, margin: "0 0 12px 0" }}>{lang === "ml" ? featured.title_ml : featured.title_en}</h1>
                    <p style={{ color: "#d7e8ff", fontSize: "16px", marginBottom: "20px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", maxWidth: "800px" }}>
                      {lang === "ml" ? featured.excerpt_ml : featured.excerpt_en}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "12px", fontWeight: 700, color: "#9fb0cd" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Clock size={14} /> {new Date(featured.published_at).toLocaleDateString()}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--yellow)" }}>{getCatLabel(featured.category)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            </article>

            {trending.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h2 style={{ fontSize: "20px", fontWeight: 900, textTransform: "uppercase", color: "var(--navy)", margin: 0 }}>{t.trending}</h2>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--blue)" }}>Trending ›</span>
                </div>
                {trending.map((item: any, i: number) => (
                  <article key={item.id} className="slk-data-card" style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px", border: "1px solid var(--border)", borderRadius: "16px" }}>
                    <Link href={`/news/${item.slug}`} style={{ display: "flex", alignItems: "center", gap: "16px", textDecoration: "none", color: "inherit", flex: 1 }}>
                      <div style={{ fontSize: "36px", fontWeight: 900, color: "var(--border)" }}>{i + 1}</div>
                      <div>
                        <div style={{ fontSize: "10px", fontWeight: 800, color: getCatColor(item.category), marginBottom: "4px", textTransform: "uppercase" }}>
                          {getCatLabel(item.category)} {item.tags?.[0] ? `• #${item.tags[0]}` : ""}
                        </div>
                        <h3 style={{ fontSize: "14px", fontWeight: 800, margin: "0 0 4px 0", lineHeight: 1.3 }}>{lang === "ml" ? item.title_ml : item.title_en}</h3>
                        <div style={{ fontSize: "12px", color: "var(--muted)" }}>{new Date(item.published_at).toLocaleDateString()}</div>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        <section>
          <div style={{ marginBottom: "24px" }}>
            <small style={{ color: "var(--blue)", fontWeight: 900, fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase" }}>{t.latest}</small>
            <h2 style={{ fontSize: "28px", fontWeight: 900, color: "var(--navy)", margin: "4px 0 0 0" }}>{t.title}</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
            {latest.map((item: any) => (
              <article key={item.id} className="slk-data-card" style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
                <Link href={`/news/${item.slug}`} style={{ flex: 1, display: "flex", flexDirection: "column", textDecoration: "none", color: "inherit" }}>
                  <div style={{ aspectRatio: "16/9", background: "#f1f5f9", position: "relative" }}>
                    {item.image_url && <img src={item.image_url} alt={item.title_en} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                    <div style={{ position: "absolute", top: "8px", left: "8px", background: getCatColor(item.category), color: "white", fontSize: "10px", fontWeight: 900, padding: "4px 8px", borderRadius: "4px", textTransform: "uppercase" }}>
                      {getCatLabel(item.category)}
                    </div>
                  </div>
                  <div style={{ padding: "20px", display: "flex", flexDirection: "column", flex: 1 }}>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                      {item.tags && item.tags.map((tag: string) => (
                        <span key={tag} style={{ fontSize: "10px", fontWeight: 800, color: "var(--muted)", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>#{tag}</span>
                      ))}
                    </div>
                    <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--navy)", marginBottom: "8px", lineHeight: 1.3 }}>
                      {lang === "ml" ? item.title_ml : item.title_en}
                    </h3>
                    <p style={{ color: "var(--muted)", fontSize: "14px", marginBottom: "16px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {lang === "ml" ? item.excerpt_ml : item.excerpt_en}
                    </p>
                    <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 700 }}>{new Date(item.published_at).toLocaleDateString()}</span>
                      <span style={{ color: "var(--blue)", fontWeight: 900, fontSize: "11px", textTransform: "uppercase" }}>{t.readMore} ›</span>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
            {!latest.length && !featured && <p>No news articles found.</p>}
          </div>
        </section>

      </main>
      <style dangerouslySetInnerHTML={{__html: `
        @media (min-width: 1024px) {
          .slk-news-hero {
            grid-template-columns: 2fr 1fr;
          }
        }
      `}} />
    </div>
  );
}
