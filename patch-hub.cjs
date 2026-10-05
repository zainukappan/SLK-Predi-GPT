const fs = require('fs');
let ts = fs.readFileSync('src/components/public-sports-hub.tsx', 'utf8');

const newsBlock = `        <section className="slk-hero" id="overview"><div><span className="slk-public-pill">{t.public}</span><h1>{t.title}</h1><p>{t.sub}</p></div><img src="/slk-logo-white.webp" alt="Super League Kerala"/></section>
        
        {data.news && data.news.length > 0 && (
          <section className="slk-match-grid" style={{ marginTop: "2rem", display: "block" }}>
            <div className="slk-section-title" style={{ marginBottom: "1rem" }}>
              <div>
                <small>SBK COMMUNITY</small>
                <h2>{lang === "ml" ? "വാർത്തകൾ" : "News Portal"}</h2>
              </div>
              <Link href="/news" className="slk-predict-cta">
                {lang === "ml" ? "കൂടുതൽ വായിക്കുക" : "View All"} <ChevronRight/>
              </Link>
            </div>
            <div className="slk-player-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
              {data.news.slice(0, 3).map((item: any) => (
                <article key={item.id} className="slk-data-card" style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
                  <Link href={\`/news/\${item.slug}\`} style={{ flex: 1, display: "flex", flexDirection: "column", textDecoration: "none", color: "inherit" }}>
                    <div style={{ aspectRatio: "16/9", background: "#f1f5f9", position: "relative" }}>
                      {item.image_url && <img src={item.image_url} alt={item.title_en} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                    </div>
                    <div style={{ padding: "20px", display: "flex", flexDirection: "column", flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--muted)", fontSize: "12px", marginBottom: "12px" }}>
                        <CalendarDays size={12} />
                        <span>{new Date(item.published_at).toLocaleDateString()}</span>
                      </div>
                      <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--navy)", marginBottom: "8px", lineHeight: 1.3 }}>
                        {lang === "ml" ? item.title_ml : item.title_en}
                      </h3>
                      <p style={{ color: "var(--muted)", fontSize: "14px", marginBottom: "16px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {lang === "ml" ? item.excerpt_ml : item.excerpt_en}
                      </p>
                      <div style={{ marginTop: "auto", color: "var(--primary)", fontWeight: 800, fontSize: "13px" }}>
                        {lang === "ml" ? "വായിക്കുക" : "Read more"} ›
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </section>
        )}`;

ts = ts.replace(
`        <section className="slk-hero" id="overview"><div><span className="slk-public-pill">{t.public}</span><h1>{t.title}</h1><p>{t.sub}</p></div><img src="/slk-logo-white.webp" alt="Super League Kerala"/></section>`,
newsBlock
);

fs.writeFileSync('src/components/public-sports-hub.tsx', ts);
