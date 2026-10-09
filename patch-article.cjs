const fs = require('fs');
let ts = fs.readFileSync('src/app/news/[slug]/page.tsx', 'utf8');

const titleSection = `          <h1 style={{ fontSize: "32px", fontWeight: 900, color: "var(--navy)", margin: "0 0 16px 0", lineHeight: 1.2 }}>
            {title}
          </h1>`;

const newTitleSection = `          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
            <span style={{ padding: "4px 12px", background: "var(--blue)", color: "white", fontSize: "11px", fontWeight: 900, borderRadius: "4px", textTransform: "uppercase" }}>{article.category || "Football"}</span>
            {article.tags && article.tags.map((tag: string) => (
              <span key={tag} style={{ padding: "4px 12px", background: "#f1f5f9", color: "var(--muted)", fontSize: "11px", fontWeight: 800, borderRadius: "4px" }}>#{tag}</span>
            ))}
          </div>
          <h1 style={{ fontSize: "32px", fontWeight: 900, color: "var(--navy)", margin: "0 0 16px 0", lineHeight: 1.2 }}>
            {title}
          </h1>`;

ts = ts.replace(titleSection, newTitleSection);
fs.writeFileSync('src/app/news/[slug]/page.tsx', ts);
