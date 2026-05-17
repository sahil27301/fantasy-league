import {
  getCaptainWindows,
  getLeagueTeams,
  getNormalizedRoster,
} from "@/lib/data/seed";
import { fetchLivePlayers } from "@/lib/ipl/client";
import type { IplLivePlayer } from "@/lib/types";
import {
  fetchLatestScoreComputation,
  persistScoreComputation,
} from "@/lib/db/repositories/snapshots";
import { getMatchProgression } from "@/lib/progression/match-progression";
import { getLiveCache, setLiveResult } from "@/lib/state/live-cache";
import { buildTeamInsights } from "@/lib/stats/insights";
import type {
  NormalizedRosterEntry,
  ScoreComputationResult,
  TeamStanding,
  UnsoldXiBenchmark,
} from "@/lib/types";
import { promises as fs } from "node:fs";
import path from "node:path";

export async function getLeagueComputation(forceRefresh = false) {
  const roster = getNormalizedRoster();
  const cache = getLiveCache();
  if (!forceRefresh && cache.lastResult) {
    const hydrated = await hydrateUnsoldXiBenchmark(cache.lastResult, roster);
    console.info("[score-service] Returning cached score result", {
      generatedAt: hydrated.generatedAt,
    });
    setLiveResult(hydrated);
    try {
      await persistScoreComputation(hydrated);
    } catch (error) {
      console.error("[score-service] Cached persistence attempt failed", {
        error,
      });
    }
    return hydrated;
  }

  if (!forceRefresh) {
    const persisted = await fetchLatestScoreComputation();
    if (persisted) {
      const hydrated = await hydrateUnsoldXiBenchmark(persisted, roster);
      console.info("[score-service] Returning persisted score result", {
        generatedAt: hydrated.generatedAt,
      });
      setLiveResult(hydrated);
      return hydrated;
    }
  }

  const teams = getLeagueTeams();
  const captainWindows = getCaptainWindows();
  await assertNoUnresolvedRows();

  console.info("[score-service] Preparing canonical score computation", {
    forceRefresh,
    teams: teams.length,
    rosterEntries: roster.length,
    captainWindows: captainWindows.length,
  });

  const progression = await getMatchProgression(forceRefresh);
  const latestMatch = progression.matches.at(-1) ?? 0;
  const previousMatch = progression.matches.at(-2);
  const previousRankByTeam = new Map<string, number>();
  const previousPointsByTeam = new Map<string, number>();

  if (previousMatch !== undefined) {
    for (const team of progression.teams) {
      const point = team.series.find(
        (entry) => entry.matchNumber === previousMatch,
      );
      if (point) {
        previousRankByTeam.set(team.leagueTeamId, point.rank);
        previousPointsByTeam.set(team.leagueTeamId, point.cumulativePoints);
      }
    }
  }

  const standings: TeamStanding[] = progression.teams
    .map((team) => {
      const latestPoint = team.series.at(-1);
      if (!latestPoint) {
        return null;
      }
      return {
        leagueTeamId: team.leagueTeamId,
        ownerName: team.ownerName,
        displayName: team.displayName,
        totalPoints: latestPoint.cumulativePoints,
        captainBonus: team.captainBonus,
        viceCaptainBonus: team.viceCaptainBonus,
        rank: latestPoint.rank,
        previousRank: previousRankByTeam.get(team.leagueTeamId) ?? null,
        contributors: team.contributors,
      };
    })
    .filter((value): value is TeamStanding => value !== null)
    .sort((a, b) => a.rank - b.rank);

  const transferImpactByTeam = new Map(
    progression.teams.map((team) => [
      team.leagueTeamId,
      team.transferImpactScore,
    ]),
  );
  let unsoldXiBenchmark: UnsoldXiBenchmark | undefined;
  try {
    const livePlayers = await fetchLivePlayers();
    unsoldXiBenchmark = computeUnsoldXiBenchmark({
      standings,
      roster,
      livePlayers,
    });
    console.info("[score-service] Computed unsold XI benchmark", {
      topXiTotal: unsoldXiBenchmark.topXiTotal,
      gapVsLeader: unsoldXiBenchmark.gapVsLeader,
    });
  } catch (error) {
    console.error("[score-service] Unable to compute unsold XI benchmark", {
      error,
    });
  }

  const result: ScoreComputationResult = {
    snapshot: {
      snapshotAt: progression.generatedAt,
      matchNumber: latestMatch,
      standings,
    },
    teamInsights: buildTeamInsights(standings, { transferImpactByTeam }),
    generatedAt: progression.generatedAt,
    unsoldXiBenchmark,
  };

  setLiveResult(result);
  try {
    await persistScoreComputation(result);
  } catch (error) {
    console.error(
      "[score-service] Persistence failed, serving in-memory only",
      {
        error,
      },
    );
  }
  return result;
}

export function getSnapshots() {
  return getLiveCache().snapshots;
}

async function assertNoUnresolvedRows() {
  const unresolvedPath = path.join(
    process.cwd(),
    "data",
    "unmatched_or_ambiguous.csv",
  );

  try {
    const raw = await fs.readFile(unresolvedPath, "utf-8");
    const rows = raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    // Header-only file means there are no unresolved rows.
    if (rows.length > 1) {
      console.error("[score-service] Blocking scoring due to unresolved rows", {
        unresolvedCount: rows.length - 1,
      });
      throw new Error(
        `Resolve ${rows.length - 1} rows in data/unmatched_or_ambiguous.csv before scoring`,
      );
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    throw error;
  }
}

async function hydrateUnsoldXiBenchmark(
  result: ScoreComputationResult,
  roster: NormalizedRosterEntry[],
) {
  const hasUpgradedUnsoldFields =
    Array.isArray(result.unsoldXiBenchmark?.topPlayers) &&
    result.unsoldXiBenchmark.topPlayers.every(
      (player) =>
        typeof player.boostedPoints === "number" &&
        (player.multiplierRole === "captain" ||
          player.multiplierRole === "viceCaptain" ||
          player.multiplierRole === "normal"),
    );
  if (result.unsoldXiBenchmark && hasUpgradedUnsoldFields) {
    return result;
  }
  try {
    const livePlayers = await fetchLivePlayers();
    const unsoldXiBenchmark = computeUnsoldXiBenchmark({
      standings: result.snapshot.standings,
      roster,
      livePlayers,
    });
    return {
      ...result,
      unsoldXiBenchmark,
    };
  } catch (error) {
    console.error("[score-service] Failed to hydrate unsold XI benchmark", {
      error,
    });
    return result;
  }
}

function computeUnsoldXiBenchmark({
  standings,
  roster,
  livePlayers,
}: {
  standings: TeamStanding[];
  roster: NormalizedRosterEntry[];
  livePlayers: IplLivePlayer[];
}): UnsoldXiBenchmark {
  const ownedPlayerIds = new Set(roster.map((entry) => entry.resolvedPlayerId));
  const unsoldPlayers = livePlayers
    .filter((player) => !ownedPlayerIds.has(player.id))
    .sort((a, b) => b.overallPoints - a.overallPoints);
  const topPlayers = unsoldPlayers.slice(0, 11).map((player, index) => {
    const points = Number(player.overallPoints.toFixed(2));
    const multiplierRole: "captain" | "viceCaptain" | "normal" =
      index === 0 ? "captain" : index === 1 ? "viceCaptain" : "normal";
    const multiplier = multiplierRole === "captain" ? 2 : multiplierRole === "viceCaptain" ? 1.5 : 1;
    const boostedPoints = Number((points * multiplier).toFixed(2));
    return {
      playerId: player.id,
      playerName: player.shortName,
      teamShortName: player.teamShortName,
      points,
      multiplierRole,
      boostedPoints,
    };
  });
  const topXiTotal = Number(
    topPlayers.reduce((sum, player) => sum + player.boostedPoints, 0).toFixed(2),
  );
  const leaderPoints = standings[0]?.totalPoints ?? 0;
  const gapVsLeader = Number((topXiTotal - leaderPoints).toFixed(2));
  return {
    topXiTotal,
    gapVsLeader,
    topPlayers,
  };
}
