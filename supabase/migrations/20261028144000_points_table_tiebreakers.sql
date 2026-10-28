DROP FUNCTION IF EXISTS sbk.public_points_table();
CREATE OR REPLACE FUNCTION sbk.public_points_table()
 RETURNS TABLE(team_id uuid, name_en text, name_ml text, badge text, played bigint, regulation_wins bigint, shootout_wins bigint, shootout_losses bigint, regulation_losses bigint, goals_for bigint, goals_against bigint, goal_difference bigint, points bigint, head_to_head_points bigint, head_to_head_goal_difference bigint, fair_play_rank integer, table_position bigint, previous_position bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'sbk', 'pg_temp'
AS $function$
 WITH last_match_date AS (
    SELECT MAX(f.kickoff::date) as max_date FROM fixtures f WHERE f.status='finalized' AND NOT f.demo
 ),
 games AS(
  SELECT f.home_id team_id,f.away_id opponent_id,r.home_goals gf,r.away_goals ga,
   CASE WHEN r.home_goals>r.away_goals THEN 3 WHEN r.home_goals=r.away_goals AND r.shootout_winner='home' THEN 2 WHEN r.home_goals=r.away_goals THEN 1 ELSE 0 END pts,
   (r.home_goals>r.away_goals)::int rw,(r.home_goals=r.away_goals AND r.shootout_winner='home')::int sw,
   (r.home_goals=r.away_goals AND r.shootout_winner='away')::int sl,(r.home_goals<r.away_goals)::int rl,
   0::bigint away_gf,
   (f.kickoff::date < (SELECT max_date FROM last_match_date)) as is_previous
  FROM fixtures f JOIN results r ON r.fixture_id=f.id WHERE f.status='finalized' AND NOT f.demo
  UNION ALL
  SELECT f.away_id,f.home_id,r.away_goals,r.home_goals,
   CASE WHEN r.away_goals>r.home_goals THEN 3 WHEN r.home_goals=r.away_goals AND r.shootout_winner='away' THEN 2 WHEN r.home_goals=r.away_goals THEN 1 ELSE 0 END,
   (r.away_goals>r.home_goals)::int,(r.home_goals=r.away_goals AND r.shootout_winner='away')::int,
   (r.home_goals=r.away_goals AND r.shootout_winner='home')::int,(r.away_goals<r.home_goals)::int,
   r.away_goals::bigint away_gf,
   (f.kickoff::date < (SELECT max_date FROM last_match_date)) as is_previous
  FROM fixtures f JOIN results r ON r.fixture_id=f.id WHERE f.status='finalized' AND NOT f.demo
 ),
 totals AS(
  SELECT t.id,t.name_en,t.name_ml,t.badge,t.fair_play_rank,count(g.team_id) played,
   coalesce(sum(g.rw),0)::bigint rw,coalesce(sum(g.sw),0)::bigint sw,
   coalesce(sum(g.sl),0)::bigint sl,coalesce(sum(g.rl),0)::bigint rl,
   coalesce(sum(g.gf),0)::bigint gf,coalesce(sum(g.ga),0)::bigint ga,
   (coalesce(sum(g.gf),0)-coalesce(sum(g.ga),0))::bigint gd,coalesce(sum(g.pts),0)::bigint pts,
   coalesce(sum(g.away_gf),0)::bigint away_gf
  FROM teams t LEFT JOIN games g ON g.team_id=t.id WHERE t.active
  GROUP BY t.id,t.name_en,t.name_ml,t.badge,t.fair_play_rank
 ),
 prev_totals AS(
  SELECT t.id,t.name_en,
   coalesce(sum(g.gf) FILTER (WHERE g.is_previous),0)::bigint gf,
   coalesce(sum(g.ga) FILTER (WHERE g.is_previous),0)::bigint ga,
   (coalesce(sum(g.gf) FILTER (WHERE g.is_previous),0)-coalesce(sum(g.ga) FILTER (WHERE g.is_previous),0))::bigint gd,
   coalesce(sum(g.pts) FILTER (WHERE g.is_previous),0)::bigint pts,
   coalesce(sum(g.away_gf) FILTER (WHERE g.is_previous),0)::bigint away_gf
  FROM teams t LEFT JOIN games g ON g.team_id=t.id WHERE t.active
  GROUP BY t.id,t.name_en
 ), prev_ranked AS(
  SELECT x.id,
   row_number() OVER(ORDER BY x.pts DESC, x.gd DESC, x.gf DESC, x.away_gf DESC, x.name_en) prev_table_pos
  FROM prev_totals x
 ), ranked AS(
  SELECT x.*,
   row_number() OVER(ORDER BY x.pts DESC, x.gd DESC, x.gf DESC, x.away_gf DESC, x.name_en) table_pos
  FROM totals x
 )
 SELECT r.id,r.name_en,r.name_ml,r.badge,r.played,r.rw,r.sw,r.sl,r.rl,r.gf,r.ga,r.gd,r.pts,
   0::bigint as head_to_head_points, 0::bigint as head_to_head_goal_difference,
   r.fair_play_rank, r.table_pos, pr.prev_table_pos as previous_position
 FROM ranked r
 LEFT JOIN prev_ranked pr ON pr.id = r.id;
$function$;

REVOKE ALL ON FUNCTION sbk.public_points_table() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sbk.public_points_table() TO sbk_app;
