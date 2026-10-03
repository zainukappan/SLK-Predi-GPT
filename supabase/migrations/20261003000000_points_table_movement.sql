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
   (f.kickoff::date < (SELECT max_date FROM last_match_date)) as is_previous
  FROM fixtures f JOIN results r ON r.fixture_id=f.id WHERE f.status='finalized' AND NOT f.demo
  UNION ALL
  SELECT f.away_id,f.home_id,r.away_goals,r.home_goals,
   CASE WHEN r.away_goals>r.home_goals THEN 3 WHEN r.home_goals=r.away_goals AND r.shootout_winner='away' THEN 2 WHEN r.home_goals=r.away_goals THEN 1 ELSE 0 END,
   (r.away_goals>r.home_goals)::int,(r.home_goals=r.away_goals AND r.shootout_winner='away')::int,
   (r.home_goals=r.away_goals AND r.shootout_winner='home')::int,(r.away_goals<r.home_goals)::int,
   (f.kickoff::date < (SELECT max_date FROM last_match_date)) as is_previous
  FROM fixtures f JOIN results r ON r.fixture_id=f.id WHERE f.status='finalized' AND NOT f.demo
 ),
 totals AS(
  SELECT t.id,t.name_en,t.name_ml,t.badge,t.fair_play_rank,count(g.team_id) played,
   coalesce(sum(g.rw),0)::bigint rw,coalesce(sum(g.sw),0)::bigint sw,
   coalesce(sum(g.sl),0)::bigint sl,coalesce(sum(g.rl),0)::bigint rl,
   coalesce(sum(g.gf),0)::bigint gf,coalesce(sum(g.ga),0)::bigint ga,
   (coalesce(sum(g.gf),0)-coalesce(sum(g.ga),0))::bigint gd,coalesce(sum(g.pts),0)::bigint pts
  FROM teams t LEFT JOIN games g ON g.team_id=t.id WHERE t.active
  GROUP BY t.id,t.name_en,t.name_ml,t.badge,t.fair_play_rank
 ), head_to_head AS(
  SELECT x.id,coalesce(sum(g.pts),0)::bigint h2h_pts,
   (coalesce(sum(g.gf),0)-coalesce(sum(g.ga),0))::bigint h2h_gd
  FROM totals x LEFT JOIN games g ON g.team_id=x.id
   LEFT JOIN totals opponent ON opponent.id=g.opponent_id AND opponent.pts=x.pts
  WHERE opponent.id IS NOT NULL OR g.team_id IS NULL GROUP BY x.id
 ),
 prev_totals AS(
  SELECT t.id,t.name_en,t.fair_play_rank,
   coalesce(sum(g.gf) FILTER (WHERE g.is_previous),0)::bigint gf,
   coalesce(sum(g.ga) FILTER (WHERE g.is_previous),0)::bigint ga,
   (coalesce(sum(g.gf) FILTER (WHERE g.is_previous),0)-coalesce(sum(g.ga) FILTER (WHERE g.is_previous),0))::bigint gd,
   coalesce(sum(g.pts) FILTER (WHERE g.is_previous),0)::bigint pts
  FROM teams t LEFT JOIN games g ON g.team_id=t.id WHERE t.active
  GROUP BY t.id,t.name_en,t.fair_play_rank
 ), prev_head_to_head AS(
  SELECT x.id,coalesce(sum(g.pts),0)::bigint h2h_pts,
   (coalesce(sum(g.gf),0)-coalesce(sum(g.ga),0))::bigint h2h_gd
  FROM prev_totals x LEFT JOIN games g ON g.team_id=x.id AND g.is_previous
   LEFT JOIN prev_totals opponent ON opponent.id=g.opponent_id AND opponent.pts=x.pts
  WHERE opponent.id IS NOT NULL OR g.team_id IS NULL GROUP BY x.id
 ), prev_ranked AS(
  SELECT x.id,
   row_number() OVER(ORDER BY x.pts DESC,coalesce(h.h2h_pts,0) DESC,coalesce(h.h2h_gd,0) DESC,
    x.gd DESC,x.gf DESC,x.fair_play_rank ASC NULLS LAST,x.name_en) prev_table_pos
  FROM prev_totals x LEFT JOIN prev_head_to_head h ON h.id=x.id
 ), ranked AS(
  SELECT x.*,coalesce(h.h2h_pts,0) h2h_pts,coalesce(h.h2h_gd,0) h2h_gd,
   row_number() OVER(ORDER BY x.pts DESC,coalesce(h.h2h_pts,0) DESC,coalesce(h.h2h_gd,0) DESC,
    x.gd DESC,x.gf DESC,x.fair_play_rank ASC NULLS LAST,x.name_en) table_pos
  FROM totals x LEFT JOIN head_to_head h ON h.id=x.id
 )
 SELECT r.id,r.name_en,r.name_ml,r.badge,r.played,r.rw,r.sw,r.sl,r.rl,r.gf,r.ga,r.gd,r.pts,r.h2h_pts,r.h2h_gd,r.fair_play_rank,r.table_pos, pr.prev_table_pos as previous_position
 FROM ranked r
 LEFT JOIN prev_ranked pr ON pr.id = r.id;
$function$;
