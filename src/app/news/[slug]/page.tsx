import { getNewsArticle } from "@/lib/service";
import Link from "next/link";
import { headers } from "next/headers";
import { ChevronRight, Clock, User } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default async function NewsArticlePage({ params }: { params: { slug: string } }) {
  const article = await getNewsArticle(params.slug);
  const head = await headers();
  const langHeader = head.get("accept-language") || "en";
  const lang = langHeader.includes("ml") ? "ml" : "en";

  if (!article) {
    return (
      <div className="slk-public-layout">
        <main className="slk-public-main" style={{ textAlign: "center", padding: "100px 20px" }}>
          <h2>Article not found</h2>
          <Link href="/news" className="button primary" style={{ marginTop: "20px", display: "inline-block" }}>Back to News</Link>
        </main>
      </div>
    );
  }

  const title = lang === "ml" ? article.title_ml : article.title_en;
  const content = lang === "ml" ? article.content_ml : article.content_en;

  return (
    <div className="slk-public-layout">
      <main className="slk-public-main">
        <div style={{ marginBottom: "20px", marginTop: "20px" }}>
          <Link href="/news" style={{ display: "inline-flex", alignItems: "center", color: "var(--primary)", fontWeight: 700, fontSize: "14px", textDecoration: "none" }}>
            <ChevronRight style={{ transform: "rotate(180deg)" }} size={16} /> Back to News
          </Link>
        </div>

        <article className="slk-data-card" style={{ padding: 0, overflow: "hidden", border: "none" }}>
          {article.image_url && (
            <div style={{ width: "100%", aspectRatio: "21/9", backgroundColor: "#f1f5f9" }}>
              <img src={article.image_url} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}
          <div style={{ padding: "40px 20px", maxWidth: "800px", margin: "0 auto" }}>
            <div style={{ display: "flex", gap: "15px", marginBottom: "20px", color: "var(--muted)", fontSize: "14px", fontWeight: 600 }}>
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}><Clock size={16} /> {new Date(article.published_at).toLocaleDateString()}</span>
              {article.author_name && <span style={{ display: "flex", alignItems: "center", gap: "5px" }}><User size={16} /> {article.author_name}</span>}
            </div>
            <h1 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 900, color: "var(--navy)", marginBottom: "30px", lineHeight: 1.2 }}>
              {title}
            </h1>
            
            <div className="prose-content" style={{ color: "#334155", fontSize: "18px", lineHeight: 1.7 }}>
              <ReactMarkdown>{content || ""}</ReactMarkdown>
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}
