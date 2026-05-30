export type WrappedValueUnit = "points" | "percent" | "rank" | "delta";

export interface WrappedStatComparison {
  winnerTeamId: string;
  winnerTeamName: string;
  winnerValue: number;
  yourValue: number;
  yourRank: number;
  totalTeams: number;
  gapToWinner: number;
}

export interface WrappedGlobalStat {
  id: string;
  title: string;
  description: string;
  unit: WrappedValueUnit;
  comparison: WrappedStatComparison;
  volatilityDetails?: WrappedVolatilityDetails;
  leagueBestPlayersBreakdown?: WrappedLeagueBestPlayersBreakdown;
}

export interface WrappedVolatilityDetail {
  matchNumber: number;
  matchupLabel: string;
  points: number;
  oldRank: number;
  newRank: number;
  rankSwing: number;
}

export interface WrappedVolatilityDetails {
  winner: WrappedVolatilityDetail;
  you: WrappedVolatilityDetail;
}

export type WrappedLeagueBestPlayerRole = "captain" | "viceCaptain" | "normal";

export interface WrappedLeagueBestPlayerRow {
  playerId: number;
  playerName: string;
  iplTeamShortName: string;
  fantasyTeamName: string;
  role: WrappedLeagueBestPlayerRole;
  totalPoints: number;
}

export interface WrappedLeagueBestPlayersBreakdown {
  bestPlayer: WrappedLeagueBestPlayerRow;
  topPlayers: WrappedLeagueBestPlayerRow[];
}

export type WrappedStoryCardKind = "personal" | "transition" | "global" | "outro";

export interface WrappedBestMatchPlayer {
  playerId: number;
  playerName: string;
  iplTeamShortName: string;
  points: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
}

export interface WrappedBestMatchBreakdown {
  matchNumber: number;
  matchupLabel: string;
  basePoints: number;
  captainBonus: number;
  viceCaptainBonus: number;
  totalPoints: number;
  players: WrappedBestMatchPlayer[];
}

export interface WrappedCaptaincyWindowBreakdown {
  windowIndex: 1 | 2 | 3;
  captainBonus: number;
  viceCaptainBonus: number;
  totalBonus: number;
}

export type WrappedCaptaincyRole = "captain" | "viceCaptain";

export interface WrappedCaptaincyPlayerBreakdown {
  windowIndex: 1 | 2 | 3;
  role: WrappedCaptaincyRole;
  playerName: string;
  bonusPoints: number;
}

export interface WrappedCaptaincyBreakdown {
  captainBonus: number;
  viceCaptainBonus: number;
  totalBonus: number;
  players: WrappedCaptaincyPlayerBreakdown[];
}

export interface WrappedTopPerformer {
  playerId: number;
  playerName: string;
  teamShortName: string;
  role: "captain" | "viceCaptain" | "normal";
  totalPoints: number;
}

export interface WrappedTopPerformersBreakdown {
  bestPerformer: WrappedTopPerformer;
  topFive: WrappedTopPerformer[];
}

export interface WrappedStoryCard {
  id: string;
  kind: WrappedStoryCardKind;
  kicker: string;
  title: string;
  body: string;
  statLabel?: string;
  statValue?: string;
  meta?: string;
  bestMatchBreakdown?: WrappedBestMatchBreakdown;
  worstMatchBreakdown?: WrappedBestMatchBreakdown;
  captaincyBreakdown?: WrappedCaptaincyBreakdown;
  topPerformersBreakdown?: WrappedTopPerformersBreakdown;
}

export interface TeamWrappedPayload {
  generatedAt: string;
  teamId: string;
  teamName: string;
  ownerName: string;
  totalTeams: number;
  pointsTable: {
    rank: number;
    teamId: string;
    teamName: string;
    points: number;
  }[];
  cards: WrappedStoryCard[];
  globalStats: WrappedGlobalStat[];
}
