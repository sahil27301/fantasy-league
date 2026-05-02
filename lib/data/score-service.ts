import { getCaptainWindows, getLeagueTeams, getNormalizedRoster } from "@/lib/data/seed";
import { getMatchProgression } from "@/lib/progression/match-progression";
import { buildTeamInsights } from "@/lib/stats/insights";
import { getLiveCache, setLiveResult } from "@/lib/state/live-cache";
import {
  fetchLatestScoreComputation,
  persistScoreComputation,
} from "@/lib/db/repositories/snapshots";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { ScoreComputationResult, TeamStanding } from "@/lib/types";

export async function getLeagueComputation(forceRefresh = false) {
  const cache = getLiveCache();
  if (!forceRefresh && cache.lastResult) {
    console.info("[score-service] Returning cached score result", {
      generatedAt: cache.lastResult.generatedAt,
    });
    try {
      await persistScoreComputation(cache.lastResult);
    } catch (error) {
      console.error("[score-service] Cached persistence attempt failed", {
        error,
      });
    }
    return cache.lastResult;
  }

  if (!forceRefresh) {
    const persisted = await fetchLatestScoreComputation();
    if (persisted) {
      console.info("[score-service] Returning persisted score result", {
        generatedAt: persisted.generatedAt,
      });
      setLiveResult(persisted);
      return persisted;
    }
  }

  const teams = getLeagueTeams();
  const roster = getNormalizedRoster();
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
      const point = team.series.find((entry) => entry.matchNumber === previousMatch);
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
    progression.teams.map((team) => [team.leagueTeamId, team.transferImpactScore]),
  );

  const result: ScoreComputationResult = {
    snapshot: {
      snapshotAt: progression.generatedAt,
      matchNumber: latestMatch,
      standings,
    },
    teamInsights: buildTeamInsights(standings, { transferImpactByTeam }),
    generatedAt: progression.generatedAt,
  };

  setLiveResult(result);
  try {
    await persistScoreComputation(result);
  } catch (error) {
    console.error("[score-service] Persistence failed, serving in-memory only", {
      error,
    });
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
