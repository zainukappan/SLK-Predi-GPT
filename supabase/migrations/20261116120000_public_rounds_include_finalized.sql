CREATE OR REPLACE FUNCTION sbk.public_rounds()
RETURNS TABLE(id uuid,name_en text,name_ml text,sort_order integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=sbk,pg_temp AS $$
 SELECT r.id,r.name_en,r.name_ml,r.sort_order FROM rounds r
 WHERE (r.active OR EXISTS(SELECT 1 FROM fixtures f WHERE f.round_id=r.id AND f.status='finalized' AND NOT f.demo))
   AND EXISTS(SELECT 1 FROM fixtures f WHERE f.round_id=r.id AND NOT f.demo)
 ORDER BY r.sort_order,r.name_en
$$;

REVOKE ALL ON FUNCTION sbk.public_rounds() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sbk.public_rounds() TO sbk_app;
