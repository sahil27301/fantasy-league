import { resolveWindowIndex } from "@/lib/scoring/windows";
import type {
  CaptainWindow,
  IplLivePlayer,
  LeagueTeam,
  NormalizedRosterEntry,
  ScoreComputationResult,
  TeamStanding,
} from "@/lib/types";
import { buildTeamInsights } from "@/lib/stats/insights";

interface ScoringInput {
  matchNumber: number;
  teams: LeagueTeam[];
  roster: NormalizedRosterEntry[];
  captainWindows: CaptainWindow[];
  livePlayers: IplLivePlayer[];
  previousStandings?: TeamStanding[];
}

export function computeScores(input: ScoringInput): ScoreComputationResult {
  const {
    matchNumber,
    teams,
    roster,
    captainWindows,
    livePlayers,
    previousStandings = [],
  } = input;
  const activeWindowIndex = resolveWindowIndex(matchNumber);
  const generatedAt = new Date().toISOString();

  console.info("[scoring-engine] Starting score computation", {
    matchNumber,
    activeWindowIndex,
    teamCount: teams.length,
    rosterEntryCount: roster.length,
    captainWindowCount: captainWindows.length,
    livePlayerCount: livePlayers.length,
  });

  const livePlayerMap = new Map(livePlayers.map((player) => [player.id, player]));
  const previousRankMap = new Map(
    previousStandings.map((standing) => [standing.leagueTeamId, standing.rank]),
  );

  const standings = teams.map((team) => {
    const teamRoster = roster.filter(
      (entry) => entry.ownerName.toLowerCase() === team.ownerName.toLowerCase(),
    );
    const activeRoster = teamRoster.filter(
      (entry) => entry.windowIndex === activeWindowIndex,
    );

    const window = captainWindows.find(
      (entry) =>
        entry.leagueTeamId === team.id && entry.windowIndex === activeWindowIndex,
    );

    let captainBonus = 0;
    let viceCaptainBonus = 0;

    const contributors = activeRoster
      .map((entry) => {
        const livePlayer = livePlayerMap.get(entry.resolvedPlayerId);
        if (!livePlayer) {
          return null;
        }

        let multiplier = 1;
        let role: "captain" | "viceCaptain" | "normal" = "normal";

        if (window && entry.resolvedPlayerId === window.captainPlayerId) {
          multiplier = 2;
          role = "captain";
        } else if (window && entry.resolvedPlayerId === window.viceCaptainPlayerId) {
          multiplier = 1.5;
          role = "viceCaptain";
        }

        const boosted = livePlayer.overallPoints * multiplier;
        const bonus = boosted - livePlayer.overallPoints;

        if (role === "captain") {
          captainBonus += bonus;
        } else if (role === "viceCaptain") {
          viceCaptainBonus += bonus;
        }

        return {
          playerId: livePlayer.id,
          playerName: livePlayer.shortName,
          teamShortName: livePlayer.teamShortName,
          overallPoints: livePlayer.overallPoints,
          multiplier,
          pointsAfterMultiplier: boosted,
          role,
        };
      })
      .filter((value): value is NonNullable<typeof value> => value !== null)
      .sort((a, b) => b.pointsAfterMultiplier - a.pointsAfterMultiplier);

    const totalPoints = contributors.reduce(
      (acc, player) => acc + player.pointsAfterMultiplier,
      0,
    );

    return {
      leagueTeamId: team.id,
      ownerName: team.ownerName,
      displayName: team.displayName,
      totalPoints: Number(totalPoints.toFixed(2)),
      captainBonus: Number(captainBonus.toFixed(2)),
      viceCaptainBonus: Number(viceCaptainBonus.toFixed(2)),
      rank: 0,
      previousRank: previousRankMap.get(team.id) ?? null,
      contributors,
    };
  });

  standings.sort((a, b) => b.totalPoints - a.totalPoints);
  standings.forEach((standing, index) => {
    standing.rank = index + 1;
  });

  console.info("[scoring-engine] Score computation completed", {
    generatedAt,
    leader: standings[0]?.ownerName ?? null,
    leaderPoints: standings[0]?.totalPoints ?? null,
  });

  return {
    snapshot: {
      snapshotAt: generatedAt,
      matchNumber,
      standings,
    },
    teamInsights: buildTeamInsights(standings),
    generatedAt,
  };
}
