const fs = require('fs');
let ts = fs.readFileSync('src/lib/service.ts', 'utf8');

ts += `
export async function getNewsArticle(slug: string) {
  return transaction(null, async (db) => {
    return (
      await db.query(
        "SELECT n.id, n.slug, n.title_en, n.title_ml, n.content_en, n.content_ml, n.image_url, n.published_at, p.display_name as author_name FROM sbk.news n LEFT JOIN sbk.profiles p ON p.id = n.author_id WHERE n.slug = $1 AND n.published = true",
        [slug]
      )
    ).rows[0];
  });
}
`;
fs.writeFileSync('src/lib/service.ts', ts);
