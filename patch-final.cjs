const fs = require('fs');
let ts = fs.readFileSync('src/lib/service.ts', 'utf8');

ts = ts.replace(
`      if (section === "home") {`,
`      if (section === "admin") {
        if (params.tab === "news") {
          data.newsList = (
            await db.query("SELECT * FROM sbk.news ORDER BY created_at DESC")
          ).rows;
        }
      }
      if (section === "home") {`
);

ts = ts.replace(
`      shootoutKicks: (await db.query("SELECT * FROM sbk.public_shootout_kicks()")).rows,
      generatedAt: new Date().toISOString(),
    }));`,
`      shootoutKicks: (await db.query("SELECT * FROM sbk.public_shootout_kicks()")).rows,
      news: (await db.query("SELECT * FROM sbk.public_news_feed()")).rows,
      generatedAt: new Date().toISOString(),
    }));`
);
fs.writeFileSync('src/lib/service.ts', ts);

let admin = fs.readFileSync('src/components/admin.tsx', 'utf8');
admin = admin.replace(
`    "content",
    "reports",`,
`    "content",
    "news",
    "reports",`
);
fs.writeFileSync('src/components/admin.tsx', admin);
