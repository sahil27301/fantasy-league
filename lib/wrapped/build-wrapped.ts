import type {
  MatchAnalysisComputationResult,
  MatchFantasyTeamBreakdown,
  ScoreComputationResult,
  TeamMatchProgression,
} from "@/lib/types";
import type {
  WrappedCaptaincyBreakdown,
  TeamWrappedPayload,
  WrappedBestMatchBreakdown,
  WrappedGlobalStat,
  WrappedLeagueBestPlayersBreakdown,
  WrappedStatComparison,
  WrappedTopPerformersBreakdown,
  WrappedValueUnit,
  WrappedVolatilityDetails,
} from "@/lib/wrapped/types";

interface TeamDerivedMetrics {
  leagueTeamId: string;
  displayName: string;
  ownerName: string;
  totalPoints: number;
  captainImpact: number;
  captainBonus: number;
  viceCaptainBonus: number;
  captainEfficiency: number;
  switchImpact: number;
  concentrationIndex: number;
  depthScore: number;
  secondHalfSurge: number;
  volatility: number;
  bestContributorPoints: number;
  volatilityPeak: {
    matchNumber: number;
    points: number;
    oldRank: number;
    newRank: number;
    rankSwing: number;
  } | null;
  consistencyIndex: number;
  ceilingBreaker: number;
  recoveryArtist: number;
  bestMatchPoints: number;
  bestMatchNumber: number | null;
  worstMatchNumber: number | null;
  captaincyPlayers: {
    windowIndex: 1 | 2 | 3;
    role: "captain" | "viceCaptain";
    playerName: string;
    bonusPoints: number;
  }[];
  topPerformers: {
    playerId: number;
    playerName: string;
    teamShortName: string;
    role: "captain" | "viceCaptain" | "normal";
    totalPoints: number;
  }[];
  bestPerformer: {
    playerId: number;
    playerName: string;
    teamShortName: string;
    role: "captain" | "viceCaptain" | "normal";
    totalPoints: number;
  } | null;
  worstMatchPoints: number;
  midpointRank: number | null;
  finalRank: number;
}

interface GlobalMetricDefinition {
  id: string;
  title: string;
  description: string;
  unit: WrappedValueUnit;
  higherIsBetter: boolean;
}

function toFixedNumber(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

function getLatestCumulativePoints(team: TeamMatchProgression) {
  return team.series.at(-1)?.cumulativePoints ?? 0;
}

function computeConcentrationMetrics(team: TeamMatchProgression, totalPoints: number) {
  const contributors = team.contributors.filter((item) => item.pointsAfterMultiplier > 0);
  if (contributors.length <= 1 || totalPoints <= 0) {
    return {
      rawIndex: 1,
      stretchedIndex: 1,
    };
  }

  const hhi = contributors.reduce((acc, item) => {
    const share = item.pointsAfterMultiplier / totalPoints;
    return acc + share * share;
  }, 0);
  const n = contributors.length;
  const normalized = (hhi - 1 / n) / (1 - 1 / n);
  const rawIndex = Math.max(0, Math.min(1, normalized));
  // Stretch low-end values so concentration/depth metrics are less clustered.
  const stretchedIndex = Math.sqrt(rawIndex);
  return {
    rawIndex: toFixedNumber(rawIndex, 4),
    stretchedIndex: toFixedNumber(stretchedIndex, 4),
  };
}

function computeSecondHalfSurge(team: TeamMatchProgression) {
  if (team.series.length === 0) {
    return { surge: 0, midpointRank: null, finalRank: 0 };
  }
  const midpointIndex = Math.floor(team.series.length / 2);
  const midpointRank = team.series[midpointIndex]?.rank ?? null;
  const finalRank = team.series.at(-1)?.rank ?? 0;
  if (midpointRank === null) {
    return { surge: 0, midpointRank: null, finalRank };
  }
  return {
    surge: midpointRank - finalRank,
    midpointRank,
    finalRank,
  };
}

function computeVolatilityPeak(team: TeamMatchProgression) {
  let detail: TeamDerivedMetrics["volatilityPeak"] = null;
  for (let index = 1; index < team.series.length; index += 1) {
    const current = team.series[index];
    const previous = team.series[index - 1];
    const rankSwing = Math.abs(current.rank - previous.rank);
    if (!detail || rankSwing > detail.rankSwing) {
      detail = {
        matchNumber: current.matchNumber,
        points: current.points,
        oldRank: previous.rank,
        newRank: current.rank,
        rankSwing,
      };
    }
  }
  return {
    maxSwing: detail?.rankSwing ?? 0,
    detail,
  };
}

function computeConsistencyIndex(team: TeamMatchProgression) {
  if (team.series.length <= 1) {
    return 0;
  }
  const points = team.series.map((entry) => entry.points);
  const mean = points.reduce((acc, value) => acc + value, 0) / points.length;
  const variance = points.reduce((acc, value) => acc + (value - mean) ** 2, 0) / points.length;
  return toFixedNumber(Math.sqrt(variance), 2);
}

function computeRecoveryArtist(team: TeamMatchProgression) {
  if (team.series.length < 3) {
    return 0;
  }
  let worstIndex = 0;
  for (let index = 1; index < team.series.length; index += 1) {
    if (team.series[index].points < team.series[worstIndex].points) {
      worstIndex = index;
    }
  }

  const worstPoints = team.series[worstIndex].points;
  const postWindow = team.series.slice(worstIndex + 1, worstIndex + 4);
  if (postWindow.length === 0) {
    return 0;
  }
  const postAverage =
    postWindow.reduce((acc, entry) => acc + entry.points, 0) / postWindow.length;
  return toFixedNumber(postAverage - worstPoints, 2);
}

function buildComparison({
  metricId,
  metricTitle,
  description,
  unit,
  values,
  targetTeamId,
  higherIsBetter,
  matchAnalysis,
  leagueBestPlayersBreakdown,
}: {
  metricId: string;
  metricTitle: string;
  description: string;
  unit: WrappedValueUnit;
  values: TeamDerivedMetrics[];
  targetTeamId: string;
  higherIsBetter: boolean;
  matchAnalysis?: MatchAnalysisComputationResult;
  leagueBestPlayersBreakdown?: WrappedLeagueBestPlayersBreakdown;
}): WrappedGlobalStat {
  const ranked = [...values].sort((left, right) => {
    const rawDelta = higherIsBetter
      ? rightMetric(right, metricId) - rightMetric(left, metricId)
      : rightMetric(left, metricId) - rightMetric(right, metricId);
    if (Math.abs(rawDelta) > 0.0001) {
      return rawDelta;
    }
    return left.displayName.localeCompare(right.displayName);
  });
  const winner = ranked[0];
  const targetIndex = ranked.findIndex((team) => team.leagueTeamId === targetTeamId);
  const target = targetIndex >= 0 ? ranked[targetIndex] : winner;
  const winnerValue = rightMetric(winner, metricId);
  const yourValue = rightMetric(target, metricId);
  const gapToWinner = higherIsBetter ? winnerValue - yourValue : yourValue - winnerValue;
  const comparison: WrappedStatComparison = {
    winnerTeamId: winner.leagueTeamId,
    winnerTeamName: winner.displayName,
    winnerValue: toFixedNumber(winnerValue, unit === "percent" ? 2 : 1),
    yourValue: toFixedNumber(yourValue, unit === "percent" ? 2 : 1),
    yourRank: targetIndex + 1,
    totalTeams: ranked.length,
    gapToWinner: toFixedNumber(gapToWinner, unit === "percent" ? 2 : 1),
  };
  const volatilityDetails =
    metricId === "volatility-king"
      ? buildVolatilityDetails({
          winner,
          target,
          matchAnalysis,
        })
      : undefined;
  return {
    id: metricId,
    title: metricTitle,
    description,
    unit,
    comparison,
    volatilityDetails,
    leagueBestPlayersBreakdown:
      metricId === "overall-best-player" ? leagueBestPlayersBreakdown : undefined,
  };
}

function rightMetric(team: TeamDerivedMetrics, metricId: string) {
  switch (metricId) {
    case "overall-best-player":
      return team.bestContributorPoints;
    case "captaincy-king":
      return team.captainImpact;
    case "captaincy-efficiency":
      return team.captainEfficiency;
    case "switch-master":
      return team.switchImpact;
    case "concentration-king":
      return team.concentrationIndex * 100;
    case "depth-king":
      return team.depthScore * 100;
    case "volatility-king":
      return team.volatility;
    case "consistency-king":
      return team.consistencyIndex;
    case "ceiling-breaker":
      return team.ceilingBreaker;
    case "recovery-artist":
      return team.recoveryArtist;
    default:
      return 0;
  }
}

function formatStatValue(value: number, unit: WrappedValueUnit) {
  if (unit === "percent") {
    return `${value.toFixed(2)}%`;
  }
  if (unit === "rank") {
    return `${Math.round(value)}`;
  }
  if (unit === "delta") {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
  }
  return `${value.toFixed(1)}`;
}

function formatMatchupLabel(playingIplTeams: string[], matchNumber: number) {
  const teams = [
    ...new Set(playingIplTeams.map((team) => team.trim()).filter((team) => team.length > 0)),
  ];
  if (teams.length >= 2) {
    return `${teams[0]} vs ${teams[1]}`;
  }
  if (teams.length === 1) {
    return `${teams[0]} fixture`;
  }
  return `Match #${matchNumber}`;
}

function getVolatilityMatchupLabel(matchNumber: number, matchAnalysis?: MatchAnalysisComputationResult) {
  const matchContext = matchAnalysis?.analysesByMatch?.[matchNumber];
  if (!matchContext) {
    return `Match #${matchNumber}`;
  }
  return formatMatchupLabel(matchContext.playingIplTeams, matchNumber);
}

function buildVolatilityDetails({
  winner,
  target,
  matchAnalysis,
}: {
  winner: TeamDerivedMetrics;
  target: TeamDerivedMetrics;
  matchAnalysis?: MatchAnalysisComputationResult;
}): WrappedVolatilityDetails | undefined {
  if (!winner.volatilityPeak || !target.volatilityPeak) {
    console.info("[wrapped] Volatility details unavailable", {
      winnerTeamId: winner.leagueTeamId,
      targetTeamId: target.leagueTeamId,
      hasWinnerPeak: Boolean(winner.volatilityPeak),
      hasTargetPeak: Boolean(target.volatilityPeak),
    });
    return undefined;
  }

  const details: WrappedVolatilityDetails = {
    winner: {
      matchNumber: winner.volatilityPeak.matchNumber,
      matchupLabel: getVolatilityMatchupLabel(winner.volatilityPeak.matchNumber, matchAnalysis),
      points: toFixedNumber(winner.volatilityPeak.points, 1),
      oldRank: winner.volatilityPeak.oldRank,
      newRank: winner.volatilityPeak.newRank,
      rankSwing: winner.volatilityPeak.rankSwing,
    },
    you: {
      matchNumber: target.volatilityPeak.matchNumber,
      matchupLabel: getVolatilityMatchupLabel(target.volatilityPeak.matchNumber, matchAnalysis),
      points: toFixedNumber(target.volatilityPeak.points, 1),
      oldRank: target.volatilityPeak.oldRank,
      newRank: target.volatilityPeak.newRank,
      rankSwing: target.volatilityPeak.rankSwing,
    },
  };

  console.info("[wrapped] Volatility details built", {
    winnerTeamId: winner.leagueTeamId,
    winnerMatchNumber: details.winner.matchNumber,
    winnerRankSwing: details.winner.rankSwing,
    targetTeamId: target.leagueTeamId,
    targetMatchNumber: details.you.matchNumber,
    targetRankSwing: details.you.rankSwing,
  });

  return details;
}

function buildMatchBreakdown({
  targetTeamId,
  matchNumber,
  expectedMatchPoints,
  matchAnalysis,
  contextLabel,
}: {
  targetTeamId: string;
  matchNumber: number | null;
  expectedMatchPoints: number;
  matchAnalysis?: MatchAnalysisComputationResult;
  contextLabel: "best" | "worst";
}): WrappedBestMatchBreakdown | null {
  if (matchNumber === null) {
    console.info("[wrapped] Match breakdown skipped: match number unavailable", {
      targetTeamId,
      contextLabel,
    });
    return null;
  }

  const match = matchAnalysis?.analysesByMatch?.[matchNumber];
  if (!match) {
    console.info("[wrapped] Match breakdown skipped: match analysis unavailable", {
      targetTeamId,
      matchNumber,
      contextLabel,
      hasMatchAnalysis: Boolean(matchAnalysis),
    });
    return null;
  }

  const teamBreakdown = match.fantasyTeamBreakdowns.find(
    (team) => team.leagueTeamId === targetTeamId,
  );
  if (!teamBreakdown) {
    console.info("[wrapped] Match breakdown skipped: team breakdown missing", {
      targetTeamId,
      matchNumber,
      contextLabel,
      availableTeams: match.fantasyTeamBreakdowns.map((team) => team.leagueTeamId),
    });
    return null;
  }

  const normalized = normalizeBreakdownPoints(teamBreakdown);
  if (!normalized) {
    console.info("[wrapped] Match breakdown skipped: points unavailable", {
      targetTeamId,
      matchNumber,
      contextLabel,
      teamBreakdownSummary: {
        totalPoints: teamBreakdown.totalPoints,
        basePoints: teamBreakdown.basePoints,
        captainBonus: teamBreakdown.captainBonus,
        viceCaptainBonus: teamBreakdown.viceCaptainBonus,
      },
    });
    return null;
  }

  const totalDelta = Math.abs(normalized.totalPoints - expectedMatchPoints);
  if (totalDelta > 0.1) {
    console.info("[wrapped] Match points mismatch between progression and analysis", {
      targetTeamId,
      matchNumber,
      contextLabel,
      expectedMatchPoints: toFixedNumber(expectedMatchPoints, 2),
      analysisTotalPoints: normalized.totalPoints,
      delta: toFixedNumber(totalDelta, 2),
    });
  }

  console.info("[wrapped] Match breakdown built", {
    targetTeamId,
    contextLabel,
    matchNumber,
    matchupLabel: formatMatchupLabel(match.playingIplTeams, matchNumber),
    playerCount: normalized.players.length,
    basePoints: normalized.basePoints,
    captainBonus: normalized.captainBonus,
    viceCaptainBonus: normalized.viceCaptainBonus,
    totalPoints: normalized.totalPoints,
  });

  return {
    matchNumber,
    matchupLabel: formatMatchupLabel(match.playingIplTeams, matchNumber),
    basePoints: normalized.basePoints,
    captainBonus: normalized.captainBonus,
    viceCaptainBonus: normalized.viceCaptainBonus,
    totalPoints: normalized.totalPoints,
    players: normalized.players,
  };
}

function normalizeBreakdownPoints(teamBreakdown: MatchFantasyTeamBreakdown) {
  if (
    teamBreakdown.totalPoints === null ||
    teamBreakdown.basePoints === null ||
    teamBreakdown.captainBonus === null ||
    teamBreakdown.viceCaptainBonus === null
  ) {
    return null;
  }

  return {
    totalPoints: toFixedNumber(teamBreakdown.totalPoints, 2),
    basePoints: toFixedNumber(teamBreakdown.basePoints, 2),
    captainBonus: toFixedNumber(teamBreakdown.captainBonus, 2),
    viceCaptainBonus: toFixedNumber(teamBreakdown.viceCaptainBonus, 2),
    players: teamBreakdown.players
      .map((player) => ({
        playerId: player.playerId,
        playerName: player.playerName,
        iplTeamShortName: player.iplTeamShortName,
        points: toFixedNumber(player.points ?? 0, 2),
        isCaptain: player.isCaptain,
        isViceCaptain: player.isViceCaptain,
      }))
      .sort((left, right) => right.points - left.points),
  };
}

function buildCaptaincyBreakdown(targetTeam: TeamDerivedMetrics): WrappedCaptaincyBreakdown | null {
  if (targetTeam.captaincyPlayers.length === 0) {
    console.info("[wrapped] Captaincy breakdown skipped: no captaincy players", {
      teamId: targetTeam.leagueTeamId,
    });
    return null;
  }

  const players = [...targetTeam.captaincyPlayers]
    .sort((left, right) => {
      if (left.windowIndex !== right.windowIndex) {
        return left.windowIndex - right.windowIndex;
      }
      if (left.role === right.role) {
        return left.playerName.localeCompare(right.playerName);
      }
      return left.role === "captain" ? -1 : 1;
    })
    .map((entry) => ({
      windowIndex: entry.windowIndex,
      role: entry.role,
      playerName: entry.playerName,
      bonusPoints: toFixedNumber(entry.bonusPoints, 2),
    }));

  const captainBonus = toFixedNumber(targetTeam.captainBonus, 2);
  const viceCaptainBonus = toFixedNumber(targetTeam.viceCaptainBonus, 2);
  const totalBonus = toFixedNumber(targetTeam.captainImpact, 2);

  console.info("[wrapped] Captaincy breakdown built", {
    teamId: targetTeam.leagueTeamId,
    players: players.map((entry) => ({
      windowIndex: entry.windowIndex,
      role: entry.role,
      playerName: entry.playerName,
      bonusPoints: entry.bonusPoints,
    })),
    captainBonus,
    viceCaptainBonus,
    totalBonus,
  });

  return {
    captainBonus,
    viceCaptainBonus,
    totalBonus,
    players,
  };
}

function buildTopPerformersBreakdown(
  targetTeam: TeamDerivedMetrics,
): WrappedTopPerformersBreakdown | null {
  if (targetTeam.topPerformers.length === 0) {
    console.info("[wrapped] Top performers breakdown skipped: no contributors", {
      teamId: targetTeam.leagueTeamId,
    });
    return null;
  }

  const topFive = [...targetTeam.topPerformers]
    .sort((left, right) => right.totalPoints - left.totalPoints)
    .slice(0, 5)
    .map((player) => ({
      playerId: player.playerId,
      playerName: player.playerName,
      teamShortName: player.teamShortName,
      role: player.role,
      totalPoints: toFixedNumber(player.totalPoints, 2),
    }));
  const bestPerformer = topFive[0];
  if (!bestPerformer) {
    return null;
  }

  console.info("[wrapped] Top performers breakdown built", {
    teamId: targetTeam.leagueTeamId,
    bestPerformer: bestPerformer.playerName,
    bestPerformerPoints: bestPerformer.totalPoints,
    topFiveCount: topFive.length,
  });

  return {
    bestPerformer,
    topFive,
  };
}

function buildLeagueBestPlayersBreakdown(
  values: TeamDerivedMetrics[],
): WrappedLeagueBestPlayersBreakdown | undefined {
  const topPlayers = values
    .flatMap((team) => {
      if (!team.bestPerformer) {
        return [];
      }
      return [
        {
          playerId: team.bestPerformer.playerId,
          playerName: team.bestPerformer.playerName,
          iplTeamShortName: team.bestPerformer.teamShortName,
          fantasyTeamName: team.displayName,
          role: team.bestPerformer.role,
          totalPoints: team.bestPerformer.totalPoints,
        },
      ];
    })
    .sort((left, right) => {
      if (right.totalPoints !== left.totalPoints) {
        return right.totalPoints - left.totalPoints;
      }
      return left.fantasyTeamName.localeCompare(right.fantasyTeamName);
    })
    .map((player) => ({
      ...player,
      totalPoints: toFixedNumber(player.totalPoints, 1),
    }));
  const bestPlayer = topPlayers[0];
  if (!bestPlayer) {
    console.info("[wrapped] League best players breakdown unavailable");
    return undefined;
  }

  console.info("[wrapped] League best players breakdown built", {
    bestPlayer: {
      playerId: bestPlayer.playerId,
      playerName: bestPlayer.playerName,
      fantasyTeamName: bestPlayer.fantasyTeamName,
      totalPoints: bestPlayer.totalPoints,
    },
    topPlayersCount: topPlayers.length,
  });

  return {
    bestPlayer,
    topPlayers,
  };
}

export function buildWrappedPayload({
  teamId,
  score,
  progression,
  matchAnalysis,
}: {
  teamId: string;
  score: ScoreComputationResult;
  progression: { generatedAt: string; teams: TeamMatchProgression[] };
  matchAnalysis?: MatchAnalysisComputationResult;
}): TeamWrappedPayload {
  console.info("[wrapped] Building wrapped payload", {
    teamId,
    generatedAt: score.generatedAt,
    standingCount: score.snapshot.standings.length,
    progressionTeams: progression.teams.length,
    matchAnalysisMatches: matchAnalysis ? Object.keys(matchAnalysis.analysesByMatch).length : 0,
  });

  const teamProgressionById = new Map(
    progression.teams.map((teamProgression) => [teamProgression.leagueTeamId, teamProgression]),
  );

  const derivedByTeam: TeamDerivedMetrics[] = [];
  for (const standing of score.snapshot.standings) {
    const teamProgression = teamProgressionById.get(standing.leagueTeamId);
    if (!teamProgression) {
      continue;
    }

    const totalPoints = getLatestCumulativePoints(teamProgression);
    const captainBonus = teamProgression.captainBonus;
    const viceCaptainBonus = teamProgression.viceCaptainBonus;
    const captainImpact = captainBonus + viceCaptainBonus;
    const captainEfficiency = totalPoints > 0 ? (captainImpact / totalPoints) * 100 : 0;
    const concentrationMetrics = computeConcentrationMetrics(
      teamProgression,
      totalPoints,
    );
    const concentrationIndex = concentrationMetrics.stretchedIndex;
    const volatilityPeak = computeVolatilityPeak(teamProgression);
    const { surge, midpointRank, finalRank } = computeSecondHalfSurge(teamProgression);
    const bestMatch =
      [...teamProgression.series].sort((left, right) => right.points - left.points)[0] ?? null;
    const worstMatch =
      [...teamProgression.series].sort((left, right) => left.points - right.points)[0] ?? null;
    const playerNameById = new Map(
      teamProgression.contributors.map((contributor) => [
        contributor.playerId,
        contributor.playerName,
      ]),
    );
    const captaincyPlayers = teamProgression.theoreticalCaptaincy.windows.flatMap((window) => {
      const rows: TeamDerivedMetrics["captaincyPlayers"] = [];
      if (window.actualCaptainPlayerId !== null) {
        rows.push({
          windowIndex: window.windowIndex,
          role: "captain",
          playerName:
            playerNameById.get(window.actualCaptainPlayerId) ??
            `Player #${window.actualCaptainPlayerId}`,
          bonusPoints: window.actualCaptainBonus,
        });
      }
      if (window.actualViceCaptainPlayerId !== null) {
        rows.push({
          windowIndex: window.windowIndex,
          role: "viceCaptain",
          playerName:
            playerNameById.get(window.actualViceCaptainPlayerId) ??
            `Player #${window.actualViceCaptainPlayerId}`,
          bonusPoints: window.actualViceCaptainBonus,
        });
      }
      return rows;
    });
    const topPerformers = teamProgression.contributors.map((contributor) => ({
      playerId: contributor.playerId,
      playerName: contributor.playerName,
      teamShortName: contributor.teamShortName,
      role: contributor.role,
      totalPoints: contributor.pointsAfterMultiplier,
    }));
    const bestPerformer =
      [...topPerformers].sort((left, right) => right.totalPoints - left.totalPoints)[0] ?? null;
    const bestContributorPoints =
      topPerformers.length > 0
        ? Math.max(...topPerformers.map((contributor) => contributor.totalPoints))
        : 0;

    derivedByTeam.push({
      leagueTeamId: standing.leagueTeamId,
      displayName: standing.displayName,
      ownerName: standing.ownerName,
      totalPoints,
      captainImpact: toFixedNumber(captainImpact, 2),
      captainBonus: toFixedNumber(captainBonus, 2),
      viceCaptainBonus: toFixedNumber(viceCaptainBonus, 2),
      captainEfficiency: toFixedNumber(captainEfficiency, 2),
      switchImpact: toFixedNumber(teamProgression.transferImpactScore, 2),
      concentrationIndex,
      depthScore: toFixedNumber(1 - concentrationIndex, 4),
      secondHalfSurge: toFixedNumber(surge, 2),
      volatility: volatilityPeak.maxSwing,
      bestContributorPoints: toFixedNumber(bestContributorPoints, 2),
      volatilityPeak: volatilityPeak.detail,
      consistencyIndex: computeConsistencyIndex(teamProgression),
      ceilingBreaker: bestMatch?.points ?? 0,
      recoveryArtist: computeRecoveryArtist(teamProgression),
      bestMatchPoints: bestMatch?.points ?? 0,
      bestMatchNumber: bestMatch?.matchNumber ?? null,
      worstMatchNumber: worstMatch?.matchNumber ?? null,
      captaincyPlayers,
      topPerformers,
      bestPerformer,
      worstMatchPoints: worstMatch?.points ?? 0,
      midpointRank,
      finalRank,
    });

    console.info("[wrapped] Team concentration metrics transformed", {
      teamId: standing.leagueTeamId,
      teamName: standing.displayName,
      rawConcentrationIndex: concentrationMetrics.rawIndex,
      stretchedConcentrationIndex: concentrationMetrics.stretchedIndex,
      depthScore: toFixedNumber(1 - concentrationMetrics.stretchedIndex, 4),
    });
  }

  const targetTeam = derivedByTeam.find((team) => team.leagueTeamId === teamId);
  if (!targetTeam) {
    console.error("[wrapped] Target team missing from wrapped derivation", {
      requestedTeamId: teamId,
      availableTeams: derivedByTeam.map((team) => team.leagueTeamId),
    });
    throw new Error("Team not found for wrapped payload");
  }

  const bestMatchContext =
    targetTeam.bestMatchNumber === null
      ? null
      : matchAnalysis?.analysesByMatch?.[targetTeam.bestMatchNumber];
  const bestMatchupLabel =
    targetTeam.bestMatchNumber !== null && bestMatchContext
      ? formatMatchupLabel(bestMatchContext.playingIplTeams, targetTeam.bestMatchNumber)
      : null;
  const bestMatchBreakdown = buildMatchBreakdown({
    targetTeamId: teamId,
    matchNumber: targetTeam.bestMatchNumber,
    expectedMatchPoints: targetTeam.bestMatchPoints,
    matchAnalysis,
    contextLabel: "best",
  });
  const worstMatchBreakdown = buildMatchBreakdown({
    targetTeamId: teamId,
    matchNumber: targetTeam.worstMatchNumber,
    expectedMatchPoints: targetTeam.worstMatchPoints,
    matchAnalysis,
    contextLabel: "worst",
  });
  const captaincyBreakdown = buildCaptaincyBreakdown(targetTeam);
  const topPerformersBreakdown = buildTopPerformersBreakdown(targetTeam);
  const worstMatchContext =
    targetTeam.worstMatchNumber === null
      ? null
      : matchAnalysis?.analysesByMatch?.[targetTeam.worstMatchNumber];
  const worstMatchupLabel =
    targetTeam.worstMatchNumber !== null && worstMatchContext
      ? formatMatchupLabel(worstMatchContext.playingIplTeams, targetTeam.worstMatchNumber)
      : null;
  const leagueBestPlayersBreakdown = buildLeagueBestPlayersBreakdown(derivedByTeam);

  console.info("[wrapped] Additional story cards context", {
    teamId: targetTeam.leagueTeamId,
    worstMatchNumber: targetTeam.worstMatchNumber,
    worstMatchPoints: toFixedNumber(targetTeam.worstMatchPoints, 1),
    worstMatchupLabel,
    hasWorstMatchBreakdown: Boolean(worstMatchBreakdown),
    hasLeagueBestPlayersBreakdown: Boolean(leagueBestPlayersBreakdown),
    leagueBestPlayerId: leagueBestPlayersBreakdown?.bestPlayer.playerId ?? null,
  });

  const metricDefinitions: GlobalMetricDefinition[] = [
    {
      id: "overall-best-player",
      title: "Overall Best Player",
      description:
        "Highest-scoring player in the league (after C/VC multipliers). Card below lists each team's top scorer.",
      unit: "points",
      higherIsBetter: true,
    },
    {
      id: "captaincy-king",
      title: "Captaincy King",
      description: "Highest captain + vice-captain bonus in the league.",
      unit: "points",
      higherIsBetter: true,
    },
    {
      id: "captaincy-efficiency",
      title: "Captaincy Efficiency King",
      description: "Best captaincy return as a percentage of total points.",
      unit: "percent",
      higherIsBetter: true,
    },
    {
      id: "switch-master",
      title: "Switch Master",
      description:
        "How many points your captain/vice-captain switches added or cost overall. Positive means your switches helped; negative means they hurt.",
      unit: "points",
      higherIsBetter: true,
    },
    {
      id: "concentration-king",
      title: "Star Dependence",
      description:
        "How dependent your team was on a few players. Higher % means more dependence; lower % means a more balanced team.",
      unit: "percent",
      higherIsBetter: true,
    },
    {
      id: "depth-king",
      title: "Depth King",
      description: "Most balanced scoring spread across the full squad.",
      unit: "percent",
      higherIsBetter: true,
    },
    {
      id: "volatility-king",
      title: "Volatility King",
      description: "Largest single-match rank swing in either direction.",
      unit: "rank",
      higherIsBetter: true,
    },
    {
      id: "consistency-king",
      title: "Consistency King",
      description:
        "Steadiest week-to-week scorer. Lower spread in match points means higher consistency.",
      unit: "points",
      higherIsBetter: false,
    },
    {
      id: "ceiling-breaker",
      title: "Ceiling Breaker",
      description: "Highest points in any single match.",
      unit: "points",
      higherIsBetter: true,
    },
    {
      id: "recovery-artist",
      title: "Recovery Artist",
      description: "Best bounceback in the three matches after the worst day.",
      unit: "points",
      higherIsBetter: true,
    },
  ];

  const globalStats = metricDefinitions.map((metric) =>
    buildComparison({
      metricId: metric.id,
      metricTitle: metric.title,
      description: metric.description,
      unit: metric.unit,
      values: derivedByTeam,
      targetTeamId: teamId,
      higherIsBetter: metric.higherIsBetter,
      matchAnalysis,
      leagueBestPlayersBreakdown,
    }),
  );

  const cards = [
    {
      id: "personal-intro",
      kind: "personal" as const,
      kicker: "Your IPL Wrapped",
      title: `${targetTeam.displayName} finished #${targetTeam.finalRank}`,
      body: `You closed the season with ${targetTeam.totalPoints.toFixed(1)} points.`,
      statLabel: "Final Points",
      statValue: `${targetTeam.totalPoints.toFixed(1)}`,
      meta: `Owner: ${targetTeam.ownerName}`,
    },
    {
      id: "personal-best-match",
      kind: "personal" as const,
      kicker: "Peak Match",
      title: `Your best match delivered ${targetTeam.bestMatchPoints.toFixed(1)} points`,
      body:
        targetTeam.bestMatchNumber === null
          ? "Match details are unavailable for this stat."
          : bestMatchupLabel
            ? `This came in ${bestMatchupLabel} (match #${targetTeam.bestMatchNumber}).`
            : `This came in match #${targetTeam.bestMatchNumber}.`,
      statLabel: bestMatchBreakdown ? undefined : "Best Match Score",
      statValue: bestMatchBreakdown
        ? undefined
        : `${targetTeam.bestMatchPoints.toFixed(1)}`,
      bestMatchBreakdown: bestMatchBreakdown ?? undefined,
    },
    {
      id: "personal-worst-match",
      kind: "personal" as const,
      kicker: "Lowest Match",
      title: `Your lowest match returned ${targetTeam.worstMatchPoints.toFixed(1)} points`,
      body:
        targetTeam.worstMatchNumber === null
          ? "Match details are unavailable for this stat."
          : worstMatchupLabel
            ? `This came in ${worstMatchupLabel} (match #${targetTeam.worstMatchNumber}).`
            : `This came in match #${targetTeam.worstMatchNumber}.`,
      statLabel: worstMatchBreakdown ? undefined : "Worst Match Score",
      statValue: worstMatchBreakdown
        ? undefined
        : `${targetTeam.worstMatchPoints.toFixed(1)}`,
      worstMatchBreakdown: worstMatchBreakdown ?? undefined,
    },
    {
      id: "personal-captaincy",
      kind: "personal" as const,
      kicker: "Captaincy Edge",
      title: `${targetTeam.captainImpact.toFixed(1)} bonus points from C/VC`,
      body: `Captaincy efficiency finished at ${targetTeam.captainEfficiency.toFixed(2)}% of your total points.`,
      statLabel: captaincyBreakdown ? undefined : "Captaincy Bonus",
      statValue: captaincyBreakdown ? undefined : `${targetTeam.captainImpact.toFixed(1)}`,
      captaincyBreakdown: captaincyBreakdown ?? undefined,
    },
    {
      id: "personal-top-performers",
      kind: "personal" as const,
      kicker: "Top Performers",
      title: topPerformersBreakdown
        ? `${topPerformersBreakdown.bestPerformer.playerName} was your best performer`
        : "Your best performer is unavailable",
      body:
        topPerformersBreakdown
          ? `${topPerformersBreakdown.bestPerformer.playerName} delivered ${topPerformersBreakdown.bestPerformer.totalPoints.toFixed(1)} points. Here are your top 5 performers by season contribution.`
          : "Contributor details are unavailable for this team.",
      topPerformersBreakdown: topPerformersBreakdown ?? undefined,
    },
    {
      id: "league-transition",
      kind: "transition" as const,
      kicker: "League Lens",
      title: "Now compare your season with everyone else",
      body: "",
    },
    ...globalStats.map((stat) => ({
      id: `global-${stat.id}`,
      kind: "global" as const,
      kicker: "League Superlative",
      title: stat.title,
      body: `${stat.comparison.winnerTeamName} leads this category. You are #${stat.comparison.yourRank}/${stat.comparison.totalTeams}.`,
      statLabel: "Your Value",
      statValue: formatStatValue(stat.comparison.yourValue, stat.unit),
      meta: `Winner: ${formatStatValue(stat.comparison.winnerValue, stat.unit)} · Gap: ${formatStatValue(stat.comparison.gapToWinner, stat.unit)}`,
    })),
    {
      id: "outro",
      kind: "outro" as const,
      kicker: "Season Sign-off",
      title: "That's your IPL Wrapped",
      body: "Season complete. See you next year.",
    },
  ];

  console.info("[wrapped] Wrapped payload generated", {
    teamId: targetTeam.leagueTeamId,
    cardCount: cards.length,
    globalStatsCount: globalStats.length,
    finalRank: targetTeam.finalRank,
    totalPoints: targetTeam.totalPoints,
    hasBestMatchBreakdown: Boolean(bestMatchBreakdown),
    hasWorstMatchBreakdown: Boolean(worstMatchBreakdown),
    hasCaptaincyBreakdown: Boolean(captaincyBreakdown),
    hasTopPerformersBreakdown: Boolean(topPerformersBreakdown),
  });

  return {
    generatedAt: progression.generatedAt,
    teamId: targetTeam.leagueTeamId,
    teamName: targetTeam.displayName,
    ownerName: targetTeam.ownerName,
    totalTeams: derivedByTeam.length,
    pointsTable: score.snapshot.standings
      .slice()
      .sort((left, right) => left.rank - right.rank)
      .map((standing) => ({
        rank: standing.rank,
        teamId: standing.leagueTeamId,
        teamName: standing.displayName,
        points: standing.totalPoints,
      })),
    cards,
    globalStats,
  };
}
