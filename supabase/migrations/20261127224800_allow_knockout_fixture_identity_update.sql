-- Allow knockout fixture identity (home_id / away_id) to update dynamically when league standings change
-- Any premature predictions made on previous provisional teams for knockout fixtures are safely cleared.

CREATE OR REPLACE FUNCTION sbk.fixture_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'sbk', 'pg_temp'
AS $function$
BEGIN
 IF TG_OP='UPDATE' THEN
  IF OLD.status='finalized' AND (NEW.status<>'finalized' OR NEW.home_id<>OLD.home_id OR NEW.away_id<>OLD.away_id OR NEW.kickoff<>OLD.kickoff OR NEW.round_id<>OLD.round_id) THEN 
    RAISE EXCEPTION 'finalized_immutable';
  END IF;
  IF (NEW.home_id<>OLD.home_id OR NEW.away_id<>OLD.away_id OR NEW.round_id<>OLD.round_id) THEN
    IF OLD.knockout THEN
      -- Knockout matchups are dynamic based on qualification/advancement.
      -- Clear any provisional predictions if teams change so members can predict on confirmed teams.
      DELETE FROM predictions WHERE fixture_id=OLD.id;
    ELSIF EXISTS(SELECT 1 FROM predictions WHERE fixture_id=OLD.id) THEN
      RAISE EXCEPTION 'fixture_identity_locked';
    END IF;
  END IF;
  IF NEW.kickoff<>OLD.kickoff AND (length(NEW.schedule_note_en)<5 OR length(NEW.schedule_note_ml)<5) THEN 
    RAISE EXCEPTION 'schedule_note_required';
  END IF;
 END IF;
 IF NEW.status='finalized' AND NOT EXISTS(SELECT 1 FROM results WHERE fixture_id=NEW.id) THEN 
   RAISE EXCEPTION 'result_required';
 END IF;
 IF NEW.status IN('in_progress','awaiting_result') AND NEW.kickoff>clock_timestamp() THEN 
   RAISE EXCEPTION 'not_started';
 END IF;
 NEW.deadline=NEW.kickoff-interval '90 minutes';
 NEW.updated_at=clock_timestamp();
 RETURN NEW;
END $function$;
