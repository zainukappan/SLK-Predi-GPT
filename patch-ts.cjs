const fs = require('fs');

// 1 & 2 & 3. Fix news/page.tsx
let newsPage = fs.readFileSync('src/app/news/page.tsx', 'utf8');
newsPage = newsPage.replace(`import { Badge } from "@/components/public-sports-hub";\r\n`, '');
newsPage = newsPage.replace(`import { Badge } from "@/components/public-sports-hub";\n`, '');
newsPage = newsPage.replace(`const langHeader = headers().get("accept-language") || "en";`, `const head = await headers();\n  const langHeader = head.get("accept-language") || "en";`);
newsPage = newsPage.replace(`const news = data.news || [];`, `const news = (data as any).news || [];`);
fs.writeFileSync('src/app/news/page.tsx', newsPage);

// 4. Fix news/[slug]/page.tsx
let newsArticle = fs.readFileSync('src/app/news/[slug]/page.tsx', 'utf8');
newsArticle = newsArticle.replace(`const langHeader = headers().get("accept-language") || "en";`, `const head = await headers();\n  const langHeader = head.get("accept-language") || "en";`);
fs.writeFileSync('src/app/news/[slug]/page.tsx', newsArticle);

// 5 & 6. Fix admin-news.tsx
let adminNews = fs.readFileSync('src/components/admin-news.tsx', 'utf8');
adminNews = adminNews.replace(`import { action } from "@/app/api/action/route";`, `import { action } from "./provider";`);
adminNews = adminNews.replace(`const value = Object.fromEntries(formData.entries());`, `const value = Object.fromEntries(formData.entries()) as Record<string, any>;`);
fs.writeFileSync('src/components/admin-news.tsx', adminNews);
