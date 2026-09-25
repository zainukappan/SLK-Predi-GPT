-- Pin invoker function resolution as well as security-definer functions.
ALTER FUNCTION sbk.uid() SET search_path = pg_catalog, sbk;
ALTER FUNCTION sbk.score(integer, integer, integer, integer) SET search_path = pg_catalog, sbk;
ALTER FUNCTION sbk.profile_guard() SET search_path = pg_catalog, sbk;
ALTER FUNCTION sbk.result_guard() SET search_path = pg_catalog, sbk;
ALTER FUNCTION sbk.result_finalize() SET search_path = pg_catalog, sbk;
ALTER FUNCTION sbk.fixture_metadata() SET search_path = pg_catalog, sbk;
