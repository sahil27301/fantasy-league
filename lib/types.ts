export type CaptaincyRole = "captain" | "viceCaptain" | "normal";

export type MatchConfidence = "high" | "medium" | "low";

export interface NormalizedRosterEntry {
  ownerName: string;
  playerNameRaw: string;
  playerNameNormalized: string;
  iplTeamShortName: string;
  windowIndex: 1 | 2 | 3;
  captaincyRole: CaptaincyRole;
  sourceRow: number;
  matchConfidence: MatchConfidence;
  resolvedPlayerId: number;
  resolvedTeamId: number;
}

export interface LeagueTeam {
  id: string;
  ownerName: string;
  displayName: string;
}

export interface CaptainWindow {
  leagueTeamId: string;
  windowIndex: 1 | 2 | 3;
  fromMatch: number;
  toMatch: number;
  captainPlayerId: number;
  viceCaptainPlayerId: number;
}

export interface IplLivePlayer {
  id: number;
  teamId: number;
  shortName: string;
  teamShortName: string;
  overallPoints: number;
}

export interface TeamPlayerContribution {
  playerId: number;
  playerName: string;
  teamShortName: string;
  overallPoints: number;
  multiplier: number;
  pointsAfterMultiplier: number;
  role: CaptaincyRole;
  captainMatches?: number;
  viceCaptainMatches?: number;
}

export interface TeamStanding {
  leagueTeamId: string;
  ownerName: string;
  displayName: string;
  totalPoints: number;
  captainBonus: number;
  viceCaptainBonus: number;
  rank: number;
  previousRank: number | null;
  contributors: TeamPlayerContribution[];
}

export interface ScoreSnapshot {
  snapshotAt: string;
  matchNumber: number;
  standings: TeamStanding[];
}

export interface LeagueStatsV1 {
  rankMomentum: number;
  pointsBehindLeader: number;
  pointsBehindPodium: number;
  captainRoi: number;
  consistencyIndex: number;
  topContributorConcentration: number;
}

export interface LeagueStatsV2 {
  transferImpactScore: number;
  differentialHeroCount: number;
  overlapScore: number;
  clutchScore: number;
}

export interface TeamInsights {
  leagueTeamId: string;
  statsV1: LeagueStatsV1;
  statsV2: LeagueStatsV2;
}

export interface UnsoldXiBenchmark {
  topXiTotal: number;
  gapVsLeader: number;
  topPlayers: {
    playerId: number;
    playerName: string;
    teamShortName: string;
    points: number;
    multiplierRole: "captain" | "viceCaptain" | "normal";
    boostedPoints: number;
  }[];
}

export interface ScoreComputationResult {
  snapshot: ScoreSnapshot;
  teamInsights: TeamInsights[];
  generatedAt: string;
  unsoldXiBenchmark?: UnsoldXiBenchmark;
}

export interface TeamMatchProgressPoint {
  matchNumber: number;
  points: number;
  cumulativePoints: number;
  rank: number;
}

export interface TeamMatchProgression {
  leagueTeamId: string;
  ownerName: string;
  displayName: string;
  series: TeamMatchProgressPoint[];
  contributors: TeamPlayerContribution[];
  captainBonus: number;
  viceCaptainBonus: number;
  transferImpactScore: number;
  windowBonuses: {
    windowIndex: 1 | 2 | 3;
    captainBonus: number;
    viceCaptainBonus: number;
  }[];
  theoreticalCaptaincy: {
    totalPotentialPoints: number;
    unrealizedPoints: number;
    windows: {
      windowIndex: 1 | 2 | 3;
      actualCaptainBonus: number;
      actualViceCaptainBonus: number;
      theoreticalCaptainBonus: number;
      theoreticalViceCaptainBonus: number;
      actualCaptainPlayerId: number | null;
      actualViceCaptainPlayerId: number | null;
      theoreticalCaptainPlayerId: number | null;
      theoreticalViceCaptainPlayerId: number | null;
    }[];
  };
}

export interface MatchProgressionResult {
  generatedAt: string;
  matches: number[];
  teams: TeamMatchProgression[];
}

export interface MatchUpcomingInfo {
  matchNumber: number | null;
  matchName: string;
  matchDateIso: string | null;
  homeTeamShortName?: string | null;
  awayTeamShortName?: string | null;
}

export interface MatchTeamPerformance {
  leagueTeamId: string;
  displayName: string;
  ownerName: string;
  totalPoints: number;
  basePoints: number;
  captainBonus: number;
  viceCaptainBonus: number;
  captainPlayerId: number | null;
  viceCaptainPlayerId: number | null;
}

export interface MatchPlayerPerformance {
  playerId: number;
  playerName: string;
  teamShortName: string;
  points: number;
  fantasyTeams: string[];
  captainedBy: string[];
  viceCaptainedBy: string[];
}

export interface MatchFantasyTeamPlayerRow {
  playerId: number;
  playerName: string;
  iplTeamShortName: string;
  fantasyTeamName: string;
  points: number | null;
  isCaptain: boolean;
  isViceCaptain: boolean;
}

export interface MatchFantasyTeamBreakdown {
  leagueTeamId: string;
  displayName: string;
  ownerName: string;
  totalPoints: number | null;
  basePoints: number | null;
  captainBonus: number | null;
  viceCaptainBonus: number | null;
  players: MatchFantasyTeamPlayerRow[];
}

export interface MatchAnalysis {
  matchNumber: number;
  activeWindow: 1 | 2 | 3;
  playingIplTeams: string[];
  teamPerformances: MatchTeamPerformance[];
  playerPerformances: MatchPlayerPerformance[];
  fantasyTeamBreakdowns: MatchFantasyTeamBreakdown[];
}

export interface MatchAnalysisComputationResult {
  generatedAt: string;
  completedMatches: number[];
  upcomingMatches: MatchUpcomingInfo[];
  analysesByMatch: Record<number, MatchAnalysis>;
}
