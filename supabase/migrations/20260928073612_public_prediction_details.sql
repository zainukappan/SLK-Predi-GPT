DROP FUNCTION sbk.public_prediction_standings();

CREATE FUNCTION sbk.public_prediction_standings()
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
  SELECT *,rank() OVER(ORDER BY points DESC,exact DESC,correct DESC,first_goal_correct DESC) rank FROM totals
 )
 SELECT md5('sbk-public:'||id::text),display_name,points,exact,correct,first_goal_correct,participation,rank,round_points
 FROM ranked ORDER BY rank,display_name,id LIMIT 500
$$;

CREATE FUNCTION sbk.public_locked_predictions()
RETURNS TABLE(public_key text,fixture_id uuid,home_goals integer,away_goals integer,predicted_winner text,first_goal text,
 saved_at timestamptz,kickoff timestamptz,status text,home_en text,home_ml text,away_en text,away_ml text,
 round_en text,round_ml text,result_home integer,result_away integer,points integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=sbk,pg_temp AS $$
 SELECT visible.public_key,visible.fixture_id,visible.home_goals,visible.away_goals,visible.predicted_winner,visible.first_goal,
  visible.saved_at,visible.kickoff,visible.status,visible.home_en,visible.home_ml,visible.away_en,visible.away_ml,
  visible.round_en,visible.round_ml,visible.result_home,visible.result_away,visible.points
 FROM (
  SELECT md5('sbk-public:'||p.member_id::text) public_key,p.fixture_id,p.home_goals,p.away_goals,p.predicted_winner,p.first_goal,
   p.updated_at saved_at,f.kickoff,f.status,h.name_en home_en,h.name_ml home_ml,a.name_en away_en,a.name_ml away_ml,
   o.name_en round_en,o.name_ml round_ml,r.home_goals result_home,r.away_goals result_away,
   CASE WHEN f.status='finalized' THEN sbk.prediction_points(p.home_goals,p.away_goals,p.predicted_winner,p.first_goal,r.home_goals,r.away_goals,r.winner,r.first_goal) ELSE NULL END points,
   row_number() OVER(PARTITION BY p.member_id ORDER BY f.kickoff DESC,p.updated_at DESC) item_number
  FROM predictions p JOIN fixtures f ON f.id=p.fixture_id AND NOT f.demo
  JOIN profiles u ON u.id=p.member_id AND u.membership='approved'
  JOIN teams h ON h.id=f.home_id JOIN teams a ON a.id=f.away_id JOIN rounds o ON o.id=f.round_id
  LEFT JOIN results r ON r.fixture_id=f.id
  WHERE f.deadline<=clock_timestamp()
 ) visible WHERE visible.item_number<=10
 ORDER BY visible.public_key,visible.kickoff DESC
$$;

REVOKE ALL ON FUNCTION sbk.public_prediction_standings(),sbk.public_locked_predictions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sbk.public_prediction_standings(),sbk.public_locked_predictions() TO sbk_app;
