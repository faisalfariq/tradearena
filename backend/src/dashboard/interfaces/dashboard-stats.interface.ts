export interface DashboardMetrics {
  activeTournamentsCount: number;
  totalTournamentsCount: number;
  totalParticipantsCount: number;
  totalPicksCount: number;
  completedEvaluationsCount: number;
  pendingReviewsCount: number;
  totalStocksCount: number;
}

export interface TournamentSummaryItem {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  participantsCount: number;
  picksCount: number;
}

export interface RecentEvaluationItem {
  id: string;
  tournamentId: string;
  tournamentName: string;
  participantName: string;
  stockSymbol: string;
  tradingDate: string;
  entryPrice: number;
  exitPrice: number | null;
  realizedReturn: number | null;
  exitReason: string | null;
  status: string;
}

export interface DashboardStatsResponse {
  metrics: DashboardMetrics;
  activeTournaments: TournamentSummaryItem[];
  recentEvaluations: RecentEvaluationItem[];
}
