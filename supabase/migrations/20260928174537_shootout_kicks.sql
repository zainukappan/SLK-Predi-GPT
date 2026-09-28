CREATE TABLE sbk.shootout_kicks(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 fixture_id uuid NOT NULL REFERENCES sbk.fixtures(id) ON DELETE CASCADE,
 team_id uuid NOT NULL REFERENCES sbk.teams(id),
 player_id uuid NOT NULL REFERENCES sbk.players(id),
 scored boolean NOT NULL,
 sort_order integer NOT NULL DEFAULT 0 CHECK(sort_order BETWEEN 0 AND 50),
 updated_by uuid NOT NULL REFERENCES sbk.profiles(id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX shootout_kicks_fixture_idx ON sbk.shootout_kicks(fixture_id,sort_order);
CREATE INDEX shootout_kicks_player_scored_idx ON sbk.shootout_kicks(player_id) WHERE scored;

ALTER TABLE sbk.shootout_kicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY member_read ON sbk.shootout_kicks FOR SELECT TO sbk_app USING(sbk.is_member());
CREATE POLICY admin_write ON sbk.shootout_kicks FOR ALL TO sbk_app USING(sbk.is_admin()) WITH CHECK(sbk.is_admin());
GRANT SELECT,INSERT,UPDATE,DELETE ON sbk.shootout_kicks TO sbk_app;

CREATE FUNCTION sbk.shootout_kick_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=sbk,pg_temp AS $$
DECLARE fixture_record sbk.fixtures; player_team uuid;
BEGIN
 IF NOT sbk.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
 SELECT * INTO fixture_record FROM fixtures WHERE id=NEW.fixture_id FOR UPDATE;
 IF NOT FOUND OR NEW.team_id NOT IN(fixture_record.home_id,fixture_record.away_id) THEN RAISE EXCEPTION 'invalid_shootout_kick'; END IF;
 SELECT team_id INTO player_team FROM players WHERE id=NEW.player_id AND active;
 IF player_team IS NULL OR player_team<>NEW.team_id THEN RAISE EXCEPTION 'invalid_shootout_kick'; END IF;
 NEW.updated_by=sbk.uid();
 RETURN NEW;
END $$;
CREATE TRIGGER shootout_kick_guard BEFORE INSERT OR UPDATE ON sbk.shootout_kicks FOR EACH ROW EXECUTE FUNCTION sbk.shootout_kick_guard();
CREATE TRIGGER audit AFTER INSERT OR UPDATE ON sbk.shootout_kicks FOR EACH ROW EXECUTE FUNCTION sbk.audit();

DROP FUNCTION sbk.public_player_stats();
CREATE FUNCTION sbk.public_player_stats()
RETURNS TABLE(player_id uuid,player_en text,player_ml text,shirt_number integer,team_id uuid,team_en text,team_ml text,badge text,
 goals bigint,assists bigint,contributions bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=sbk,pg_temp AS $$
 WITH regulation AS(
  SELECT e.scorer_id,
   count(*) FILTER(WHERE e.event_type<>'own_goal')::bigint goals,
   0::bigint assists
  FROM match_events e JOIN fixtures f ON f.id=e.fixture_id
  WHERE f.status='finalized' AND NOT f.demo GROUP BY e.scorer_id
  UNION ALL
  SELECT e.assist_id,0::bigint,count(*)::bigint
  FROM match_events e JOIN fixtures f ON f.id=e.fixture_id
  WHERE f.status='finalized' AND NOT f.demo AND e.assist_id IS NOT NULL GROUP BY e.assist_id
 ), regulation_totals AS(
  SELECT scorer_id player_id,sum(goals)::bigint goals,sum(assists)::bigint assists FROM regulation GROUP BY scorer_id
 ), shootout AS(
  SELECT k.player_id,count(*)::bigint goals FROM shootout_kicks k JOIN fixtures f ON f.id=k.fixture_id
  WHERE f.status='finalized' AND NOT f.demo AND k.scored GROUP BY k.player_id
 )
 SELECT p.id,p.name_en,p.name_ml,p.shirt_number,t.id,t.name_en,t.name_ml,t.badge,
  (coalesce(r.goals,0)+coalesce(s.goals,0))::bigint goals,
  coalesce(r.assists,0)::bigint assists,
  (coalesce(r.goals,0)+coalesce(s.goals,0)+coalesce(r.assists,0))::bigint contributions
 FROM players p JOIN teams t ON t.id=p.team_id
 LEFT JOIN regulation_totals r ON r.player_id=p.id LEFT JOIN shootout s ON s.player_id=p.id
 WHERE p.active ORDER BY contributions DESC,goals DESC,assists DESC,p.name_en LIMIT 100
$$;

CREATE FUNCTION sbk.public_shootout_kicks()
RETURNS TABLE(id uuid,fixture_id uuid,team_id uuid,player_en text,player_ml text,scored boolean,sort_order integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=sbk,pg_temp AS $$
 SELECT k.id,k.fixture_id,k.team_id,p.name_en,p.name_ml,k.scored,k.sort_order
 FROM shootout_kicks k JOIN fixtures f ON f.id=k.fixture_id JOIN players p ON p.id=k.player_id
 WHERE f.status='finalized' AND NOT f.demo ORDER BY f.kickoff DESC,k.sort_order
$$;

REVOKE ALL ON FUNCTION sbk.public_player_stats(),sbk.public_shootout_kicks() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sbk.public_player_stats(),sbk.public_shootout_kicks() TO sbk_app;
