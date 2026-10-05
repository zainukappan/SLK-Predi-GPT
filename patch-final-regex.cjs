const fs = require('fs');
let ts = fs.readFileSync('src/lib/service.ts', 'utf8');

ts = ts.replace(
/shootoutKicks:\s*\(await\s*db\.query\("SELECT\s*\*\s*FROM\s*sbk\.public_shootout_kicks\(\)"\)\)\.rows,\s*generatedAt:/,
`shootoutKicks: (await db.query("SELECT * FROM sbk.public_shootout_kicks()")).rows,
      news: (await db.query("SELECT * FROM sbk.public_news_feed()")).rows,
      generatedAt:`
);

ts = ts.replace(
/if\s*\(section\s*===\s*"home"\)\s*\{/,
`if (section === "admin") {
        if (params.tab === "news") {
          data.newsList = (
            await db.query("SELECT * FROM sbk.news ORDER BY created_at DESC")
          ).rows;
        }
      }
      if (section === "home") {`
);

fs.writeFileSync('src/lib/service.ts', ts);
