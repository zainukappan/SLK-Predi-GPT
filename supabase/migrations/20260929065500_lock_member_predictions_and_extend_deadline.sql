-- Move the authoritative prediction deadline to 90 minutes before kickoff.
-- Keeping the existing column avoids breaking functions and views that depend on it.
ALTER TABLE sbk.fixtures ALTER COLUMN deadline DROP EXPRESSION;
UPDATE sbk.fixtures SET deadline = kickoff - interval '90 minutes';
ALTER TABLE sbk.fixtures ALTER COLUMN deadline SET NOT NULL;

CREATE OR REPLACE FUNCTION sbk.fixture_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=sbk,pg_temp AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
  IF OLD.status='finalized' AND (NEW.status<>'finalized' OR NEW.home_id<>OLD.home_id OR NEW.away_id<>OLD.away_id OR NEW.kickoff<>OLD.kickoff OR NEW.round_id<>OLD.round_id) THEN RAISE EXCEPTION 'finalized_immutable';END IF;
  IF (NEW.home_id<>OLD.home_id OR NEW.away_id<>OLD.away_id OR NEW.round_id<>OLD.round_id) AND EXISTS(SELECT 1 FROM predictions WHERE fixture_id=OLD.id) THEN RAISE EXCEPTION 'fixture_identity_locked';END IF;
  IF NEW.kickoff<>OLD.kickoff AND (length(NEW.schedule_note_en)<5 OR length(NEW.schedule_note_ml)<5) THEN RAISE EXCEPTION 'schedule_note_required';END IF;
 END IF;
 IF NEW.status='finalized' AND NOT EXISTS(SELECT 1 FROM results WHERE fixture_id=NEW.id) THEN RAISE EXCEPTION 'result_required';END IF;
 IF NEW.status IN('in_progress','awaiting_result') AND NEW.kickoff>clock_timestamp() THEN RAISE EXCEPTION 'not_started';END IF;
 NEW.deadline=NEW.kickoff-interval '90 minutes';
 NEW.updated_at=clock_timestamp();
 RETURN NEW;
END $$;

-- Members get one immutable submission per fixture. The existing audited admin
-- import flow remains able to add or correct historical WhatsApp entries.
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
  IF TG_OP='UPDATE' THEN RAISE EXCEPTION 'prediction_already_submitted';END IF;
 END IF;
 IF NEW.first_goal IS NULL THEN RAISE EXCEPTION 'first_goal_mismatch';END IF;
 IF NEW.home_goals=0 AND NEW.away_goals=0 AND NEW.first_goal<>'nobody' THEN RAISE EXCEPTION 'first_goal_mismatch';END IF;
 IF (NEW.home_goals>0 OR NEW.away_goals>0) AND NEW.first_goal='nobody' THEN RAISE EXCEPTION 'first_goal_mismatch';END IF;
 IF TG_OP='UPDATE' THEN
  IF NEW.home_goals=OLD.home_goals AND NEW.away_goals=OLD.away_goals
   AND NEW.predicted_winner=OLD.predicted_winner AND NEW.first_goal IS NOT DISTINCT FROM OLD.first_goal THEN RETURN OLD;END IF;
  INSERT INTO prediction_revisions(prediction_id,home_goals,away_goals,predicted_winner,first_goal,saved_at)
  VALUES(OLD.id,OLD.home_goals,OLD.away_goals,OLD.predicted_winner,OLD.first_goal,OLD.updated_at);
 END IF;
 NEW.updated_at=clock_timestamp();
 RETURN NEW;
END $$;
