import { test } from "node:test";
import assert from "node:assert/strict";
import { computeQualificationStatus } from "../src/lib/qualification";

test("qualification status correctly handles top 4, shield, and realistic points", () => {
  const rows = [
    { team_id: "calicut", name_en: "CALICUT FC", name_ml: "കാലിക്കറ്റ് എഫ്സി", table_position: 1, played: 8, points: 20, goal_difference: 11 },
    { team_id: "malappuram", name_en: "MALAPPURAM FC", name_ml: "മലപ്പുറം എഫ് സി", table_position: 2, played: 8, points: 14, goal_difference: 6 },
    { team_id: "kochi", name_en: "FORCA KOCHI FC", name_ml: "ഫോഴ്സ കൊച്ചി എഫ്സി", table_position: 3, played: 8, points: 13, goal_difference: 2 },
    { team_id: "kombans", name_en: "THIRUVANANTHAPURAM KOMBANS FC", name_ml: "തിരുവനന്തപുരം കൊമ്പൻസ് എഫ്സി", table_position: 4, played: 8, points: 11, goal_difference: -4 },
    { team_id: "thrissur", name_en: "THRISSUR MAGIC FC", name_ml: "തൃശൂർ മാജിക് എഫ്സി", table_position: 5, played: 8, points: 7, goal_difference: -5 },
    { team_id: "kannur", name_en: "KANNUR WARRIORS FC", name_ml: "കണ്ണൂർ വാരിയേഴ്സ് എഫ്സി", table_position: 6, played: 8, points: 7, goal_difference: -10 },
  ];

  const fixtures = [
    { match_number: 25, home_id: "kochi", away_id: "kannur", status: "scheduled", kickoff: "2026-11-20T14:00:00Z" },
    { match_number: 26, home_id: "malappuram", away_id: "kombans", status: "scheduled", kickoff: "2026-11-21T14:00:00Z" },
    { match_number: 27, home_id: "calicut", away_id: "thrissur", status: "scheduled", kickoff: "2026-11-22T14:00:00Z" },
    { match_number: 28, home_id: "kannur", away_id: "malappuram", status: "scheduled", kickoff: "2026-11-25T14:00:00Z" },
    { match_number: 29, home_id: "kochi", away_id: "calicut", status: "scheduled", kickoff: "2026-11-26T14:00:00Z" },
    { match_number: 30, home_id: "thrissur", away_id: "kombans", status: "scheduled", kickoff: "2026-11-27T14:00:00Z" },
  ];

  const status = computeQualificationStatus(rows, fixtures);

  // 1. Calicut FC
  assert.equal(status["calicut"].isQualified, true);
  assert.equal(status["calicut"].isShieldWinner, false);
  assert.match(status["calicut"].needEn, /Needs 1 more point/);

  // 2. Malappuram FC
  assert.equal(status["malappuram"].isQualified, true);
  assert.equal(status["malappuram"].isShieldWinner, false);
  // Malappuram must NOT say "Needs 13 more points" or "Guaranteed a top-2 finish"
  assert.doesNotMatch(status["malappuram"].needEn, /13 more points/);
  assert.doesNotMatch(status["malappuram"].needEn, /Guaranteed a top-2 finish/);
  assert.match(status["malappuram"].needEn, /Officially qualified for the semi-finals/);
  assert.match(status["malappuram"].needEn, /Needs 6 points/);

  // 3. Forca Kochi FC
  assert.equal(status["kochi"].isQualified, false);
  assert.match(status["kochi"].needEn, /Needs 1 more point/);

  // 4. Thiruvananthapuram Kombans FC
  assert.equal(status["kombans"].isQualified, false);
  assert.match(status["kombans"].needEn, /Needs 3 more points/);

  // 5. Thrissur Magic FC
  assert.equal(status["thrissur"].isEliminated, false);

  // 6. Kannur Warriors FC
  assert.equal(status["kannur"].isEliminated, false);
});
