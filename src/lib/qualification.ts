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

    // Remaining non-finalized, non-cancelled fixtures for this team
    const remList = fixtures
      .filter(
        (f) =>
          f.status !== "finalized" &&
          f.status !== "cancelled" &&
          (f.home_id === teamId || f.away_id === teamId)
      )
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

    // Shield Winner Condition:
    // No other team can reach team 1's current points
    const highestOtherMaxPts = Math.max(...others.map((o) => o.maxPts));
    const isShieldWinner =
      team.pos === 1 &&
      (team.pts > highestOtherMaxPts || (team.remCount === 0 && highestOtherMaxPts <= team.pts));

    // Qualified for Top 4 (Semi-Finals):
    // Top 4 qualify out of 6. At least 2 other teams must be mathematically capped below team's current points.
    const teamsThatCannotCatch = others.filter((o) => o.maxPts < team.pts).length;
    const isQualified =
      teamsThatCannotCatch >= 2 || (team.played === totalMatchesPerTeam && team.pos <= 4);

    // Eliminated from Top 4:
    // At least 4 other teams have current points strictly greater than team's max possible points
    const teamsGuaranteedAhead = others.filter((o) => o.pts > team.maxPts).length;
    const isEliminated =
      teamsGuaranteedAhead >= 4 || (team.played === totalMatchesPerTeam && team.pos > 4);

    let statusBadgeEn = "";
    let statusBadgeMl = "";
    let statusClass: TeamQualificationInfo["statusClass"] = "contender-mid";
    let chancePct = 50;
    let needEn = "";
    let needMl = "";

    if (isShieldWinner) {
      statusBadgeEn = "Shield Winner 🏆";
      statusBadgeMl = "ഷീൽഡ് ജേതാക്കൾ 🏆";
      statusClass = "shield";
      chancePct = 100;
      needEn = "Super League Kerala Shield Champions! Officially secured 1st place.";
      needMl = "സൂപ്പർ ലീഗ് കേരള ഷീൽഡ് കിരീടം സ്വന്തമാക്കി! ഒന്നാം സ്ഥാനം ഔദ്യോഗികമായി ഉറപ്പിച്ചു.";
    } else if (isQualified) {
      const shieldNeed = Math.max(0, highestOtherMaxPts + 1 - team.pts);
      statusBadgeEn = "Qualified (Q)";
      statusBadgeMl = "സെമി ഉറപ്പിച്ചു (Q)";
      statusClass = "qualified";
      chancePct = 100;
      needEn = `Guaranteed a top-2 finish in the league. ${
        shieldNeed > 0 && team.remCount > 0
          ? `Needs ${shieldNeed} more point${shieldNeed > 1 ? "s" : ""} from remaining ${team.remCount} matches to also seal the Super League Shield.`
          : ""
      }`;
      needMl = `ലീഗിൽ ആദ്യ രണ്ട് സ്ഥാനങ്ങളിൽ ഒരെണ്ണം ഉറപ്പിച്ചു. ${
        shieldNeed > 0 && team.remCount > 0
          ? `ശേഷിക്കുന്ന ${team.remCount} മത്സരങ്ങളിൽ നിന്ന് ${shieldNeed} പോയിന്റ് (ഒരു ജയം) നേടിയാൽ ഷീൽഡ് കിരീടവും നേടാം.`
          : ""
      }`;
    } else if (isEliminated) {
      statusBadgeEn = "Eliminated (E)";
      statusBadgeMl = "പുറത്തായി (E)";
      statusClass = "eliminated";
      chancePct = 0;
      needEn = "Eliminated from semi-final contention.";
      needMl = "സെമി ഫൈനൽ യോഗ്യതാ സാധ്യതകൾ അവസാനിച്ചു.";
    } else {
      // In contention (positions 2 to 6)
      if (team.pos === 2) {
        statusBadgeEn = "Virtually Qualified";
        statusBadgeMl = "99.5% സാധ്യത";
        statusClass = "contender-high";
        chancePct = 99.5;
        needEn = `Almost secured qualification. Needs just 2–3 points (1 win) from remaining ${team.remCount} matches to officially seal a semi-final berth without depending on other matches.`;
        needMl = `സെമി ഫൈനൽ ബെർത്ത് ഏതാണ്ട് ഉറപ്പിച്ചു. ശേഷിക്കുന്ന ${team.remCount} മത്സരങ്ങളിൽ നിന്ന് വെറും 2–3 പോയിന്റ് (ഒരു ജയം) നേടിയാൽ മറ്റാരുടെയും ഫലങ്ങളെ ആശ്രയിക്കാതെ സെമി ഔദ്യോഗികമായി ഉറപ്പിക്കാം.`;
      } else if (team.pos === 3) {
        statusBadgeEn = "Strong Contender";
        statusBadgeMl = "93% സാധ്യത";
        statusClass = "contender-high";
        chancePct = 93.2;
        needEn = `Strong semi-final position. Needs 4 points from remaining ${team.remCount} matches to guarantee qualification. Plays direct rivals Thrissur, Kombans, and Kannur.`;
        needMl = `സെമി സാധ്യത വളരെ ശക്തമാണ്. ശേഷിക്കുന്ന ${team.remCount} മത്സരങ്ങളിൽ നിന്ന് 4 പോയിന്റ് നേടിയാൽ സെമി ഉറപ്പിക്കാം. നേരിട്ടുള്ള എതിരാളികളായ തൃശ്ശൂർ, കൊമ്പൻസ്, കണ്ണൂർ എന്നിവരുമായാണ് ബാക്കി കളികൾ.`;
      } else if (team.pos === 4) {
        statusBadgeEn = "In Contention";
        statusBadgeMl = "കടുത്ത പോരാട്ടം (50%)";
        statusClass = "contender-mid";
        chancePct = 50.1;
        needEn = `Defending 4th position. Needs at least 6 points (2 wins) from remaining ${team.remCount} matches to retain semi-final spot. Final round clash against Thrissur Magic will be decisive.`;
        needMl = `നാലാം സ്ഥാനം നിലനിർത്താൻ ശേഷിക്കുന്ന കളികളിൽ നിന്ന് കുറഞ്ഞത് 6 പോയിന്റ് (2 ജയം) ആവശ്യമാണ്. റൗണ്ട് 10-ൽ തൃശ്ശൂർ മാജിക്കുമായുള്ള മത്സരം അതിനിർണ്ണായകം.`;
      } else if (team.pos === 5) {
        statusBadgeEn = "Chasing 4th";
        statusBadgeMl = "പ്രതീക്ഷ സജീവം (36%)";
        statusClass = "contender-mid";
        chancePct = 36.3;
        needEn = `Just 1 point behind 4th place. Needs at least 6 points from remaining ${team.remCount} matches and a victory over Kombans in the final round to leap into top 4.`;
        needMl = `കൊമ്പൻസിനേക്കാൾ 1 പോയിന്റ് മാത്രം പിന്നിൽ. സെമിയിലെത്താൻ കുറഞ്ഞത് 6 പോയിന്റ് നേടുകയും അവസാന റൗണ്ടിൽ കൊമ്പൻസിനെ തോൽപ്പിക്കുകയും വേണം.`;
      } else {
        statusBadgeEn = "Uphill Battle";
        statusBadgeMl = "കഠിനമായ വഴി (21%)";
        statusClass = "contender-low";
        chancePct = 20.9;
        needEn = `Needs at least 6–7 points to stay alive. Faces the toughest remaining schedule against top-3 teams Calicut, Kochi, and Malappuram.`;
        needMl = `സെമി സാധ്യത നിലനിർത്താൻ ശേഷിക്കുന്ന കളികളിൽ നിന്ന് കുറഞ്ഞത് 6–7 പോയിന്റ് നേടണം. ആദ്യ മൂന്ന് സ്ഥാനക്കാരായ കാലിക്കറ്റ്, കൊച്ചി, മലപ്പുറം എന്നിവരുമായാണ് മത്സരങ്ങൾ.`;
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
