DROP FUNCTION IF EXISTS sbk.public_player_stats();
CREATE OR REPLACE FUNCTION sbk.public_player_stats()
RETURNS TABLE(
 player_id uuid,
 player_en text,
 player_ml text,
 shirt_number integer,
 team_id uuid,
 team_en text,
 team_ml text,
 badge text,
 goals bigint,
 assists bigint,
 contributions bigint,
 regulation_goals bigint,
 shootout_goals bigint
)
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
  (coalesce(r.goals,0)+coalesce(s.goals,0)+coalesce(r.assists,0))::bigint contributions,
  coalesce(r.goals,0)::bigint regulation_goals,
  coalesce(s.goals,0)::bigint shootout_goals
 FROM players p JOIN teams t ON t.id=p.team_id
 LEFT JOIN regulation_totals r ON r.player_id=p.id LEFT JOIN shootout s ON s.player_id=p.id
 WHERE p.active
 ORDER BY goals DESC, regulation_goals DESC, contributions DESC, assists DESC, p.name_en
 LIMIT 100
$$;

REVOKE ALL ON FUNCTION sbk.public_player_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sbk.public_player_stats() TO sbk_app;
