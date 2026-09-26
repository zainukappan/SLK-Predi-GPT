CREATE FUNCTION sbk.admin_update_identifier(target_member uuid, new_identifier text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=sbk,pg_temp AS $$
DECLARE target_profile sbk.profiles;
BEGIN
 IF NOT sbk.is_admin() THEN RAISE EXCEPTION 'forbidden';END IF;
 SELECT * INTO target_profile FROM profiles WHERE id=target_member FOR UPDATE;
 IF target_profile.id IS NULL OR target_profile.role<>'member' THEN RAISE EXCEPTION 'admin_protected';END IF;
 UPDATE profiles SET email=new_identifier WHERE id=target_member;
END $$;

CREATE OR REPLACE FUNCTION sbk.prediction_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=sbk,pg_temp AS $$
DECLARE f sbk.fixtures; importing boolean;
BEGIN
 importing := current_setting('sbk.admin_prediction_import',true)='on' AND sbk.is_admin();
 SELECT * INTO f FROM fixtures WHERE id=NEW.fixture_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'invalid';END IF;
 IF importing THEN
  IF f.deadline>clock_timestamp() AND f.status='scheduled' THEN RAISE EXCEPTION 'prediction_not_locked';END IF;
  IF f.status='cancelled' THEN RAISE EXCEPTION 'result_state';END IF;
  IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=NEW.member_id AND membership='approved') THEN RAISE EXCEPTION 'member_not_approved';END IF;
 ELSE
  IF NEW.member_id<>sbk.uid() OR NOT sbk.is_member() THEN RAISE EXCEPTION 'forbidden';END IF;
  IF f.status<>'scheduled' OR clock_timestamp()>=f.deadline THEN RAISE EXCEPTION 'prediction_locked';END IF;
 END IF;
 IF NEW.home_goals=0 AND NEW.away_goals=0 AND NEW.first_goal<>'nobody' THEN RAISE EXCEPTION 'first_goal_mismatch';END IF;
 IF (NEW.home_goals>0 OR NEW.away_goals>0) AND NEW.first_goal='nobody' THEN RAISE EXCEPTION 'first_goal_mismatch';END IF;
 IF TG_OP='UPDATE' THEN
  IF NEW.home_goals=OLD.home_goals AND NEW.away_goals=OLD.away_goals
   AND NEW.predicted_winner=OLD.predicted_winner AND NEW.first_goal IS NOT DISTINCT FROM OLD.first_goal THEN RETURN OLD;END IF;
  INSERT INTO prediction_revisions(prediction_id,home_goals,away_goals,predicted_winner,first_goal,saved_at)
  VALUES(OLD.id,OLD.home_goals,OLD.away_goals,OLD.predicted_winner,OLD.first_goal,OLD.updated_at);
 END IF;
 NEW.updated_at=clock_timestamp();RETURN NEW;
END $$;

CREATE FUNCTION sbk.admin_upsert_prediction(target_member uuid,target_fixture uuid,ph integer,pa integer,pw text,pf text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=sbk,pg_temp AS $$
DECLARE prediction_id uuid; old_value jsonb;
BEGIN
 IF NOT sbk.is_admin() THEN RAISE EXCEPTION 'forbidden';END IF;
 IF ph NOT BETWEEN 0 AND 20 OR pa NOT BETWEEN 0 AND 20 OR pw NOT IN('home','draw','away') OR pf NOT IN('home','away','nobody') THEN RAISE EXCEPTION 'invalid';END IF;
 SELECT to_jsonb(p) INTO old_value FROM predictions p WHERE fixture_id=target_fixture AND member_id=target_member;
 PERFORM set_config('sbk.admin_prediction_import','on',true);
 INSERT INTO predictions(fixture_id,member_id,home_goals,away_goals,predicted_winner,first_goal)
 VALUES(target_fixture,target_member,ph,pa,pw,pf)
 ON CONFLICT(fixture_id,member_id) DO UPDATE SET home_goals=EXCLUDED.home_goals,away_goals=EXCLUDED.away_goals,predicted_winner=EXCLUDED.predicted_winner,first_goal=EXCLUDED.first_goal
 RETURNING id INTO prediction_id;
 INSERT INTO admin_audit_events(actor,action,target,before_value,after_value)
 VALUES(sbk.uid(),CASE WHEN old_value IS NULL THEN 'IMPORT' ELSE 'IMPORT_UPDATE' END,'predictions',old_value,
  jsonb_build_object('prediction_id',prediction_id,'fixture_id',target_fixture,'member_id',target_member,'home_goals',ph,'away_goals',pa,'predicted_winner',pw,'first_goal',pf));
 RETURN prediction_id;
END $$;

REVOKE ALL ON FUNCTION sbk.admin_update_identifier(uuid,text),sbk.admin_upsert_prediction(uuid,uuid,integer,integer,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sbk.admin_update_identifier(uuid,text),sbk.admin_upsert_prediction(uuid,uuid,integer,integer,text,text) TO sbk_app;
