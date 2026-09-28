CREATE FUNCTION sbk.fixture_prediction_count(target_fixture uuid)
RETURNS bigint
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=sbk,pg_temp AS $$
BEGIN
 IF NOT sbk.is_member() THEN RAISE EXCEPTION 'forbidden'; END IF;
 RETURN (SELECT count(*) FROM predictions WHERE fixture_id=target_fixture);
END $$;

REVOKE ALL ON FUNCTION sbk.fixture_prediction_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sbk.fixture_prediction_count(uuid) TO sbk_app;
