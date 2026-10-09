const fs = require('fs');
let ts = fs.readFileSync('src/app/news/page.tsx', 'utf8');

ts = ts.replace(/\\`/g, "`");
fs.writeFileSync('src/app/news/page.tsx', ts);
