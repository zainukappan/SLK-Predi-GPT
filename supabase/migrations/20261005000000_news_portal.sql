CREATE TABLE IF NOT EXISTS sbk.news (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text UNIQUE NOT NULL,
    title_en text NOT NULL,
    title_ml text NOT NULL,
    excerpt_en text,
    excerpt_ml text,
    content_en text,
    content_ml text,
    image_url text,
    published boolean NOT NULL DEFAULT false,
    published_at timestamptz,
    author_id uuid REFERENCES sbk.profiles(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sbk.news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published news" ON sbk.news
    FOR SELECT
    USING (published = true);

CREATE POLICY "Admins have full access to news" ON sbk.news
    FOR ALL
    USING (sbk.is_admin());

CREATE OR REPLACE FUNCTION sbk.public_news_feed()
 RETURNS TABLE(id uuid, slug text, title_en text, title_ml text, excerpt_en text, excerpt_ml text, image_url text, published_at timestamptz, author_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'sbk', 'pg_temp'
AS $function$
    SELECT n.id, n.slug, n.title_en, n.title_ml, n.excerpt_en, n.excerpt_ml, n.image_url, n.published_at, p.display_name as author_name
    FROM sbk.news n
    LEFT JOIN sbk.profiles p ON p.id = n.author_id
    WHERE n.published = true
    ORDER BY n.published_at DESC;
$function$;
