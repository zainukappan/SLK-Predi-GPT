import type { Row } from "./db";

export interface TeamQualificationInfo {
  teamId: string;
  nameEn: string;
  nameMl: string;
  badge?: string;
  pos: number;
  played: number;
  pts: number;
  gd: number;
  remCount: number;
  maxPts: number;
  isShieldWinner: boolean;
  isQualified: boolean;
  isEliminated: boolean;
  remainingFixtures: Array<{
    matchNumber: number;
    roundEn: string;
    roundMl: string;
    kickoff: string;
    opponentEn: string;
    opponentMl: string;
    opponentBadge?: string;
    isHome: boolean;
  }>;
  statusBadgeEn: string;
  statusBadgeMl: string;
  statusClass: "shield" | "qualified" | "contender-high" | "contender-mid" | "contender-low" | "eliminated";
  chancePct: number;
  needEn: string;
  needMl: string;
}

export function computeQualificationStatus(
  rows: Row[],
  fixtures: Row[]
): Record<string, TeamQualificationInfo> {
  const totalMatchesPerTeam = (rows.length - 1) * 2; // 10 matches for 6 teams

  // 1. Map initial team stats and remaining fixtures
  const teamsData = rows.map((r) => {
    const teamId = String(r.team_id);
    const played = Number(r.played);
    const pts = Number(r.points);
    const gd = Number(r.goal_difference);
    const pos = Number(r.table_position);

    // Remaining non-finalized, non-cancelled LEAGUE fixtures for this team (knockouts excluded!)
    const remList = fixtures
      .filter((f) => {
        const isKnockout =
          Boolean(f.knockout) ||
          (f.match_number != null && Number(f.match_number) > 30) ||
          String(f.round_en || "").toLowerCase().includes("semi") ||
          String(f.round_en || "").toLowerCase().includes("final");
        return (
          !isKnockout &&
          f.status !== "finalized" &&
          f.status !== "cancelled" &&
          (f.home_id === teamId || f.away_id === teamId)
        );
      })
      .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());

    const remainingFixtures = remList.map((f) => {
      const isHome = f.home_id === teamId;
      return {
        matchNumber: Number(f.match_number),
        roundEn: String(f.round_en || ""),
        roundMl: String(f.round_ml || f.round_en || ""),
        kickoff: String(f.kickoff),
        opponentEn: String(isHome ? f.away_en : f.home_en),
        opponentMl: String(isHome ? f.away_ml || f.away_en : f.home_ml || f.home_en),
        opponentBadge: String(isHome ? f.away_badge : f.home_badge),
        isHome,
      };
    });

    const remCount = remainingFixtures.length;
    const maxPts = pts + remCount * 3;

    return {
      teamId,
      nameEn: String(r.name_en),
      nameMl: String(r.name_ml || r.name_en),
      badge: r.badge,
      pos,
      played,
      pts,
      gd,
      remCount,
      maxPts,
      remainingFixtures,
    };
  });

  const result: Record<string, TeamQualificationInfo> = {};

  teamsData.forEach((team) => {
    const others = teamsData.filter((o) => o.teamId !== team.teamId);

    const allMatchesFinished = teamsData.every((t) => t.played >= totalMatchesPerTeam);

    // Shield Winner Condition:
    // No other team can reach team 1's current points
    const highestOtherMaxPts = Math.max(...others.map((o) => o.maxPts));
    const isShieldWinner =
      team.pos === 1 &&
      (team.pts > highestOtherMaxPts || (allMatchesFinished && highestOtherMaxPts <= team.pts));

    // Qualified for Top 4 (Semi-Finals):
    // Top 4 qualify out of 6. At least 2 other teams must be mathematically capped below team's current points,
    // OR all matches in the league have finished and team is in top 4.
    const teamsThatCannotCatch = others.filter((o) => o.maxPts < team.pts).length;
    const isQualified =
      teamsThatCannotCatch >= 2 || (allMatchesFinished && team.pos <= 4);

    // Guaranteed Top 2:
    // At least 4 other teams cannot mathematically catch this team's current points,
    // OR all matches in the league have finished and team is in top 2.
    const isGuaranteedTop2 =
      teamsThatCannotCatch >= 4 || (allMatchesFinished && team.pos <= 2);

    // Eliminated from Top 4:
    // At least 4 other teams have current points strictly greater than team's max possible points,
    // OR all matches in the league have finished and team is outside top 4.
    const teamsGuaranteedAhead = others.filter((o) => o.pts > team.maxPts).length;
    const isEliminated =
      teamsGuaranteedAhead >= 4 || (allMatchesFinished && team.pos > 4);

    let statusBadgeEn = "";
    let statusBadgeMl = "";
    let statusClass: TeamQualificationInfo["statusClass"] = "contender-mid";
    let chancePct = 50;
    let needEn = "";
    let needMl = "";

    const leader = teamsData[0];
    const isFirst = team.pos === 1;

    if (isShieldWinner) {
      statusBadgeEn = "Shield Winner 🏆";
      statusBadgeMl = "ഷീൽഡ് ജേതാക്കൾ 🏆";
      statusClass = "shield";
      chancePct = 100;
      needEn = "Super League Kerala Shield Champions! Officially secured 1st place.";
      needMl = "സൂപ്പർ ലീഗ് കേരള ഷീൽഡ് കിരീടം സ്വന്തമാക്കി! ഒന്നാം സ്ഥാനം ഔദ്യോഗികമായി ഉറപ്പിച്ചു.";
    } else if (isQualified) {
      statusBadgeEn = "Qualified (Q)";
      statusBadgeMl = "സെമി ഉറപ്പിച്ചു (Q)";
      statusClass = "qualified";
      chancePct = 100;

      if (isFirst) {
        const shieldNeed = Math.max(0, highestOtherMaxPts + 1 - team.pts);
        if (shieldNeed <= team.remCount * 3 && team.remCount > 0) {
          needEn = `Officially qualified for the semi-finals. Needs ${shieldNeed} more point${shieldNeed > 1 ? "s" : ""} from remaining ${team.remCount} matches to also seal the Super League Shield.`;
          needMl = `സെമി ഫൈനൽ യോഗ്യത ഉറപ്പിച്ചു. ശേഷിക്കുന്ന ${team.remCount} മത്സരങ്ങളിൽ നിന്ന് ${shieldNeed} പോയിന്റ് കൂടി നേടിയാൽ സൂപ്പർ ലീഗ് ഷീൽഡും സ്വന്തമാക്കാം.`;
        } else {
          needEn = "Officially qualified for the semi-finals. In prime position for the Super League Shield.";
          needMl = "സെമി ഫൈനൽ യോഗ്യത ഉറപ്പിച്ചു. സൂപ്പർ ലീഗ് ഷീൽഡ് നേടാൻ മികച്ച അവസരം.";
        }
      } else {
        const finishEn = isGuaranteedTop2
          ? "Guaranteed a top-2 finish in the league."
          : "Officially qualified for the semi-finals (Top 4).";
        const finishMl = isGuaranteedTop2
          ? "ലീഗിൽ ആദ്യ രണ്ട് സ്ഥാനങ്ങളിൽ ഒരെണ്ണം ഉറപ്പിച്ചു."
          : "സെമി ഫൈനൽ യോഗ്യത (Top 4) ഔദ്യോഗികമായി ഉറപ്പിച്ചു.";

        // Calculate points needed to guarantee top 2 (beating 3rd highest max among all teams):
        const othersSortedDesc = [...others].sort((a, b) => b.maxPts - a.maxPts);
        const top2Threshold = (othersSortedDesc[1]?.maxPts ?? 0) + 1;
        const ptsForTop2 = Math.max(0, top2Threshold - team.pts);
        const canGuaranteeTop2 = !isGuaranteedTop2 && ptsForTop2 <= team.remCount * 3 && ptsForTop2 > 0;

        const canOvertakeFirst = team.maxPts > leader.pts;
        const canTieFirst = team.maxPts === leader.pts;

        if (canTieFirst) {
          if (canGuaranteeTop2) {
            needEn = `${finishEn} Needs ${ptsForTop2} point${ptsForTop2 > 1 ? "s" : ""} from remaining ${team.remCount} matches to guarantee a top-2 finish. Can contend for the Shield on goal difference if ${leader.nameEn} drops all remaining points.`;
            needMl = `${finishMl} ടോപ്-2 ഉറപ്പിക്കാൻ ശേഷിക്കുന്ന ${team.remCount} മത്സരങ്ങളിൽ നിന്ന് ${ptsForTop2} പോയിന്റ് വേണം. ഒന്നാം സ്ഥാനക്കാർ ശേഷിക്കുന്ന കളികൾ തോറ്റാൽ ഗോൾ വ്യത്യാസത്തിൽ ഷീൽഡിനും സാധ്യതയുണ്ട്.`;
          } else {
            needEn = `${finishEn} Can contend for the Shield on goal difference if ${leader.nameEn} drops all remaining points.`;
            needMl = `${finishMl} ഒന്നാം സ്ഥാനക്കാർ ശേഷിക്കുന്ന കളികൾ തോറ്റാൽ ഗോൾ വ്യത്യാസത്തിൽ ഷീൽഡിനും സാധ്യതയുണ്ട്.`;
          }
        } else if (canOvertakeFirst) {
          if (canGuaranteeTop2) {
            needEn = `${finishEn} Needs ${ptsForTop2} point${ptsForTop2 > 1 ? "s" : ""} from remaining ${team.remCount} matches to guarantee a top-2 finish. Can challenge for the Shield if leaders drop points.`;
            needMl = `${finishMl} ടോപ്-2 ഉറപ്പിക്കാൻ ശേഷിക്കുന്ന ${team.remCount} മത്സരങ്ങളിൽ നിന്ന് ${ptsForTop2} പോയിന്റ് വേണം. ഒന്നാം സ്ഥാനക്കാർക്ക് പോയിന്റ് നഷ്ടമായാൽ ഷീൽഡിനായി വെല്ലുവിളിക്കാം.`;
          } else {
            needEn = `${finishEn} Can challenge for the Shield if leaders drop points in their remaining matches.`;
            needMl = `${finishMl} ഒന്നാം സ്ഥാനക്കാർക്ക് പോയിന്റ് നഷ്ടമായാൽ സൂപ്പർ ലീഗ് ഷീൽഡിനായി വെല്ലുവിളിക്കാം.`;
          }
        } else {
          // Leader's current points are strictly higher than this team's max possible points
          if (team.remCount === 0) {
            needEn = isGuaranteedTop2
              ? "Guaranteed 2nd place in the league. All 10 league matches completed."
              : "Officially qualified for the semi-finals. All 10 league matches completed.";
            needMl = isGuaranteedTop2
              ? "ലീഗിൽ രണ്ടാം സ്ഥാനം ഔദ്യോഗികമായി ഉറപ്പിച്ചു. എല്ലാ 10 ലീഗ് മത്സരങ്ങളും പൂർത്തിയായി."
              : "സെമി ഫൈനൽ യോഗ്യത ഉറപ്പിച്ചു. എല്ലാ 10 ലീഗ് മത്സരങ്ങളും പൂർത്തിയായി.";
          } else if (canGuaranteeTop2) {
            needEn = `${finishEn} Needs ${ptsForTop2} point${ptsForTop2 > 1 ? "s" : ""} from remaining ${team.remCount} matches to secure a top-2 finish.`;
            needMl = `${finishMl} ടോപ്-2 സ്ഥാനം ഉറപ്പിക്കാൻ ശേഷിക്കുന്ന ${team.remCount} മത്സരങ്ങളിൽ നിന്ന് ${ptsForTop2} പോയിന്റ് വേണം.`;
          } else {
            needEn = `${finishEn} Playing remaining matches for final playoff seeding.`;
            needMl = `${finishMl} മികച്ച സീഡിംഗിനായി ശേഷിക്കുന്ന മത്സരങ്ങൾ കളിക്കുന്നു.`;
          }
        }
      }
    } else if (isEliminated) {
      statusBadgeEn = "Eliminated (E)";
      statusBadgeMl = "പുറത്തായി (E)";
      statusClass = "eliminated";
      chancePct = 0;
      needEn = "Eliminated from semi-final contention.";
      needMl = "സെമി ഫൈനൽ യോഗ്യതാ സാധ്യതകൾ അവസാനിച്ചു.";
    } else {
      // In contention (positions 2 to 6)
      // Find 4th place and 5th place teams
      const fourthPlaceTeam = teamsData[3] || teamsData[teamsData.length - 1];
      const fifthPlaceTeam = teamsData[4] || teamsData[teamsData.length - 1];
      
      // Points needed to mathematically guarantee top 4 without depending on other results:
      // Must beat the team with the 2nd lowest max points among all other teams
      const otherMaxes = others.map((o) => o.maxPts).sort((a, b) => a - b);
      const thresholdPts = (otherMaxes[1] ?? fifthPlaceTeam.maxPts) + 1;
      const ptsToGuarantee = Math.max(0, thresholdPts - team.pts);

      if (team.pos <= 4) {
        // Currently inside top 4 qualification zone
        if (team.remCount === 0) {
          // Completed all matches, but awaiting other results
          statusBadgeEn = "In Top 4 (All Matches Played)";
          statusBadgeMl = "സെമി സോണിൽ (മത്സരങ്ങൾ കഴിഞ്ഞു)";
          statusClass = "contender-mid";
          chancePct = 70;
          needEn = `Completed all ${totalMatchesPerTeam} league matches with ${team.pts} points. Semi-final qualification depends on the remaining matches of other teams.`;
          needMl = `എല്ലാ ${totalMatchesPerTeam} ലീഗ് മത്സരങ്ങളും പൂർത്തിയായി (${team.pts} പോയിന്റ്). സെമി ഫൈനൽ യോഗ്യത മറ്റ് ടീമുകളുടെ ശേഷിക്കുന്ന മത്സരഫലങ്ങളെ ആശ്രയിച്ചിരിക്കുന്നു.`;
        } else {
          const isVeryClose = ptsToGuarantee <= 3;
          statusBadgeEn = isVeryClose ? "Virtually Qualified" : "In Top 4";
          statusBadgeMl = isVeryClose ? "യോഗ്യത ഏതാണ്ട് ഉറപ്പിച്ചു" : "സെമി സോണിൽ (Top 4)";
          statusClass = isVeryClose ? "contender-high" : "contender-mid";
          chancePct = isVeryClose ? 95 : 65;

          const winWordMl = ptsToGuarantee <= 3 ? "ഒരു ജയം" : `${Math.ceil(ptsToGuarantee / 3)} ജയം`;
          if (ptsToGuarantee <= team.remCount * 3) {
            needEn = `Currently in position #${team.pos}. Needs ${ptsToGuarantee > 0 ? `${ptsToGuarantee} more point${ptsToGuarantee > 1 ? "s" : ""} from remaining ${team.remCount} matches` : "to maintain position"} to officially guarantee a semi-final spot.`;
            needMl = `നിലവിൽ #${team.pos}-ാം സ്ഥാനത്ത്. ശേഷിക്കുന്ന ${team.remCount} മത്സരങ്ങളിൽ നിന്ന് ${ptsToGuarantee > 0 ? `${ptsToGuarantee} പോയിന്റ് (${winWordMl})` : "പോയിന്റുകൾ"} നേടിയാൽ മറ്റാരുടെയും ഫലങ്ങളെ ആശ്രയിക്കാതെ സെമി ഫൈനൽ ഔദ്യോഗികമായി ഉറപ്പിക്കാം.`;
          } else {
            needEn = `Currently in position #${team.pos}. Needs maximum points (${team.remCount * 3}) from remaining ${team.remCount} matches and favorable results to guarantee a semi-final spot.`;
            needMl = `നിലവിൽ #${team.pos}-ാം സ്ഥാനത്ത്. സെമി ഫൈനൽ ഉറപ്പിക്കാൻ ശേഷിക്കുന്ന ${team.remCount} മത്സരങ്ങളിൽ പരമാവധി പോയിന്റും (${team.remCount * 3}) മറ്റ് മത്സരങ്ങളിലെ അനുകൂല ഫലങ്ങളും വേണം.`;
          }
        }
      } else {
        // Outside top 4 (chasing positions 5 & 6)
        const ptsBehind = fourthPlaceTeam.pts - team.pts;
        const isClose = ptsBehind <= 3;
        statusBadgeEn = isClose ? "Chasing 4th" : "Uphill Battle";
        statusBadgeMl = isClose ? "പ്രതീക്ഷ സജീവം" : "കഠിനമായ വഴി";
        statusClass = isClose ? "contender-mid" : "contender-low";
        chancePct = isClose ? 35 : 15;

        if (ptsBehind <= 0) {
          needEn = `Level on points with 4th place (behind on tiebreaker). Needs strong results in the remaining ${team.remCount} matches to break into the semi-final spots.`;
          needMl = `നാലാം സ്ഥാനക്കാർക്കൊപ്പമാണ് (ടൈബ്രേക്കറിൽ മാത്രം പിന്നിൽ). ശേഷിക്കുന്ന ${team.remCount} മത്സരങ്ങളിലെ വിജയങ്ങൾ വഴി ആദ്യ 4-ലേക്ക് കയറാം.`;
        } else {
          needEn = `Just ${ptsBehind} point${ptsBehind > 1 ? "s" : ""} behind 4th place. Needs at least ${Math.min(team.maxPts - team.pts, ptsBehind + 3)} points from remaining ${team.remCount} matches to challenge for top 4.`;
          needMl = `നാലാം സ്ഥാനക്കാരുമായി ${ptsBehind} പോയിന്റ് വ്യത്യാസം മാത്രം. ശേഷിക്കുന്ന ${team.remCount} മത്സരങ്ങളിൽ മികച്ച വിജയങ്ങൾ നേടിയാൽ ആദ്യ 4-ലേക്ക് മുന്നേറാം.`;
        }
      }
    }

    result[team.teamId] = {
      ...team,
      isShieldWinner,
      isQualified,
      isEliminated,
      statusBadgeEn,
      statusBadgeMl,
      statusClass,
      chancePct,
      needEn,
      needMl,
    };
  });

  return result;
}
