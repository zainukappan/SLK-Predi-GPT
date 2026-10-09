const fs = require('fs');
let ts = fs.readFileSync('src/lib/service.ts', 'utf8');

// Update news schema
const oldSchema = `news: z.object({
    id: uuid.optional(),
    slug: z.string().trim().min(2).max(100),
    title_en: name,
    title_ml: name,
    excerpt_en: text.optional().nullable(),
    excerpt_ml: text.optional().nullable(),
    content_en: text.optional().nullable(),
    content_ml: text.optional().nullable(),
    image_url: text.optional().nullable(),
    published: bool.default(false),
  }),`;

const newSchema = `news: z.object({
    id: uuid.optional(),
    slug: z.string().trim().min(2).max(100),
    category: z.string().trim().default("football"),
    tags: z.union([z.string(), z.array(z.string())]).transform((v) => 
      (typeof v === "string" ? v.split(",").map((s) => s.trim()).filter(Boolean) : v)
    ).default([]),
    title_en: name,
    title_ml: name,
    excerpt_en: text.optional().nullable(),
    excerpt_ml: text.optional().nullable(),
    content_en: text.optional().nullable(),
    content_ml: text.optional().nullable(),
    image_url: text.optional().nullable(),
    published: bool.default(false),
  }),`;

ts = ts.replace(oldSchema, newSchema);

// Update getNewsArticle query
const oldGet = `SELECT n.id, n.slug, n.title_en, n.title_ml, n.content_en, n.content_ml, n.image_url, n.published_at, p.display_name as author_name FROM sbk.news n LEFT JOIN sbk.profiles p ON p.id = n.author_id WHERE n.slug = $1 AND n.published = true`;
const newGet = `SELECT n.id, n.slug, n.title_en, n.title_ml, n.content_en, n.content_ml, n.image_url, n.published_at, p.display_name as author_name, n.category, n.tags FROM sbk.news n LEFT JOIN sbk.profiles p ON p.id = n.author_id WHERE n.slug = $1 AND n.published = true`;
ts = ts.replace(oldGet, newGet);

fs.writeFileSync('src/lib/service.ts', ts);
