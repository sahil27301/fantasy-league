import { getCaptainWindows, getLeagueTeams, getNormalizedRoster } from "@/lib/data/seed";
import { fetchPlayerPopupCards } from "@/lib/ipl/client";
import { resolveWindowIndex } from "@/lib/scoring/windows";
import type {
  MatchAnalysis,
  MatchAnalysisComputationResult,
  MatchFantasyTeamBreakdown,
  MatchFantasyTeamPlayerRow,
  MatchPlayerPerformance,
  MatchTeamPerformance,
  MatchUpcomingInfo,
  NormalizedRosterEntry,
} from "@/lib/types";

const CACHE_TTL_MS = 1000 * 60 * 15;
const globalMatchAnalysisCache = globalThis as typeof globalThis & {
  __matchAnalysisCache?: { generatedAtMs: number; value: MatchAnalysisComputationResult };
};

function extractMatchNumber(matchName: string): number | null {
  const match = matchName.match(/match\s+(\d+)/i);
  return match ? Number(match[1]) : null;
}

function parseUpcomingEntry(entry: unknown): MatchUpcomingInfo | null {
  if (typeof entry !== "object" || entry === null) {
    return null;
  }
  const raw = entry as Record<string, unknown>;
  const matchName =
    (typeof raw.MatchName === "string" && raw.MatchName) ||
    (typeof raw.Name === "string" && raw.Name) ||
    null;
  if (!matchName) {
    return null;
  }
  const rawDate =
    (typeof raw.MatchDateTime === "string" && raw.MatchDateTime) ||
    (typeof raw.MatchDate === "string" && raw.MatchDate) ||
    (typeof raw.StartDate === "string" && raw.StartDate) ||
    null;

  const homeTeamShortName =
    typeof raw.HomeTeamShortName === "string" ? raw.HomeTeamShortName : null;
  const awayTeamShortName =
    typeof raw.AwayTeamShortName === "string" ? raw.AwayTeamShortName : null;

  return {
    matchName,
    matchNumber: extractMatchNumber(matchName),
    matchDateIso: rawDate,
    homeTeamShortName,
    awayTeamShortName,
  };
}

function normalizeTeamShortName(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase();
}

function parseMatchDateTimeMs(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const slashDateMatch =
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (slashDateMatch) {
    const month = Number(slashDateMatch[1]);
    const day = Number(slashDateMatch[2]);
    const year = Number(slashDateMatch[3]);
    const hour = Number(slashDateMatch[4]);
    const minute = Number(slashDateMatch[5]);
    const second = Number(slashDateMatch[6] ?? "0");
    return Date.UTC(year, month - 1, day, hour, minute, second);
  }
  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
) {
  const results: R[] = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await mapper(items[current]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

function buildRosterByTeamWindow() {
  const teams = getLeagueTeams();
  const roster = getNormalizedRoster();
  const byTeamWindow = new Map<string, Map<1 | 2 | 3, Map<number, NormalizedRosterEntry>>>();

  for (const team of teams) {
    byTeamWindow.set(
      team.id,
      new Map([
        [1, new Map()],
        [2, new Map()],
        [3, new Map()],
      ]),
    );
  }

  for (const entry of roster) {
    const team = teams.find(
      (candidate) => candidate.ownerName.toLowerCase() === entry.ownerName.toLowerCase(),
    );
    if (!team) {
      continue;
    }
    const windowMap = byTeamWindow.get(team.id)?.get(entry.windowIndex);
    if (!windowMap) {
      continue;
    }
    if (!windowMap.has(entry.resolvedPlayerId)) {
      windowMap.set(entry.resolvedPlayerId, entry);
    }
  }

  return { teams, rosterByTeamWindow: byTeamWindow };
}

function getEffectiveRosterWindowForTeam(
  teamWindowMap: Map<1 | 2 | 3, Map<number, NormalizedRosterEntry>> | undefined,
  activeWindow: 1 | 2 | 3,
) {
  const candidateWindows: (1 | 2 | 3)[] =
    activeWindow === 3 ? [3, 2, 1] : activeWindow === 2 ? [2, 1] : [1];
  for (const candidateWindow of candidateWindows) {
    const rosterForWindow = teamWindowMap?.get(candidateWindow);
    if (rosterForWindow && rosterForWindow.size > 0) {
      return {
        rosterWindowUsed: candidateWindow,
        entries: [...rosterForWindow.values()],
      };
    }
  }
  return {
    rosterWindowUsed: activeWindow,
    entries: [] as NormalizedRosterEntry[],
  };
}

function buildUpcomingPreview(
  matchNumber: number,
  rosterByTeamWindow: Map<string, Map<1 | 2 | 3, Map<number, NormalizedRosterEntry>>>,
  playingIplTeams: string[],
) {
  const teams = getLeagueTeams();
  const captainWindows = getCaptainWindows();
  const activeWindow = resolveWindowIndex(matchNumber);
  const playingTeamSet = new Set(
    playingIplTeams.map((team) => normalizeTeamShortName(team)).filter(Boolean),
  );
  const rosterWindowFallbacks: {
    leagueTeamId: string;
    activeWindow: 1 | 2 | 3;
    usedWindow: 1 | 2 | 3;
  }[] = [];
  const fantasyTeamBreakdowns: MatchFantasyTeamBreakdown[] = teams.map((team) => {
    const { entries: effectiveRosterWindow, rosterWindowUsed } = getEffectiveRosterWindowForTeam(
      rosterByTeamWindow.get(team.id),
      activeWindow,
    );
    if (rosterWindowUsed !== activeWindow) {
      rosterWindowFallbacks.push({
        leagueTeamId: team.id,
        activeWindow,
        usedWindow: rosterWindowUsed,
      });
    }
    const rosterWindow =
      playingTeamSet.size === 0
        ? effectiveRosterWindow
        : effectiveRosterWindow.filter((player) =>
            playingTeamSet.has(normalizeTeamShortName(player.iplTeamShortName)),
          );
    const captainWindow = captainWindows.find(
      (window) =>
        window.leagueTeamId === team.id && window.windowIndex === activeWindow,
    );
    const players: MatchFantasyTeamPlayerRow[] = rosterWindow.map((player) => ({
      playerId: player.resolvedPlayerId,
      playerName: player.playerNameNormalized,
      iplTeamShortName: player.iplTeamShortName,
      fantasyTeamName: team.displayName,
      points: null,
      isCaptain: captainWindow?.captainPlayerId === player.resolvedPlayerId,
      isViceCaptain: captainWindow?.viceCaptainPlayerId === player.resolvedPlayerId,
    }));

    return {
      leagueTeamId: team.id,
      displayName: team.displayName,
      ownerName: team.ownerName,
      totalPoints: null,
      basePoints: null,
      captainBonus: null,
      viceCaptainBonus: null,
      players,
    };
  });
  if (rosterWindowFallbacks.length > 0) {
    console.info("[match-analysis] Upcoming preview roster window fallback applied", {
      matchNumber,
      activeWindow,
      rosterWindowFallbacks,
    });
  }

  return {
    matchNumber,
    activeWindow,
    playingIplTeams: [...playingTeamSet],
    teamPerformances: [],
    playerPerformances: [],
    fantasyTeamBreakdowns,
  } as MatchAnalysis;
}

export async function getMatchAnalysisComputation(
  forceRefresh = false,
): Promise<MatchAnalysisComputationResult> {
  const now = Date.now();
  const cached = globalMatchAnalysisCache.__matchAnalysisCache;
  const cacheShapeValid = Boolean(
    cached?.value?.analysesByMatch &&
      Object.values(cached.value.analysesByMatch).every(
        (analysis) =>
          Array.isArray(analysis.fantasyTeamBreakdowns) &&
          Array.isArray(analysis.playingIplTeams),
      ),
  );
  if (!forceRefresh && cached && cacheShapeValid && now - cached.generatedAtMs < CACHE_TTL_MS) {
    console.info("[match-analysis] Returning cached match analysis", {
      ageMs: now - cached.generatedAtMs,
      completedMatches: cached.value.completedMatches.length,
    });
    return cached.value;
  }
  if (!forceRefresh && cached && !cacheShapeValid) {
    console.info("[match-analysis] Ignoring stale cache due to shape mismatch");
  }

  const { teams, rosterByTeamWindow } = buildRosterByTeamWindow();
  const captainWindows = getCaptainWindows();
  const uniquePlayerMap = new Map<number, { playerId: number; teamId: number }>();
  for (const windowMap of rosterByTeamWindow.values()) {
    for (const players of windowMap.values()) {
      for (const player of players.values()) {
        if (!uniquePlayerMap.has(player.resolvedPlayerId)) {
          uniquePlayerMap.set(player.resolvedPlayerId, {
            playerId: player.resolvedPlayerId,
            teamId: player.resolvedTeamId,
          });
        }
      }
    }
  }
  const uniquePlayers = [...uniquePlayerMap.values()];

  console.info("[match-analysis] Starting full match analysis computation", {
    teamCount: teams.length,
    uniquePlayers: uniquePlayers.length,
  });

  const popupResults = await mapWithConcurrency(uniquePlayers, 12, async (player) => {
    const payload = await fetchPlayerPopupCards(player.teamId, player.playerId);
    const completed = Array.isArray((payload as { Completed?: unknown[] })?.Completed)
      ? ((payload as { Completed?: unknown[] }).Completed as {
          MatchName?: string;
          GameDaypoints?: number;
        }[])
      : [];
    const upcoming = Array.isArray((payload as { Upcoming?: unknown[] })?.Upcoming)
      ? ((payload as { Upcoming?: unknown[] }).Upcoming ?? [])
      : [];
    const pointsByMatch = new Map<number, number>();
    const completedMeta: {
      matchNumber: number;
      homeTeamShortName: string | null;
      awayTeamShortName: string | null;
    }[] = [];
    for (const row of completed) {
      const matchNumber = extractMatchNumber(row.MatchName ?? "");
      if (matchNumber === null) {
        continue;
      }
      pointsByMatch.set(matchNumber, Number(row.GameDaypoints ?? 0));
      const typedRow = row as {
        HomeTeamShortName?: string;
        AwayTeamShortName?: string;
      };
      completedMeta.push({
        matchNumber,
        homeTeamShortName:
          typeof typedRow.HomeTeamShortName === "string"
            ? typedRow.HomeTeamShortName
            : null,
        awayTeamShortName:
          typeof typedRow.AwayTeamShortName === "string"
            ? typedRow.AwayTeamShortName
            : null,
      });
    }

    return {
      playerId: player.playerId,
      pointsByMatch,
      upcoming,
      completedMeta,
    };
  });

  const playerPointsLookup = new Map<number, Map<number, number>>();
  const completedMatchSet = new Set<number>();
  const upcomingByName = new Map<string, MatchUpcomingInfo>();
  const matchIplTeamsByNumber = new Map<number, Set<string>>();
  for (const result of popupResults) {
    playerPointsLookup.set(result.playerId, result.pointsByMatch);
    for (const matchNumber of result.pointsByMatch.keys()) {
      completedMatchSet.add(matchNumber);
    }
    for (const upcoming of result.upcoming) {
      const parsed = parseUpcomingEntry(upcoming);
      if (!parsed) {
        continue;
      }
      if (!upcomingByName.has(parsed.matchName)) {
        upcomingByName.set(parsed.matchName, parsed);
      }
      if (parsed.matchNumber !== null) {
        const set = matchIplTeamsByNumber.get(parsed.matchNumber) ?? new Set<string>();
        if (parsed.homeTeamShortName) {
          set.add(normalizeTeamShortName(parsed.homeTeamShortName));
        }
        if (parsed.awayTeamShortName) {
          set.add(normalizeTeamShortName(parsed.awayTeamShortName));
        }
        matchIplTeamsByNumber.set(parsed.matchNumber, set);
      }
    }
    for (const meta of result.completedMeta) {
      const set = matchIplTeamsByNumber.get(meta.matchNumber) ?? new Set<string>();
      if (meta.homeTeamShortName) {
        set.add(normalizeTeamShortName(meta.homeTeamShortName));
      }
      if (meta.awayTeamShortName) {
        set.add(normalizeTeamShortName(meta.awayTeamShortName));
      }
      matchIplTeamsByNumber.set(meta.matchNumber, set);
    }
  }

  const completedMatches = [...completedMatchSet].sort((a, b) => a - b);
  const maxCompletedMatch = completedMatches.at(-1) ?? 0;
  const upcomingMatches = [...upcomingByName.values()]
    .filter(
      (entry) => entry.matchNumber === null || entry.matchNumber > maxCompletedMatch,
    )
    .sort((a, b) => {
      const aDateMs = parseMatchDateTimeMs(a.matchDateIso);
      const bDateMs = parseMatchDateTimeMs(b.matchDateIso);
      if (aDateMs !== null && bDateMs !== null && aDateMs !== bDateMs) {
        return aDateMs - bDateMs;
      }
      if (aDateMs !== null && bDateMs === null) {
        return -1;
      }
      if (aDateMs === null && bDateMs !== null) {
        return 1;
      }
      if (a.matchNumber === null && b.matchNumber === null) {
        return a.matchName.localeCompare(b.matchName);
      }
      if (a.matchNumber === null) {
        return 1;
      }
      if (b.matchNumber === null) {
        return -1;
      }
      return a.matchNumber - b.matchNumber;
    });

  const analysesByMatch: Record<number, MatchAnalysis> = {};
  const completedRosterWindowFallbacks: {
    matchNumber: number;
    leagueTeamId: string;
    activeWindow: 1 | 2 | 3;
    usedWindow: 1 | 2 | 3;
  }[] = [];

  for (const matchNumber of completedMatches) {
    const activeWindow = resolveWindowIndex(matchNumber);
    const playingTeamSet = matchIplTeamsByNumber.get(matchNumber) ?? new Set<string>();
    const teamPerformances: MatchTeamPerformance[] = [];
    const playerAggregate = new Map<number, MatchPlayerPerformance>();
    const fantasyTeamBreakdowns: MatchFantasyTeamBreakdown[] = [];

    for (const team of teams) {
      const { entries: effectiveRosterWindow, rosterWindowUsed } = getEffectiveRosterWindowForTeam(
        rosterByTeamWindow.get(team.id),
        activeWindow,
      );
      if (rosterWindowUsed !== activeWindow) {
        completedRosterWindowFallbacks.push({
          matchNumber,
          leagueTeamId: team.id,
          activeWindow,
          usedWindow: rosterWindowUsed,
        });
      }
      const rosterWindow =
        playingTeamSet.size === 0
          ? effectiveRosterWindow
          : effectiveRosterWindow.filter((player) =>
              playingTeamSet.has(normalizeTeamShortName(player.iplTeamShortName)),
            );
      const captainWindow = captainWindows.find(
        (window) =>
          window.leagueTeamId === team.id && window.windowIndex === activeWindow,
      );
      let basePoints = 0;
      let captainBonus = 0;
      let viceCaptainBonus = 0;
      const players: MatchFantasyTeamPlayerRow[] = [];

      for (const player of rosterWindow) {
        const playerMatchPoints =
          playerPointsLookup.get(player.resolvedPlayerId)?.get(matchNumber) ?? 0;
        basePoints += playerMatchPoints;
        if (captainWindow?.captainPlayerId === player.resolvedPlayerId) {
          captainBonus += playerMatchPoints;
        } else if (captainWindow?.viceCaptainPlayerId === player.resolvedPlayerId) {
          viceCaptainBonus += playerMatchPoints * 0.5;
        }
        players.push({
          playerId: player.resolvedPlayerId,
          playerName: player.playerNameNormalized,
          iplTeamShortName: player.iplTeamShortName,
          fantasyTeamName: team.displayName,
          points: Number(playerMatchPoints.toFixed(2)),
          isCaptain: captainWindow?.captainPlayerId === player.resolvedPlayerId,
          isViceCaptain: captainWindow?.viceCaptainPlayerId === player.resolvedPlayerId,
        });

        const existing = playerAggregate.get(player.resolvedPlayerId) ?? {
          playerId: player.resolvedPlayerId,
          playerName: player.playerNameNormalized,
          teamShortName: player.iplTeamShortName,
          points: Number(playerMatchPoints.toFixed(2)),
          fantasyTeams: [],
          captainedBy: [],
          viceCaptainedBy: [],
        };
        if (!existing.fantasyTeams.includes(team.displayName)) {
          existing.fantasyTeams.push(team.displayName);
        }
        if (
          captainWindow?.captainPlayerId === player.resolvedPlayerId &&
          !existing.captainedBy.includes(team.displayName)
        ) {
          existing.captainedBy.push(team.displayName);
        }
        if (
          captainWindow?.viceCaptainPlayerId === player.resolvedPlayerId &&
          !existing.viceCaptainedBy.includes(team.displayName)
        ) {
          existing.viceCaptainedBy.push(team.displayName);
        }
        playerAggregate.set(player.resolvedPlayerId, existing);
      }

      const totalPoints = basePoints + captainBonus + viceCaptainBonus;
      teamPerformances.push({
        leagueTeamId: team.id,
        ownerName: team.ownerName,
        displayName: team.displayName,
        basePoints: Number(basePoints.toFixed(2)),
        captainBonus: Number(captainBonus.toFixed(2)),
        viceCaptainBonus: Number(viceCaptainBonus.toFixed(2)),
        totalPoints: Number(totalPoints.toFixed(2)),
        captainPlayerId: captainWindow?.captainPlayerId ?? null,
        viceCaptainPlayerId: captainWindow?.viceCaptainPlayerId ?? null,
      });
      fantasyTeamBreakdowns.push({
        leagueTeamId: team.id,
        ownerName: team.ownerName,
        displayName: team.displayName,
        basePoints: Number(basePoints.toFixed(2)),
        captainBonus: Number(captainBonus.toFixed(2)),
        viceCaptainBonus: Number(viceCaptainBonus.toFixed(2)),
        totalPoints: Number(totalPoints.toFixed(2)),
        players: players.sort((a, b) => (b.points ?? 0) - (a.points ?? 0)),
      });
    }

    teamPerformances.sort((a, b) => b.totalPoints - a.totalPoints);
    const playerPerformances = [...playerAggregate.values()].sort(
      (a, b) => b.points - a.points,
    );

    analysesByMatch[matchNumber] = {
      matchNumber,
      activeWindow,
      playingIplTeams: [...playingTeamSet],
      teamPerformances,
      playerPerformances,
      fantasyTeamBreakdowns,
    };
  }
  if (completedRosterWindowFallbacks.length > 0) {
    console.info("[match-analysis] Completed-match roster window fallback applied", {
      fallbackCount: completedRosterWindowFallbacks.length,
      sample: completedRosterWindowFallbacks.slice(0, 12),
    });
  }

  const result: MatchAnalysisComputationResult = {
    generatedAt: new Date().toISOString(),
    completedMatches,
    upcomingMatches,
    analysesByMatch,
  };

  globalMatchAnalysisCache.__matchAnalysisCache = {
    generatedAtMs: now,
    value: result,
  };

  console.info("[match-analysis] Match analysis computation complete", {
    completedMatches: completedMatches.length,
    upcomingMatches: upcomingMatches.length,
    sampleUpcoming: upcomingMatches
      .slice(0, 3)
      .map((entry) => `${entry.matchName} @ ${entry.matchDateIso ?? "unknown"}`),
  });

  return result;
}

export async function getUpcomingMatchPreview(forceRefresh = false) {
  const result = await getMatchAnalysisComputation(forceRefresh);
  const latestUpcoming = result.upcomingMatches[0] ?? null;
  if (!latestUpcoming) {
    return null;
  }
  const inferredMatchNumber =
    latestUpcoming.matchNumber ?? (result.completedMatches.at(-1) ?? 0) + 1;
  console.info("[match-analysis] Upcoming match selected", {
    selectedMatchName: latestUpcoming.matchName,
    selectedMatchNumber: latestUpcoming.matchNumber,
    selectedMatchDateIso: latestUpcoming.matchDateIso,
    inferredMatchNumber,
  });
  const { rosterByTeamWindow } = buildRosterByTeamWindow();
  const playingIplTeams = [
    latestUpcoming.homeTeamShortName,
    latestUpcoming.awayTeamShortName,
  ];
  const preview = buildUpcomingPreview(
    inferredMatchNumber,
    rosterByTeamWindow,
    playingIplTeams.filter((team): team is string => Boolean(team)),
  );
  return {
    generatedAt: result.generatedAt,
    upcoming: latestUpcoming,
    preview,
  };
}
