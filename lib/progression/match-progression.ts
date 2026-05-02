import { getCaptainWindows, getLeagueTeams, getNormalizedRoster } from "@/lib/data/seed";
import { fetchPlayerPopupCards } from "@/lib/ipl/client";
import { resolveWindowIndex } from "@/lib/scoring/windows";
import type {
  MatchProgressionResult,
  TeamPlayerContribution,
  TeamMatchProgressPoint,
  TeamMatchProgression,
} from "@/lib/types";

const CACHE_TTL_MS = 1000 * 60 * 15;
const globalProgressionCache = globalThis as typeof globalThis & {
  __matchProgressionCache?: { generatedAt: number; value: MatchProgressionResult };
};

function extractMatchNumber(matchName: string): number | null {
  const match = matchName.match(/match\s+(\d+)/i);
  return match ? Number(match[1]) : null;
}

function dedupeByPlayer(records: { resolvedPlayerId: number; resolvedTeamId: number }[]) {
  const map = new Map<string, { playerId: number; teamId: number }>();
  for (const item of records) {
    const key = `${item.resolvedPlayerId}:${item.resolvedTeamId}`;
    if (!map.has(key)) {
      map.set(key, { playerId: item.resolvedPlayerId, teamId: item.resolvedTeamId });
    }
  }
  return [...map.values()];
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

export async function getMatchProgression(forceRefresh = false): Promise<MatchProgressionResult> {
  const now = Date.now();
  const cached = globalProgressionCache.__matchProgressionCache;
  const cacheShapeValid =
    cached?.value?.teams?.every((team) => Array.isArray((team as TeamMatchProgression).windowBonuses)) ??
    false;
  if (!forceRefresh && cached && cacheShapeValid && now - cached.generatedAt < CACHE_TTL_MS) {
    console.info("[match-progression] Returning cached progression", {
      ageMs: now - cached.generatedAt,
    });
    return cached.value;
  }

  const teams = getLeagueTeams();
  const roster = getNormalizedRoster();
  const captainWindows = getCaptainWindows();
  const uniquePlayers = dedupeByPlayer(roster);

  console.info("[match-progression] Building match-wise progression", {
    teamCount: teams.length,
    rosterEntries: roster.length,
    uniquePlayers: uniquePlayers.length,
  });

  const playerMatchMaps = await mapWithConcurrency(uniquePlayers, 12, async (player) => {
    const payload = await fetchPlayerPopupCards(player.teamId, player.playerId);
    const completed = Array.isArray((payload as { Completed?: unknown[] })?.Completed)
      ? ((payload as { Completed?: unknown[] }).Completed as {
          MatchName?: string;
          GameDaypoints?: number;
        }[])
      : [];

    const map = new Map<number, number>();
    for (const entry of completed) {
      const matchNumber = extractMatchNumber(entry.MatchName ?? "");
      if (matchNumber === null) {
        continue;
      }
      map.set(matchNumber, Number(entry.GameDaypoints ?? 0));
    }

    return { playerId: player.playerId, pointsByMatch: map };
  });

  const pointsLookup = new Map<number, Map<number, number>>();
  const allMatches = new Set<number>();
  for (const item of playerMatchMaps) {
    pointsLookup.set(item.playerId, item.pointsByMatch);
    for (const matchNumber of item.pointsByMatch.keys()) {
      allMatches.add(matchNumber);
    }
  }

  const sortedMatches = [...allMatches].sort((a, b) => a - b);
  const progressionByTeam = new Map<string, TeamMatchProgressPoint[]>();
  const cumulativeByTeam = new Map<string, number>();
  const contributorByTeam = new Map<
    string,
    Map<
      number,
      {
        playerId: number;
        playerName: string;
        teamShortName: string;
        basePoints: number;
        boostedPoints: number;
        captainMatches: number;
        viceCaptainMatches: number;
      }
    >
  >();
  const bonusByTeam = new Map<string, { captainBonus: number; viceCaptainBonus: number }>();
  const transferImpactByTeam = new Map<string, number>();
  const incomingWindow2ByTeam = new Map<string, Set<number>>();
  const outgoingWindow2ByTeam = new Map<string, Set<number>>();
  const windowBonusByTeam = new Map<
    string,
    Map<1 | 2 | 3, { captainBonus: number; viceCaptainBonus: number }>
  >();
  teams.forEach((team) => {
    progressionByTeam.set(team.id, []);
    cumulativeByTeam.set(team.id, 0);
    contributorByTeam.set(team.id, new Map());
    bonusByTeam.set(team.id, { captainBonus: 0, viceCaptainBonus: 0 });
    transferImpactByTeam.set(team.id, 0);
    const window1Set = new Set(
      roster
        .filter(
          (entry) =>
            entry.ownerName.toLowerCase() === team.ownerName.toLowerCase() && entry.windowIndex === 1,
        )
        .map((entry) => entry.resolvedPlayerId),
    );
    const window2Set = new Set(
      roster
        .filter(
          (entry) =>
            entry.ownerName.toLowerCase() === team.ownerName.toLowerCase() && entry.windowIndex === 2,
        )
        .map((entry) => entry.resolvedPlayerId),
    );
    const incoming = new Set<number>([...window2Set].filter((playerId) => !window1Set.has(playerId)));
    const outgoing = new Set<number>([...window1Set].filter((playerId) => !window2Set.has(playerId)));
    incomingWindow2ByTeam.set(team.id, incoming);
    outgoingWindow2ByTeam.set(team.id, outgoing);
    windowBonusByTeam.set(
      team.id,
      new Map([
        [1, { captainBonus: 0, viceCaptainBonus: 0 }],
        [2, { captainBonus: 0, viceCaptainBonus: 0 }],
        [3, { captainBonus: 0, viceCaptainBonus: 0 }],
      ]),
    );
  });

  for (const matchNumber of sortedMatches) {
    const totalsForRanking: { teamId: string; cumulative: number }[] = [];

    for (const team of teams) {
      const activeWindow = resolveWindowIndex(matchNumber);
      const rawTeamRoster = roster.filter(
        (entry) =>
          entry.ownerName.toLowerCase() === team.ownerName.toLowerCase() &&
          entry.windowIndex === activeWindow,
      );
      const teamRosterMap = new Map<number, (typeof rawTeamRoster)[number]>();
      for (const player of rawTeamRoster) {
        if (!teamRosterMap.has(player.resolvedPlayerId)) {
          teamRosterMap.set(player.resolvedPlayerId, player);
        }
      }
      const teamRoster = [...teamRosterMap.values()];

      const capWindow = captainWindows.find(
        (window) =>
          window.leagueTeamId === team.id &&
          window.windowIndex === activeWindow,
      );

      let matchPoints = 0;
      for (const player of teamRoster) {
        const basePoints = pointsLookup.get(player.resolvedPlayerId)?.get(matchNumber) ?? 0;
        let multiplier = 1;
        let role: "captain" | "viceCaptain" | "normal" = "normal";
        if (capWindow?.captainPlayerId === player.resolvedPlayerId) {
          multiplier = 2;
          role = "captain";
        } else if (capWindow?.viceCaptainPlayerId === player.resolvedPlayerId) {
          multiplier = 1.5;
          role = "viceCaptain";
        }
        const boosted = basePoints * multiplier;
        const bonus = boosted - basePoints;
        matchPoints += boosted;

        const teamContributors = contributorByTeam.get(team.id)!;
        const existing = teamContributors.get(player.resolvedPlayerId) ?? {
          playerId: player.resolvedPlayerId,
          playerName: player.playerNameNormalized,
          teamShortName: player.iplTeamShortName,
          basePoints: 0,
          boostedPoints: 0,
          captainMatches: 0,
          viceCaptainMatches: 0,
        };
        existing.basePoints = Number((existing.basePoints + basePoints).toFixed(2));
        existing.boostedPoints = Number((existing.boostedPoints + boosted).toFixed(2));
        if (role === "captain") {
          existing.captainMatches += 1;
          bonusByTeam.get(team.id)!.captainBonus = Number(
            (bonusByTeam.get(team.id)!.captainBonus + bonus).toFixed(2),
          );
          const windowBonus = windowBonusByTeam.get(team.id)!.get(activeWindow)!;
          windowBonus.captainBonus = Number((windowBonus.captainBonus + bonus).toFixed(2));
        }
        if (role === "viceCaptain") {
          existing.viceCaptainMatches += 1;
          bonusByTeam.get(team.id)!.viceCaptainBonus = Number(
            (bonusByTeam.get(team.id)!.viceCaptainBonus + bonus).toFixed(2),
          );
          const windowBonus = windowBonusByTeam.get(team.id)!.get(activeWindow)!;
          windowBonus.viceCaptainBonus = Number(
            (windowBonus.viceCaptainBonus + bonus).toFixed(2),
          );
        }
        teamContributors.set(player.resolvedPlayerId, existing);
      }

      if (matchNumber >= 36 && matchNumber <= 70) {
        const incomingSet = incomingWindow2ByTeam.get(team.id)!;
        const outgoingSet = outgoingWindow2ByTeam.get(team.id)!;
        let incomingPoints = 0;
        let outgoingPoints = 0;
        for (const playerId of incomingSet) {
          incomingPoints += pointsLookup.get(playerId)?.get(matchNumber) ?? 0;
        }
        for (const playerId of outgoingSet) {
          outgoingPoints += pointsLookup.get(playerId)?.get(matchNumber) ?? 0;
        }
        transferImpactByTeam.set(
          team.id,
          Number(((transferImpactByTeam.get(team.id) ?? 0) + (incomingPoints - outgoingPoints)).toFixed(2)),
        );
      }

      const previous = cumulativeByTeam.get(team.id) ?? 0;
      const cumulative = Number((previous + matchPoints).toFixed(2));
      cumulativeByTeam.set(team.id, cumulative);
      progressionByTeam.get(team.id)?.push({
        matchNumber,
        points: Number(matchPoints.toFixed(2)),
        cumulativePoints: cumulative,
        rank: 0,
      });
      totalsForRanking.push({ teamId: team.id, cumulative });
    }

    totalsForRanking.sort((a, b) => b.cumulative - a.cumulative);
    totalsForRanking.forEach((row, index) => {
      const series = progressionByTeam.get(row.teamId);
      if (!series || series.length === 0) {
        return;
      }
      series[series.length - 1].rank = index + 1;
    });
  }

  const teamSeries: TeamMatchProgression[] = teams.map((team) => {
    const contributorMap = contributorByTeam.get(team.id)!;
    const contributors: TeamPlayerContribution[] = [...contributorMap.values()]
      .map((item) => {
        const role: "captain" | "viceCaptain" | "normal" =
          item.captainMatches > 0 && item.captainMatches >= item.viceCaptainMatches
            ? "captain"
            : item.viceCaptainMatches > 0
              ? "viceCaptain"
              : "normal";
        const multiplier =
          item.basePoints === 0 ? 1 : Number((item.boostedPoints / item.basePoints).toFixed(3));
        return {
          playerId: item.playerId,
          playerName: item.playerName,
          teamShortName: item.teamShortName,
          overallPoints: item.basePoints,
          multiplier,
          pointsAfterMultiplier: item.boostedPoints,
          role,
          captainMatches: item.captainMatches,
          viceCaptainMatches: item.viceCaptainMatches,
        };
      })
      .sort((a, b) => b.pointsAfterMultiplier - a.pointsAfterMultiplier);

    const bonus = bonusByTeam.get(team.id)!;
    return {
      leagueTeamId: team.id,
      ownerName: team.ownerName,
      displayName: team.displayName,
      series: progressionByTeam.get(team.id) ?? [],
      contributors,
      captainBonus: bonus.captainBonus,
      viceCaptainBonus: bonus.viceCaptainBonus,
      transferImpactScore: Number((transferImpactByTeam.get(team.id) ?? 0).toFixed(2)),
      windowBonuses: [...windowBonusByTeam.get(team.id)!.entries()].map(
        ([windowIndex, values]) => ({
          windowIndex,
          captainBonus: values.captainBonus,
          viceCaptainBonus: values.viceCaptainBonus,
        }),
      ),
    };
  });

  const result: MatchProgressionResult = {
    generatedAt: new Date().toISOString(),
    matches: sortedMatches,
    teams: teamSeries,
  };

  globalProgressionCache.__matchProgressionCache = {
    generatedAt: now,
    value: result,
  };

  console.info("[match-progression] Match progression built", {
    matches: sortedMatches.length,
    teams: teamSeries.length,
  });

  return result;
}
