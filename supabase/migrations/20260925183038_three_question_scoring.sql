-- Three independent questions, one point each: winner, exact score, first goal.
ALTER TABLE sbk.predictions
  ADD COLUMN predicted_winner text,
  ADD COLUMN first_goal text,
  ADD CONSTRAINT prediction_winner_choice CHECK (predicted_winner IN ('home','draw','away')),
  ADD CONSTRAINT prediction_first_goal_choice CHECK (first_goal IN ('home','away','nobody'));

ALTER TABLE sbk.predictions DISABLE TRIGGER prediction_guard;
UPDATE sbk.predictions
SET predicted_winner = CASE
  WHEN home_goals > away_goals THEN 'home'
  WHEN home_goals < away_goals THEN 'away'
  ELSE 'draw'
END;
ALTER TABLE sbk.predictions ENABLE TRIGGER prediction_guard;

ALTER TABLE sbk.predictions ALTER COLUMN predicted_winner SET NOT NULL;

ALTER TABLE sbk.prediction_revisions
  ADD COLUMN predicted_winner text,
  ADD COLUMN first_goal text;

ALTER TABLE sbk.results
  ADD COLUMN winner text,
  ADD COLUMN first_goal text,
  ADD CONSTRAINT result_winner_choice CHECK (winner IN ('home','draw','away')),
  ADD CONSTRAINT result_first_goal_choice CHECK (first_goal IN ('home','away','nobody'));

ALTER TABLE sbk.results DISABLE TRIGGER result_guard;
UPDATE sbk.results
SET winner = CASE
  WHEN home_goals > away_goals THEN 'home'
  WHEN home_goals < away_goals THEN 'away'
  ELSE 'draw'
END,
first_goal = CASE WHEN home_goals = 0 AND away_goals = 0 THEN 'nobody' ELSE NULL END;
ALTER TABLE sbk.results ENABLE TRIGGER result_guard;

ALTER TABLE sbk.results ALTER COLUMN winner SET NOT NULL;

CREATE OR REPLACE FUNCTION sbk.prediction_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=sbk,pg_temp AS $$
DECLARE f sbk.fixtures;
BEGIN
 SELECT * INTO f FROM fixtures WHERE id=NEW.fixture_id FOR UPDATE;
 IF NOT FOUND OR NEW.member_id<>sbk.uid() OR NOT sbk.is_member() THEN RAISE EXCEPTION 'forbidden';END IF;
 IF f.status<>'scheduled' OR clock_timestamp()>=f.deadline THEN RAISE EXCEPTION 'prediction_locked';END IF;
 IF NEW.home_goals=0 AND NEW.away_goals=0 AND NEW.first_goal<>'nobody' THEN RAISE EXCEPTION 'first_goal_mismatch';END IF;
 IF (NEW.home_goals>0 OR NEW.away_goals>0) AND NEW.first_goal='nobody' THEN RAISE EXCEPTION 'first_goal_mismatch';END IF;
 IF TG_OP='UPDATE' THEN
  IF NEW.home_goals=OLD.home_goals AND NEW.away_goals=OLD.away_goals
     AND NEW.predicted_winner=OLD.predicted_winner
     AND NEW.first_goal IS NOT DISTINCT FROM OLD.first_goal THEN RETURN OLD;END IF;
  INSERT INTO prediction_revisions(prediction_id,home_goals,away_goals,predicted_winner,first_goal,saved_at)
  VALUES(OLD.id,OLD.home_goals,OLD.away_goals,OLD.predicted_winner,OLD.first_goal,OLD.updated_at);
 END IF;
 NEW.updated_at=clock_timestamp();RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION sbk.result_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE f sbk.fixtures; expected_winner text;
BEGIN
 SELECT * INTO f FROM fixtures WHERE id=NEW.fixture_id FOR UPDATE;
 IF NOT sbk.is_admin() THEN RAISE EXCEPTION 'forbidden';END IF;
 IF f.status IN('scheduled') AND clock_timestamp()<f.kickoff THEN RAISE EXCEPTION 'not_started';END IF;
 IF f.status IN('cancelled','postponed') THEN RAISE EXCEPTION 'result_state';END IF;
 expected_winner := CASE WHEN NEW.home_goals>NEW.away_goals THEN 'home' WHEN NEW.home_goals<NEW.away_goals THEN 'away' ELSE 'draw' END;
 IF NEW.winner<>expected_winner THEN RAISE EXCEPTION 'winner_score_mismatch';END IF;
 IF NEW.home_goals=0 AND NEW.away_goals=0 AND NEW.first_goal<>'nobody' THEN RAISE EXCEPTION 'first_goal_mismatch';END IF;
 IF (NEW.home_goals>0 OR NEW.away_goals>0) AND (NEW.first_goal IS NULL OR NEW.first_goal='nobody') THEN RAISE EXCEPTION 'first_goal_mismatch';END IF;
 IF TG_OP='UPDATE' AND length(trim(NEW.reason))<5 THEN RAISE EXCEPTION 'correction_reason';END IF;
 NEW.updated_at=clock_timestamp();RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION sbk.prediction_points(
  ph integer, pa integer, pw text, pf text,
  rh integer, ra integer, rw text, rf text
) RETURNS integer LANGUAGE sql IMMUTABLE AS $$
 SELECT CASE WHEN ph=rh AND pa=ra THEN 1 ELSE 0 END
      + CASE WHEN pw=rw THEN 1 ELSE 0 END
      + CASE WHEN pf IS NOT NULL AND rf IS NOT NULL AND pf=rf THEN 1 ELSE 0 END
$$;

DROP FUNCTION sbk.standings(uuid);
CREATE FUNCTION sbk.standings(round_filter uuid DEFAULT NULL)
RETURNS TABLE(member_id uuid,display_name text,points bigint,exact bigint,correct bigint,first_goal_correct bigint,participation bigint,rank bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=sbk,pg_temp AS $$
 WITH totals AS(
  SELECT u.id,u.display_name,
   coalesce(sum(sbk.prediction_points(p.home_goals,p.away_goals,p.predicted_winner,p.first_goal,r.home_goals,r.away_goals,r.winner,r.first_goal)) FILTER(WHERE f.status='finalized'),0)::bigint points,
   count(*) FILTER(WHERE f.status='finalized' AND p.home_goals=r.home_goals AND p.away_goals=r.away_goals) exact,
   count(*) FILTER(WHERE f.status='finalized' AND p.predicted_winner=r.winner) correct,
   count(*) FILTER(WHERE f.status='finalized' AND p.first_goal IS NOT NULL AND p.first_goal=r.first_goal) first_goal_correct,
   count(p.id) FILTER(WHERE f.status='finalized') participation
  FROM profiles u
  LEFT JOIN predictions p ON p.member_id=u.id AND EXISTS(SELECT 1 FROM fixtures x WHERE x.id=p.fixture_id AND (round_filter IS NULL OR x.round_id=round_filter))
  LEFT JOIN fixtures f ON f.id=p.fixture_id LEFT JOIN results r ON r.fixture_id=f.id
  WHERE u.membership='approved' AND sbk.is_member() GROUP BY u.id,u.display_name
 )
 SELECT id,display_name,points,exact,correct,first_goal_correct,participation,rank() OVER(ORDER BY points DESC) FROM totals;
$$;

REVOKE ALL ON FUNCTION sbk.prediction_points(integer,integer,text,text,integer,integer,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION sbk.standings(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sbk.prediction_points(integer,integer,text,text,integer,integer,text,text),sbk.standings(uuid) TO sbk_app;
GRANT UPDATE(predicted_winner,first_goal) ON sbk.predictions TO sbk_app;
GRANT UPDATE(winner,first_goal) ON sbk.results TO sbk_app;
