CREATE TABLE sbk.players(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 team_id uuid NOT NULL REFERENCES sbk.teams(id),
 name_en text NOT NULL CHECK(length(trim(name_en)) BETWEEN 2 AND 100),
 name_ml text NOT NULL DEFAULT '',
 shirt_number integer CHECK(shirt_number BETWEEN 1 AND 99),
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(team_id,name_en)
);
CREATE INDEX players_team_active_idx ON sbk.players(team_id,active);

CREATE TABLE sbk.match_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 fixture_id uuid NOT NULL REFERENCES sbk.fixtures(id) ON DELETE CASCADE,
 team_id uuid NOT NULL REFERENCES sbk.teams(id),
 scorer_id uuid NOT NULL REFERENCES sbk.players(id),
 assist_id uuid REFERENCES sbk.players(id),
 minute integer NOT NULL CHECK(minute BETWEEN 1 AND 130),
 added_time integer NOT NULL DEFAULT 0 CHECK(added_time BETWEEN 0 AND 30),
 event_type text NOT NULL DEFAULT 'goal' CHECK(event_type IN('goal','penalty','own_goal')),
 sort_order integer NOT NULL DEFAULT 0,
 updated_by uuid NOT NULL REFERENCES sbk.profiles(id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK(assist_id IS NULL OR assist_id<>scorer_id)
);
CREATE INDEX match_events_fixture_idx ON sbk.match_events(fixture_id,sort_order,minute);
CREATE INDEX match_events_scorer_idx ON sbk.match_events(scorer_id);
CREATE INDEX match_events_assist_idx ON sbk.match_events(assist_id) WHERE assist_id IS NOT NULL;

ALTER TABLE sbk.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE sbk.match_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY member_read ON sbk.players FOR SELECT TO sbk_app USING(sbk.is_member());
CREATE POLICY admin_write ON sbk.players FOR ALL TO sbk_app USING(sbk.is_admin()) WITH CHECK(sbk.is_admin());
CREATE POLICY member_read ON sbk.match_events FOR SELECT TO sbk_app USING(sbk.is_member());
CREATE POLICY admin_write ON sbk.match_events FOR ALL TO sbk_app USING(sbk.is_admin()) WITH CHECK(sbk.is_admin());
GRANT SELECT,INSERT,UPDATE ON sbk.players TO sbk_app;
GRANT SELECT,INSERT,UPDATE,DELETE ON sbk.match_events TO sbk_app;

CREATE FUNCTION sbk.match_event_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=sbk,pg_temp AS $$
DECLARE f sbk.fixtures; scorer_team uuid; assist_team uuid;
BEGIN
 IF NOT sbk.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
 SELECT * INTO f FROM fixtures WHERE id=NEW.fixture_id FOR UPDATE;
 IF NOT FOUND OR NEW.team_id NOT IN(f.home_id,f.away_id) THEN RAISE EXCEPTION 'invalid_match_event'; END IF;
 SELECT team_id INTO scorer_team FROM players WHERE id=NEW.scorer_id AND active;
 IF scorer_team IS NULL THEN RAISE EXCEPTION 'invalid_match_event'; END IF;
 IF NEW.event_type<>'own_goal' AND scorer_team<>NEW.team_id THEN RAISE EXCEPTION 'invalid_match_event'; END IF;
 IF NEW.event_type='own_goal' AND scorer_team=NEW.team_id THEN RAISE EXCEPTION 'invalid_match_event'; END IF;
 IF NEW.assist_id IS NOT NULL THEN
   SELECT team_id INTO assist_team FROM players WHERE id=NEW.assist_id AND active;
   IF assist_team IS NULL OR assist_team<>NEW.team_id OR NEW.event_type<>'goal' THEN RAISE EXCEPTION 'invalid_match_event'; END IF;
 END IF;
 NEW.updated_by=sbk.uid();
 RETURN NEW;
END $$;
CREATE TRIGGER match_event_guard BEFORE INSERT OR UPDATE ON sbk.match_events FOR EACH ROW EXECUTE FUNCTION sbk.match_event_guard();
CREATE TRIGGER audit AFTER INSERT OR UPDATE ON sbk.players FOR EACH ROW EXECUTE FUNCTION sbk.audit();
CREATE TRIGGER audit AFTER INSERT OR UPDATE ON sbk.match_events FOR EACH ROW EXECUTE FUNCTION sbk.audit();

CREATE FUNCTION sbk.public_fixtures()
RETURNS TABLE(id uuid,kickoff timestamptz,status text,venue_en text,venue_ml text,round_en text,round_ml text,
 home_id uuid,home_en text,home_ml text,home_badge text,away_id uuid,away_en text,away_ml text,away_badge text,
 home_goals integer,away_goals integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=sbk,pg_temp AS $$
 SELECT f.id,f.kickoff,f.status,f.venue_en,f.venue_ml,o.name_en,o.name_ml,
 h.id,h.name_en,h.name_ml,h.badge,a.id,a.name_en,a.name_ml,a.badge,r.home_goals,r.away_goals
 FROM fixtures f JOIN teams h ON h.id=f.home_id JOIN teams a ON a.id=f.away_id JOIN rounds o ON o.id=f.round_id
 LEFT JOIN results r ON r.fixture_id=f.id WHERE NOT f.demo
 ORDER BY f.kickoff DESC LIMIT 200
$$;

CREATE FUNCTION sbk.public_points_table()
RETURNS TABLE(team_id uuid,name_en text,name_ml text,badge text,played bigint,wins bigint,draws bigint,losses bigint,
 goals_for bigint,goals_against bigint,goal_difference bigint,points bigint,table_position bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=sbk,pg_temp AS $$
 WITH games AS(
  SELECT f.home_id team_id,r.home_goals gf,r.away_goals ga FROM fixtures f JOIN results r ON r.fixture_id=f.id WHERE f.status='finalized' AND NOT f.demo
  UNION ALL
  SELECT f.away_id,r.away_goals,r.home_goals FROM fixtures f JOIN results r ON r.fixture_id=f.id WHERE f.status='finalized' AND NOT f.demo
 ), totals AS(
  SELECT t.id,t.name_en,t.name_ml,t.badge,count(g.team_id) played,
   count(*) FILTER(WHERE g.gf>g.ga) wins,count(*) FILTER(WHERE g.gf=g.ga) draws,count(*) FILTER(WHERE g.gf<g.ga) losses,
   coalesce(sum(g.gf),0)::bigint gf,coalesce(sum(g.ga),0)::bigint ga,
   (coalesce(sum(g.gf),0)-coalesce(sum(g.ga),0))::bigint gd,
   (count(*) FILTER(WHERE g.gf>g.ga)*3+count(*) FILTER(WHERE g.gf=g.ga))::bigint pts
  FROM teams t LEFT JOIN games g ON g.team_id=t.id WHERE t.active GROUP BY t.id,t.name_en,t.name_ml,t.badge
 )
 SELECT *,rank() OVER(ORDER BY pts DESC,gd DESC,gf DESC,name_en) AS table_position FROM totals
$$;

CREATE FUNCTION sbk.public_player_stats()
RETURNS TABLE(player_id uuid,player_en text,player_ml text,shirt_number integer,team_id uuid,team_en text,team_ml text,badge text,
 goals bigint,assists bigint,contributions bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=sbk,pg_temp AS $$
 SELECT p.id,p.name_en,p.name_ml,p.shirt_number,t.id,t.name_en,t.name_ml,t.badge,
  count(e.id) FILTER(WHERE e.scorer_id=p.id AND e.event_type<>'own_goal' AND f.status='finalized' AND NOT f.demo) goals,
  count(e.id) FILTER(WHERE e.assist_id=p.id AND f.status='finalized' AND NOT f.demo) assists,
  (count(e.id) FILTER(WHERE e.scorer_id=p.id AND e.event_type<>'own_goal' AND f.status='finalized' AND NOT f.demo)+count(e.id) FILTER(WHERE e.assist_id=p.id AND f.status='finalized' AND NOT f.demo)) contributions
 FROM players p JOIN teams t ON t.id=p.team_id
 LEFT JOIN match_events e ON (e.scorer_id=p.id OR e.assist_id=p.id)
 LEFT JOIN fixtures f ON f.id=e.fixture_id
 WHERE p.active
 GROUP BY p.id,p.name_en,p.name_ml,p.shirt_number,t.id,t.name_en,t.name_ml,t.badge
 ORDER BY contributions DESC,goals DESC,assists DESC,p.name_en LIMIT 100
$$;

CREATE FUNCTION sbk.public_prediction_standings()
RETURNS TABLE(display_name text,points bigint,exact bigint,correct bigint,first_goal_correct bigint,participation bigint,rank bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=sbk,pg_temp AS $$
 WITH totals AS(
  SELECT u.id,u.display_name,
   coalesce(sum(sbk.prediction_points(p.home_goals,p.away_goals,p.predicted_winner,p.first_goal,r.home_goals,r.away_goals,r.winner,r.first_goal)) FILTER(WHERE f.status='finalized'),0)::bigint points,
   count(*) FILTER(WHERE f.status='finalized' AND p.home_goals=r.home_goals AND p.away_goals=r.away_goals) exact,
   count(*) FILTER(WHERE f.status='finalized' AND p.predicted_winner=r.winner) correct,
   count(*) FILTER(WHERE f.status='finalized' AND p.first_goal=r.first_goal) first_goal_correct,
   count(p.id) FILTER(WHERE f.status='finalized') participation
  FROM profiles u LEFT JOIN predictions p ON p.member_id=u.id LEFT JOIN fixtures f ON f.id=p.fixture_id LEFT JOIN results r ON r.fixture_id=f.id
  WHERE u.membership='approved' GROUP BY u.id,u.display_name
 ), ranked AS(
  SELECT *,rank() OVER(ORDER BY points DESC,exact DESC,correct DESC,first_goal_correct DESC) rank FROM totals
 ) SELECT display_name,points,exact,correct,first_goal_correct,participation,rank FROM ranked ORDER BY rank,display_name LIMIT 100
$$;

CREATE FUNCTION sbk.public_match_events()
RETURNS TABLE(id uuid,fixture_id uuid,team_id uuid,scorer_en text,scorer_ml text,assist_en text,assist_ml text,minute integer,added_time integer,event_type text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=sbk,pg_temp AS $$
 SELECT e.id,e.fixture_id,e.team_id,s.name_en,s.name_ml,a.name_en,a.name_ml,e.minute,e.added_time,e.event_type
 FROM match_events e JOIN fixtures f ON f.id=e.fixture_id JOIN players s ON s.id=e.scorer_id LEFT JOIN players a ON a.id=e.assist_id
 WHERE f.status='finalized' AND NOT f.demo ORDER BY f.kickoff DESC,e.sort_order,e.minute
$$;

REVOKE ALL ON FUNCTION sbk.public_fixtures(),sbk.public_points_table(),sbk.public_player_stats(),sbk.public_prediction_standings(),sbk.public_match_events() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sbk.public_fixtures(),sbk.public_points_table(),sbk.public_player_stats(),sbk.public_prediction_standings(),sbk.public_match_events() TO sbk_app;
