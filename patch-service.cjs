const fs = require('fs');
let ts = fs.readFileSync('src/lib/service.ts', 'utf8');
ts = ts.replace(
`      if (kind === "adminPrediction") {
        return (
          await db.query("SELECT sbk.admin_upsert_prediction($1,$2,$3,$4,$5,$6) id", [
            value.member_id, value.fixture_id, value.home_goals, value.away_goals,
            value.predicted_winner, value.first_goal,
          ])
        ).rows[0];
      }
      if (kind === "results") {`,
`      if (kind === "adminPrediction") {
        return (
          await db.query("SELECT sbk.admin_upsert_prediction($1,$2,$3,$4,$5,$6) id", [
            value.member_id, value.fixture_id, value.home_goals, value.away_goals,
            value.predicted_winner, value.first_goal,
          ])
        ).rows[0];
      }
      if (kind === "news") {
        if (value.id) {
          return (
            await db.query(
              "UPDATE sbk.news SET slug=$1,title_en=$2,title_ml=$3,excerpt_en=$4,excerpt_ml=$5,content_en=$6,content_ml=$7,image_url=$8,published=$9,published_at=CASE WHEN published=false AND $9=true THEN now() ELSE published_at END WHERE id=$10 RETURNING *",
              [value.slug, value.title_en, value.title_ml, value.excerpt_en, value.excerpt_ml, value.content_en, value.content_ml, value.image_url, value.published, value.id]
            )
          ).rows[0];
        } else {
          return (
            await db.query(
              "INSERT INTO sbk.news(slug,title_en,title_ml,excerpt_en,excerpt_ml,content_en,content_ml,image_url,published,published_at,author_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,CASE WHEN $9=true THEN now() ELSE null END,$10) RETURNING *",
              [value.slug, value.title_en, value.title_ml, value.excerpt_en, value.excerpt_ml, value.content_en, value.content_ml, value.image_url, value.published, id]
            )
          ).rows[0];
        }
      }
      if (kind === "deleteNews") {
        await db.query("DELETE FROM sbk.news WHERE id=$1", [value.id]);
        return {};
      }
      if (kind === "results") {`
);
fs.writeFileSync('src/lib/service.ts', ts);
