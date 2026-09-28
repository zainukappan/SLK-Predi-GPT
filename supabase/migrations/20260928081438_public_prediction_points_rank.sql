CREATE OR REPLACE FUNCTION sbk.public_prediction_standings()
RETURNS TABLE(public_key text,display_name text,points bigint,exact bigint,correct bigint,first_goal_correct bigint,participation bigint,rank bigint,round_points jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=sbk,pg_temp AS $$
 WITH scored AS(
  SELECT p.member_id,f.round_id,
   sbk.prediction_points(p.home_goals,p.away_goals,p.predicted_winner,p.first_goal,r.home_goals,r.away_goals,r.winner,r.first_goal)::bigint points,
   (p.home_goals=r.home_goals AND p.away_goals=r.away_goals)::integer exact,
   (p.predicted_winner=r.winner)::integer correct,
   (p.first_goal=r.first_goal)::integer first_goal_correct
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
 ), ranked AS(
  SELECT *,rank() OVER(ORDER BY points DESC) rank FROM totals
 )
 SELECT md5('sbk-public:'||id::text),display_name,points,exact,correct,first_goal_correct,participation,rank,round_points
 FROM ranked ORDER BY rank,lower(display_name),id LIMIT 500
$$;

REVOKE ALL ON FUNCTION sbk.public_prediction_standings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sbk.public_prediction_standings() TO sbk_app;
