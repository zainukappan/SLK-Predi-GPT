const { Pool } = require('pg');
const fs = require('fs');
const url = fs.readFileSync('.env.local', 'utf8').split('\n').find(l => l.startsWith('DATABASE_URL=')).split('=')[1].trim();

const pool = new Pool({connectionString: url});

async function run() {
  try {
    const res = await pool.query(
      "INSERT INTO sbk.news(slug,title_en,title_ml,excerpt_en,excerpt_ml,content_en,content_ml,image_url,published,published_at,author_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,CASE WHEN $9=true THEN now() ELSE null END,$10) RETURNING *",
      ['test-slug', 'title1', 'title2', 'ex1', 'ex2', 'cont1', 'cont2', 'https://img', false, '00000000-0000-0000-0000-000000000000']
    );
    console.log("Success:", res.rows);
  } catch (err) {
    console.error("DB Error:", err);
  }
  process.exit(0);
}
run();
