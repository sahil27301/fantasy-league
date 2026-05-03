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

export interface ScoreComputationResult {
  snapshot: ScoreSnapshot;
  teamInsights: TeamInsights[];
  generatedAt: string;
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
