DROP FUNCTION IF EXISTS sbk.public_prediction_standings();
CREATE OR REPLACE FUNCTION sbk.public_prediction_standings()
 RETURNS TABLE(public_key text, display_name text, points bigint, exact bigint, correct bigint, first_goal_correct bigint, participation bigint, rank bigint, round_points jsonb, previous_rank bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'sbk', 'pg_temp'
AS $function$
 WITH last_match_date AS (
    SELECT MAX(f.kickoff::date) as max_date FROM fixtures f WHERE f.status='finalized' AND NOT f.demo
 ),
 scored AS(
  SELECT p.member_id,f.round_id,
   sbk.prediction_points(p.home_goals,p.away_goals,p.predicted_winner,p.first_goal,r.home_goals,r.away_goals,r.winner,r.first_goal)::bigint points,
   (p.home_goals=r.home_goals AND p.away_goals=r.away_goals)::integer exact,
   (p.predicted_winner=r.winner)::integer correct,
   (p.first_goal=r.first_goal)::integer first_goal_correct,
   (f.kickoff::date < (SELECT max_date FROM last_match_date)) as is_previous
  FROM predictions p JOIN fixtures f ON f.id=p.fixture_id AND f.status='finalized' AND NOT f.demo
  JOIN results r ON r.fixture_id=f.id
 ), totals AS(
  SELECT u.id,u.display_name,coalesce(sum(s.points),0)::bigint points,
   coalesce(sum(s.exact),0)::bigint exact,coalesce(sum(s.correct),0)::bigint correct,
   coalesce(sum(s.first_goal_correct),0)::bigint first_goal_correct,count(s.member_id)::bigint participation,
   coalesce((SELECT jsonb_object_agg(by_round.round_id,by_round.points) FROM(
    SELECT sr.round_id,sum(sr.points)::bigint points FROM scored sr WHERE sr.member_id=u.id GROUP BY sr.round_id
   ) by_round),'{}'::jsonb) round_points
  FROM profiles u LEFT JOIN scored s ON s.member_id=u.id WHERE u.membership='approved'
  GROUP BY u.id,u.display_name
 ), prev_totals AS(
  SELECT u.id, coalesce(sum(s.points) FILTER (WHERE s.is_previous),0)::bigint points
  FROM profiles u LEFT JOIN scored s ON s.member_id=u.id WHERE u.membership='approved'
  GROUP BY u.id
 ), ranked AS(
  SELECT *,rank() OVER(ORDER BY points DESC) rank FROM totals
 ), prev_ranked AS(
  SELECT id, rank() OVER(ORDER BY points DESC) prev_rank FROM prev_totals
 )
 SELECT md5('sbk-public:'||r.id::text),r.display_name,r.points,r.exact,r.correct,r.first_goal_correct,r.participation,r.rank,r.round_points, pr.prev_rank as previous_rank
 FROM ranked r LEFT JOIN prev_ranked pr ON pr.id = r.id ORDER BY r.rank,lower(r.display_name),r.id LIMIT 500
$function$;
