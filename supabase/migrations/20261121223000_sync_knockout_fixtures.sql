CREATE OR REPLACE FUNCTION sbk.sync_knockout_fixtures()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sbk, pg_temp
AS $$
DECLARE
  v_team1 uuid;
  v_team2 uuid;
  v_team3 uuid;
  v_team4 uuid;
  v_semis_round_id uuid;
  v_final_round_id uuid;
  v_sf1_w uuid;
  v_sf2_w uuid;
  v_m31_id uuid;
  v_m32_id uuid;
  v_m33_id uuid;
  v_m34_id uuid;
  v_m35_id uuid;
  v_m31_status text;
  v_m32_status text;
  v_m33_status text;
  v_m34_status text;
  v_m35_status text;
  v_m31_h integer; v_m31_a integer;
  v_m33_h integer; v_m33_a integer;
  v_m33_pw text;
  v_m32_h integer; v_m32_a integer;
  v_m34_h integer; v_m34_a integer;
  v_m34_pw text;
  v_sf1_t1_goals integer;
  v_sf1_t4_goals integer;
  v_sf2_t2_goals integer;
  v_sf2_t3_goals integer;
BEGIN
  -- 1. Identify top 4 seeds from public_points_table()
  SELECT team_id INTO v_team1 FROM sbk.public_points_table() WHERE table_position = 1;
  SELECT team_id INTO v_team2 FROM sbk.public_points_table() WHERE table_position = 2;
  SELECT team_id INTO v_team3 FROM sbk.public_points_table() WHERE table_position = 3;
  SELECT team_id INTO v_team4 FROM sbk.public_points_table() WHERE table_position = 4;

  IF v_team1 IS NULL OR v_team2 IS NULL OR v_team3 IS NULL OR v_team4 IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Insufficient teams to form semi-finals');
  END IF;

  -- 2. Ensure Semi-Finals round exists in sbk.rounds
  SELECT id INTO v_semis_round_id FROM sbk.rounds WHERE sort_order = 11 OR stage_en = 'Semi-Final' OR name_en = 'Semi-Finals' LIMIT 1;
  IF v_semis_round_id IS NULL THEN
    INSERT INTO sbk.rounds(id, name_en, name_ml, sort_order, active, stage_en, stage_ml)
    VALUES (gen_random_uuid(), 'Semi-Finals', 'സെമി ഫൈനലുകൾ', 11, true, 'Semi-Final', 'സെമി ഫൈനൽ')
    RETURNING id INTO v_semis_round_id;
  ELSE
    UPDATE sbk.rounds SET active = true, sort_order = 11, stage_en = 'Semi-Final', stage_ml = 'സെമി ഫൈനൽ' WHERE id = v_semis_round_id;
  END IF;

  -- Ensure Grand Final round exists in sbk.rounds (explicitly excluding semi-final)
  SELECT id INTO v_final_round_id FROM sbk.rounds WHERE sort_order = 12 OR (stage_en = 'Final' AND name_en <> 'Semi-Finals') OR (name_en ILIKE '%final%' AND name_en NOT ILIKE '%semi%') LIMIT 1;
  IF v_final_round_id IS NULL THEN
    INSERT INTO sbk.rounds(id, name_en, name_ml, sort_order, active, stage_en, stage_ml)
    VALUES (gen_random_uuid(), 'Grand Final', 'ഗ്രാൻഡ് ഫൈനൽ', 12, true, 'Final', 'ഫൈനൽ')
    RETURNING id INTO v_final_round_id;
  ELSE
    UPDATE sbk.rounds SET active = true, sort_order = 12, stage_en = 'Final', stage_ml = 'ഫൈനൽ' WHERE id = v_final_round_id;
  END IF;

  -- 3. Match 31: SF1 Leg 1 (Seed 4 Home vs Seed 1 Away)
  SELECT id, status INTO v_m31_id, v_m31_status FROM sbk.fixtures WHERE match_number = 31;
  IF v_m31_id IS NULL THEN
    INSERT INTO sbk.fixtures(
      match_number, round_id, home_id, away_id, kickoff, venue_en, venue_ml,
      knockout, status, schedule_note_en, schedule_note_ml
    ) VALUES (
      31, v_semis_round_id, v_team4, v_team1, '2026-12-01 14:00:00+00'::timestamptz, 'TBD', 'TBD',
      true, 'scheduled', 'Semi-Final 1 · Leg 1', 'സെമി ഫൈനൽ 1 · ലെഗ് 1'
    ) RETURNING id INTO v_m31_id;
  ELSIF v_m31_status = 'scheduled' THEN
    UPDATE sbk.fixtures SET round_id = v_semis_round_id, home_id = v_team4, away_id = v_team1 WHERE id = v_m31_id AND (round_id <> v_semis_round_id OR home_id <> v_team4 OR away_id <> v_team1);
  END IF;

  -- 4. Match 32: SF2 Leg 1 (Seed 3 Home vs Seed 2 Away)
  SELECT id, status INTO v_m32_id, v_m32_status FROM sbk.fixtures WHERE match_number = 32;
  IF v_m32_id IS NULL THEN
    INSERT INTO sbk.fixtures(
      match_number, round_id, home_id, away_id, kickoff, venue_en, venue_ml,
      knockout, status, schedule_note_en, schedule_note_ml
    ) VALUES (
      32, v_semis_round_id, v_team3, v_team2, '2026-12-02 14:00:00+00'::timestamptz, 'TBD', 'TBD',
      true, 'scheduled', 'Semi-Final 2 · Leg 1', 'സെമി ഫൈനൽ 2 · ലെഗ് 1'
    ) RETURNING id INTO v_m32_id;
  ELSIF v_m32_status = 'scheduled' THEN
    UPDATE sbk.fixtures SET round_id = v_semis_round_id, home_id = v_team3, away_id = v_team2 WHERE id = v_m32_id AND (round_id <> v_semis_round_id OR home_id <> v_team3 OR away_id <> v_team2);
  END IF;

  -- 5. Match 33: SF1 Leg 2 (Seed 1 Home vs Seed 4 Away)
  SELECT id, status INTO v_m33_id, v_m33_status FROM sbk.fixtures WHERE match_number = 33;
  IF v_m33_id IS NULL THEN
    INSERT INTO sbk.fixtures(
      match_number, round_id, home_id, away_id, kickoff, venue_en, venue_ml,
      knockout, status, schedule_note_en, schedule_note_ml
    ) VALUES (
      33, v_semis_round_id, v_team1, v_team4, '2026-12-05 14:00:00+00'::timestamptz, 'TBD', 'TBD',
      true, 'scheduled', 'Semi-Final 1 · Leg 2', 'സെമി ഫൈനൽ 1 · ലെഗ് 2'
    ) RETURNING id INTO v_m33_id;
  ELSIF v_m33_status = 'scheduled' THEN
    UPDATE sbk.fixtures SET round_id = v_semis_round_id, home_id = v_team1, away_id = v_team4 WHERE id = v_m33_id AND (round_id <> v_semis_round_id OR home_id <> v_team1 OR away_id <> v_team4);
  END IF;

  -- 6. Match 34: SF2 Leg 2 (Seed 2 Home vs Seed 3 Away)
  SELECT id, status INTO v_m34_id, v_m34_status FROM sbk.fixtures WHERE match_number = 34;
  IF v_m34_id IS NULL THEN
    INSERT INTO sbk.fixtures(
      match_number, round_id, home_id, away_id, kickoff, venue_en, venue_ml,
      knockout, status, schedule_note_en, schedule_note_ml
    ) VALUES (
      34, v_semis_round_id, v_team2, v_team3, '2026-12-06 14:00:00+00'::timestamptz, 'TBD', 'TBD',
      true, 'scheduled', 'Semi-Final 2 · Leg 2', 'സെമി ഫൈനൽ 2 · ലെഗ് 2'
    ) RETURNING id INTO v_m34_id;
  ELSIF v_m34_status = 'scheduled' THEN
    UPDATE sbk.fixtures SET round_id = v_semis_round_id, home_id = v_team2, away_id = v_team3 WHERE id = v_m34_id AND (round_id <> v_semis_round_id OR home_id <> v_team2 OR away_id <> v_team3);
  END IF;

  -- 7. Determine Finalists (SF1 Winner vs SF2 Winner)
  -- Default to projected finalists: Seed 1 vs Seed 2
  v_sf1_w := v_team1;
  v_sf2_w := v_team2;

  -- Check if SF1 (M31 and M33) is finalized
  SELECT f.status, r.home_goals, r.away_goals INTO v_m31_status, v_m31_h, v_m31_a
  FROM sbk.fixtures f LEFT JOIN sbk.results r ON r.fixture_id = f.id WHERE f.match_number = 31;

  SELECT f.status, r.home_goals, r.away_goals, r.shootout_winner INTO v_m33_status, v_m33_h, v_m33_a, v_m33_pw
  FROM sbk.fixtures f LEFT JOIN sbk.results r ON r.fixture_id = f.id WHERE f.match_number = 33;

  IF v_m31_status = 'finalized' AND v_m33_status = 'finalized' THEN
    v_sf1_t1_goals := coalesce(v_m31_a, 0) + coalesce(v_m33_h, 0);
    v_sf1_t4_goals := coalesce(v_m31_h, 0) + coalesce(v_m33_a, 0);
    IF v_sf1_t1_goals > v_sf1_t4_goals THEN
      v_sf1_w := v_team1;
    ELSIF v_sf1_t4_goals > v_sf1_t1_goals THEN
      v_sf1_w := v_team4;
    ELSE
      IF v_m33_pw = 'home' THEN
        v_sf1_w := v_team1;
      ELSIF v_m33_pw = 'away' THEN
        v_sf1_w := v_team4;
      ELSE
        v_sf1_w := v_team1;
      END IF;
    END IF;
  END IF;

  -- Check if SF2 (M32 and M34) is finalized
  SELECT f.status, r.home_goals, r.away_goals INTO v_m32_status, v_m32_h, v_m32_a
  FROM sbk.fixtures f LEFT JOIN sbk.results r ON r.fixture_id = f.id WHERE f.match_number = 32;

  SELECT f.status, r.home_goals, r.away_goals, r.shootout_winner INTO v_m34_status, v_m34_h, v_m34_a, v_m34_pw
  FROM sbk.fixtures f LEFT JOIN sbk.results r ON r.fixture_id = f.id WHERE f.match_number = 34;

  IF v_m32_status = 'finalized' AND v_m34_status = 'finalized' THEN
    v_sf2_t2_goals := coalesce(v_m32_a, 0) + coalesce(v_m34_h, 0);
    v_sf2_t3_goals := coalesce(v_m32_h, 0) + coalesce(v_m34_a, 0);
    IF v_sf2_t2_goals > v_sf2_t3_goals THEN
      v_sf2_w := v_team2;
    ELSIF v_sf2_t3_goals > v_sf2_t2_goals THEN
      v_sf2_w := v_team3;
    ELSE
      IF v_m34_pw = 'home' THEN
        v_sf2_w := v_team2;
      ELSIF v_m34_pw = 'away' THEN
        v_sf2_w := v_team3;
      ELSE
        v_sf2_w := v_team2;
      END IF;
    END IF;
  END IF;

  -- 8. Match 35: Grand Final (Winner SF1 vs Winner SF2)
  SELECT id, status INTO v_m35_id, v_m35_status FROM sbk.fixtures WHERE match_number = 35;
  IF v_m35_id IS NULL THEN
    INSERT INTO sbk.fixtures(
      match_number, round_id, home_id, away_id, kickoff, venue_en, venue_ml,
      knockout, status, schedule_note_en, schedule_note_ml
    ) VALUES (
      35, v_final_round_id, v_sf1_w, v_sf2_w, '2026-12-10 14:00:00+00'::timestamptz, 'TBD', 'TBD',
      true, 'scheduled', 'Grand Final · Single Match', 'ഗ്രാൻഡ് ഫൈനൽ · സിംഗിൾ മാച്ച്'
    ) RETURNING id INTO v_m35_id;
  ELSIF v_m35_status = 'scheduled' THEN
    UPDATE sbk.fixtures SET round_id = v_final_round_id, home_id = v_sf1_w, away_id = v_sf2_w WHERE id = v_m35_id AND (round_id <> v_final_round_id OR home_id <> v_sf1_w OR away_id <> v_sf2_w);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'm31', v_m31_id,
    'm32', v_m32_id,
    'm33', v_m33_id,
    'm34', v_m34_id,
    'm35', v_m35_id,
    'sf1_winner', v_sf1_w,
    'sf2_winner', v_sf2_w
  );
END;
$$;

REVOKE ALL ON FUNCTION sbk.sync_knockout_fixtures() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sbk.sync_knockout_fixtures() TO sbk_app;

-- Run sync immediately to update Match 35 round
SELECT sbk.sync_knockout_fixtures();
