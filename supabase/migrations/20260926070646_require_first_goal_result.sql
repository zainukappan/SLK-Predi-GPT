-- A result imported during the three-question rollout could retain a NULL
-- first-goal answer. Make all three answers mandatory at the database boundary.
ALTER TABLE sbk.predictions ALTER COLUMN first_goal SET NOT NULL;
ALTER TABLE sbk.results ALTER COLUMN first_goal SET NOT NULL;

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
 IF NEW.first_goal IS NULL THEN RAISE EXCEPTION 'first_goal_mismatch';END IF;
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

CREATE OR REPLACE FUNCTION sbk.result_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path=sbk,pg_temp AS $$
DECLARE f sbk.fixtures; expected_winner text;
BEGIN
 SELECT * INTO f FROM fixtures WHERE id=NEW.fixture_id FOR UPDATE;
 IF NOT sbk.is_admin() THEN RAISE EXCEPTION 'forbidden';END IF;
 IF f.status='scheduled' AND clock_timestamp()<f.kickoff THEN RAISE EXCEPTION 'not_started';END IF;
 IF f.status IN('cancelled','postponed') THEN RAISE EXCEPTION 'result_state';END IF;
 expected_winner := CASE WHEN NEW.home_goals>NEW.away_goals THEN 'home' WHEN NEW.home_goals<NEW.away_goals THEN 'away' ELSE 'draw' END;
 IF NEW.winner<>expected_winner THEN RAISE EXCEPTION 'winner_score_mismatch';END IF;
 IF NEW.first_goal IS NULL THEN RAISE EXCEPTION 'first_goal_mismatch';END IF;
 IF NEW.home_goals=0 AND NEW.away_goals=0 AND NEW.first_goal<>'nobody' THEN RAISE EXCEPTION 'first_goal_mismatch';END IF;
 IF (NEW.home_goals>0 OR NEW.away_goals>0) AND NEW.first_goal='nobody' THEN RAISE EXCEPTION 'first_goal_mismatch';END IF;
 IF TG_OP='UPDATE' AND length(trim(NEW.reason))<5 THEN RAISE EXCEPTION 'correction_reason';END IF;
 NEW.updated_at=clock_timestamp();RETURN NEW;
END $$;
