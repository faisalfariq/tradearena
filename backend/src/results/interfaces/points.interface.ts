export interface PointsCalculationInput {
  evaluationId: string;
  realizedReturn: number;
  exitReason: string;
  pointsRule: string;
  pointsRuleVersion?: string;
  overridePoints?: number | null;
  rankInDay?: number;
  totalParticipantsInDay?: number;
}

export interface PointsCalculationResult {
  points: number;
  pointsRule: string;
  pointsRuleVersion: string;
}

export interface DailyResultItem {
  rank: number;
  participantId: string;
  participantName: string;
  participantEmail?: string | null;
  pickId: string;
  evaluationId?: string;
  stockSymbol: string;
  stockName: string;
  tradingDate: string;
  entryPrice: number;
  highestPrice: number;
  maxFloatingReturn: number;
  exitPrice: number;
  exitTimestamp: Date | string;
  exitReason: string;
  realizedReturn: number;
  points: number;
  pointsRule: string;
  evaluationStatus: string;
  isOverridden: boolean;
}

export interface DailySummaryMetrics {
  tradingDate: string;
  totalParticipants: number;
  averageReturn: number;
  gainersCount: number;
  losersCount: number;
  topGainer: {
    participantName: string;
    stockSymbol: string;
    returnPct: number;
    points: number;
  } | null;
  topLoser: {
    participantName: string;
    stockSymbol: string;
    returnPct: number;
    points: number;
  } | null;
}

export interface DailyResultsResponse {
  tournamentId: string;
  tradingDate: string;
  metrics: DailySummaryMetrics;
  results: DailyResultItem[];
}

export interface ParticipantOverallStats {
  rank: number;
  participantId: string;
  participantName: string;
  participantEmail?: string | null;
  totalPoints: number;
  picksCount: number;
  winCount: number;
  lossCount: number;
  breakevenCount: number;
  winRate: number;
  averageReturn: number;
  bestPick: {
    symbol: string;
    date: string;
    returnPct: number;
    points: number;
  } | null;
  worstPick: {
    symbol: string;
    date: string;
    returnPct: number;
    points: number;
  } | null;
  dailyHistory: {
    date: string;
    symbol: string;
    returnPct: number;
    points: number;
    dailyRank: number;
  }[];
}

export interface OverallResultsResponse {
  tournamentId: string;
  tournamentName: string;
  tournamentStatus?: string;
  completionType?: string;
  targetPoints?: number | null;
  winnerParticipantId?: string | null;
  winnerParticipantName?: string | null;
  totalParticipants: number;
  totalEvaluatedPicks: number;
  standings: ParticipantOverallStats[];
}
