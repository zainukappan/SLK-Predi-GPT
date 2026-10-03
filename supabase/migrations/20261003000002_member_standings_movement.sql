DROP FUNCTION IF EXISTS sbk.standings(uuid);
CREATE OR REPLACE FUNCTION sbk.standings(round_filter uuid DEFAULT NULL::uuid)
 RETURNS TABLE(member_id uuid, display_name text, points bigint, exact bigint, correct bigint, first_goal_correct bigint, participation bigint, rank bigint, previous_rank bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'sbk', 'pg_temp'
AS $function$
 WITH last_match_date AS (
    SELECT MAX(f.kickoff::date) as max_date FROM fixtures f WHERE f.status='finalized' AND NOT f.demo
 ),
 totals AS(
  SELECT u.id,u.display_name,
   coalesce(sum(sbk.prediction_points(p.home_goals,p.away_goals,p.predicted_winner,p.first_goal,r.home_goals,r.away_goals,r.winner,r.first_goal)) FILTER(WHERE f.status='finalized'),0)::bigint points,
   coalesce(sum(sbk.prediction_points(p.home_goals,p.away_goals,p.predicted_winner,p.first_goal,r.home_goals,r.away_goals,r.winner,r.first_goal)) FILTER(WHERE f.status='finalized' AND f.kickoff::date < (SELECT max_date FROM last_match_date)),0)::bigint prev_points,
   count(*) FILTER(WHERE f.status='finalized' AND p.home_goals=r.home_goals AND p.away_goals=r.away_goals) exact,
   count(*) FILTER(WHERE f.status='finalized' AND p.predicted_winner=r.winner) correct,
   count(*) FILTER(WHERE f.status='finalized' AND p.first_goal IS NOT NULL AND p.first_goal=r.first_goal) first_goal_correct,
   count(p.id) FILTER(WHERE f.status='finalized') participation
  FROM profiles u
  LEFT JOIN predictions p ON p.member_id=u.id AND EXISTS(SELECT 1 FROM fixtures x WHERE x.id=p.fixture_id AND (round_filter IS NULL OR x.round_id=round_filter))
  LEFT JOIN fixtures f ON f.id=p.fixture_id AND NOT f.demo LEFT JOIN results r ON r.fixture_id=f.id
  WHERE u.membership='approved' AND sbk.is_member() GROUP BY u.id,u.display_name
 ), ranked AS(
  SELECT id,display_name,points,exact,correct,first_goal_correct,participation,rank() OVER(ORDER BY points DESC) rank, prev_points FROM totals
 ), prev_ranked AS(
  SELECT id, rank() OVER(ORDER BY prev_points DESC) prev_rank FROM totals
 )
 SELECT r.id,r.display_name,r.points,r.exact,r.correct,r.first_goal_correct,r.participation,r.rank,pr.prev_rank as previous_rank
 FROM ranked r LEFT JOIN prev_ranked pr ON pr.id=r.id;
$function$;
