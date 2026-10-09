const fs = require('fs');

// 1. Patch /news/page.tsx
let newsPage = fs.readFileSync('src/app/news/page.tsx', 'utf8');
newsPage = newsPage.replace(
  'import { ChevronRight, Clock } from "lucide-react";',
  'import { ChevronRight, Clock } from "lucide-react";\nimport { PublicHeader } from "@/components/public-sports-hub";'
);
newsPage = newsPage.replace(
  '<div className="slk-public-layout">',
  '<div className="slk-public-layout slk-public">\n      <PublicHeader />'
);
fs.writeFileSync('src/app/news/page.tsx', newsPage);

// 2. Patch /news/[slug]/page.tsx
let newsArticle = fs.readFileSync('src/app/news/[slug]/page.tsx', 'utf8');
newsArticle = newsArticle.replace(
  'import ReactMarkdown from "react-markdown";',
  'import ReactMarkdown from "react-markdown";\nimport { PublicHeader } from "@/components/public-sports-hub";'
);
newsArticle = newsArticle.replace(
  '<div className="slk-public-layout">',
  '<div className="slk-public-layout slk-public">\n      <PublicHeader />'
);
newsArticle = newsArticle.replace(
  '<div className="slk-public-layout">',
  '<div className="slk-public-layout slk-public">\n      <PublicHeader />' // for the error state too
);
fs.writeFileSync('src/app/news/[slug]/page.tsx', newsArticle);
