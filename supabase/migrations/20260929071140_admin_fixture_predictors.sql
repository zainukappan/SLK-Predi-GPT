CREATE FUNCTION sbk.admin_fixture_predictors(target_fixtures uuid[])
RETURNS TABLE(fixture_id uuid,member_id uuid,display_name text,submitted_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=sbk,pg_temp AS $$
BEGIN
 IF NOT sbk.is_admin() THEN RAISE EXCEPTION 'forbidden';END IF;
 RETURN QUERY
 SELECT p.fixture_id,p.member_id,u.display_name,p.created_at
 FROM predictions p
 JOIN profiles u ON u.id=p.member_id
 WHERE p.fixture_id=ANY(target_fixtures)
 ORDER BY p.fixture_id,lower(u.display_name),u.display_name,p.created_at;
END $$;

REVOKE ALL ON FUNCTION sbk.admin_fixture_predictors(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sbk.admin_fixture_predictors(uuid[]) TO sbk_app;
