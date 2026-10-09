import { loadPublicSportsData } from "@/lib/service";
import Link from "next/link";
import { headers } from "next/headers";
import { ChevronRight, Clock } from "lucide-react";
import { PublicHeader } from "@/components/public-sports-hub";

export default async function NewsIndexPage() {
  const data = await loadPublicSportsData();
  const head = await headers();
  const langHeader = head.get("accept-language") || "en";
  const lang = langHeader.includes("ml") ? "ml" : "en";
  const t = lang === "ml" ? { title: "വാർത്തകൾ", readMore: "കൂടുതൽ വായിക്കുക" } : { title: "News Portal", readMore: "Read more" };

  const news = (data as any).news || [];

  return (
    <div className="slk-public-layout slk-public">
      <PublicHeader />
      <main className="slk-public-main">
        <section className="slk-section-title" style={{ marginTop: "2rem" }}>
          <div>
            <small>SBK COMMUNITY</small>
            <h2>{t.title}</h2>
          </div>
          <Link href="/" className="slk-predict-cta">Home <ChevronRight/></Link>
        </section>

        <div className="slk-player-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
          {news.map((item: any) => (
            <article key={item.id} className="slk-data-card" style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
              <Link href={`/news/${item.slug}`} style={{ flex: 1, display: "flex", flexDirection: "column", textDecoration: "none", color: "inherit" }}>
                <div style={{ aspectRatio: "16/9", background: "#f1f5f9", position: "relative" }}>
                  {item.image_url && <img src={item.image_url} alt={item.title_en} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                </div>
                <div style={{ padding: "20px", display: "flex", flexDirection: "column", flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--muted)", fontSize: "12px", marginBottom: "12px" }}>
                    <Clock size={12} />
                    <span>{new Date(item.published_at).toLocaleDateString()}</span>
                  </div>
                  <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--navy)", marginBottom: "8px", lineHeight: 1.3 }}>
                    {lang === "ml" ? item.title_ml : item.title_en}
                  </h3>
                  <p style={{ color: "var(--muted)", fontSize: "14px", marginBottom: "16px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {lang === "ml" ? item.excerpt_ml : item.excerpt_en}
                  </p>
                  <div style={{ marginTop: "auto", color: "var(--primary)", fontWeight: 800, fontSize: "13px" }}>
                    {t.readMore} ›
                  </div>
                </div>
              </Link>
            </article>
          ))}
          {!news.length && <p>No news articles found.</p>}
        </div>
      </main>
    </div>
  );
}
