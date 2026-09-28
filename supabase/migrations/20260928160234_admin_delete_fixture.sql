CREATE FUNCTION sbk.admin_delete_fixture(target_fixture uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=sbk,pg_temp AS $$
DECLARE
 fixture_record sbk.fixtures;
 prediction_count bigint;
 event_count bigint;
 had_result boolean;
BEGIN
 IF NOT sbk.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;

 SELECT * INTO fixture_record FROM fixtures WHERE id=target_fixture FOR UPDATE;
 IF fixture_record.id IS NULL THEN RAISE EXCEPTION 'fixture_not_found'; END IF;

 SELECT count(*) INTO prediction_count FROM predictions WHERE fixture_id=target_fixture;
 SELECT count(*) INTO event_count FROM match_events WHERE fixture_id=target_fixture;
 SELECT EXISTS(SELECT 1 FROM results WHERE fixture_id=target_fixture) INTO had_result;

 INSERT INTO admin_audit_events(actor,action,target,before_value,after_value)
 VALUES(
  sbk.uid(),
  'DELETE_FIXTURE',
  'fixtures',
  jsonb_build_object(
   'id',fixture_record.id,
   'round_id',fixture_record.round_id,
   'home_id',fixture_record.home_id,
   'away_id',fixture_record.away_id,
   'kickoff',fixture_record.kickoff,
   'status',fixture_record.status,
   'prediction_count',prediction_count,
   'match_event_count',event_count,
   'had_result',had_result
  ),
  jsonb_build_object('deleted',true)
 );

 DELETE FROM prediction_revisions
 WHERE prediction_id IN (SELECT id FROM predictions WHERE fixture_id=target_fixture);
 DELETE FROM match_events WHERE fixture_id=target_fixture;
 DELETE FROM results WHERE fixture_id=target_fixture;
 DELETE FROM predictions WHERE fixture_id=target_fixture;
 DELETE FROM fixtures WHERE id=target_fixture;
END $$;

REVOKE ALL ON FUNCTION sbk.admin_delete_fixture(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sbk.admin_delete_fixture(uuid) TO sbk_app;
