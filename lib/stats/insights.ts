import type { TeamInsights, TeamStanding } from "@/lib/types";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

interface InsightBuildOptions {
  transferImpactByTeam?: Map<string, number>;
}

export function buildTeamInsights(
  standings: TeamStanding[],
  options: InsightBuildOptions = {},
): TeamInsights[] {
  const leaderPoints = standings[0]?.totalPoints ?? 0;
  const podiumPoints = standings[2]?.totalPoints ?? leaderPoints;
  const points = standings.map((team) => team.totalPoints);
  const mean = points.reduce((acc, p) => acc + p, 0) / (points.length || 1);

  return standings.map((team) => {
    const top3Contribution = team.contributors
      .slice(0, 3)
      .reduce((acc, p) => acc + p.pointsAfterMultiplier, 0);

    const variance =
      standings.length === 0
        ? 0
        : points.reduce((acc, p) => acc + (p - mean) ** 2, 0) / standings.length;

    const overlapScore =
      standings.length <= 1
        ? 0
        : team.contributors.length / standings.reduce((acc, s) => acc + s.contributors.length, 0);

    const movement =
      team.previousRank === null ? 0 : clamp(team.previousRank - team.rank, -10, 10);

    return {
      leagueTeamId: team.leagueTeamId,
      statsV1: {
        rankMomentum: movement,
        pointsBehindLeader: Number((leaderPoints - team.totalPoints).toFixed(2)),
        pointsBehindPodium: Number(
          (Math.max(podiumPoints - team.totalPoints, 0)).toFixed(2),
        ),
        captainRoi: Number((team.captainBonus + team.viceCaptainBonus).toFixed(2)),
        consistencyIndex: Number(Math.sqrt(variance).toFixed(2)),
        topContributorConcentration: Number(
          ((top3Contribution / (team.totalPoints || 1)) * 100).toFixed(2),
        ),
      },
      statsV2: {
        transferImpactScore: Number(
          (options.transferImpactByTeam?.get(team.leagueTeamId) ?? 0).toFixed(2),
        ),
        differentialHeroCount: team.contributors.filter((item) => item.multiplier === 1).length,
        overlapScore: Number((overlapScore * 100).toFixed(2)),
        clutchScore: Number((team.totalPoints * 0.2 + movement).toFixed(2)),
      },
    };
  });
}
