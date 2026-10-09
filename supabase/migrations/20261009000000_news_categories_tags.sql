ALTER TABLE sbk.news ADD COLUMN category text NOT NULL DEFAULT 'football';
ALTER TABLE sbk.news ADD COLUMN tags text[] NOT NULL DEFAULT '{}';

DROP FUNCTION IF EXISTS sbk.public_news_feed();

CREATE OR REPLACE FUNCTION sbk.public_news_feed()
 RETURNS TABLE(id uuid, slug text, title_en text, title_ml text, excerpt_en text, excerpt_ml text, image_url text, published_at timestamptz, author_name text, category text, tags text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'sbk', 'pg_temp'
AS $function$
    SELECT n.id, n.slug, n.title_en, n.title_ml, n.excerpt_en, n.excerpt_ml, n.image_url, n.published_at, p.display_name as author_name, n.category, n.tags
    FROM sbk.news n
    LEFT JOIN sbk.profiles p ON p.id = n.author_id
    WHERE n.published = true
    ORDER BY n.published_at DESC;
$function$;
