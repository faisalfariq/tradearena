export interface PipelineStepResult {
  step: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED' | 'SKIPPED';
  message: string;
  details?: Record<string, any>;
}

export interface PipelineExecutionReport {
  pipelineId: string;
  tournamentId: string;
  tournamentName: string;
  tradingDate: string;
  startedAt: string;
  completedAt: string;
  overallStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  uniqueSymbolsCount: number;
  picksCount: number;
  evaluatedCount: number;
  completedCount: number;
  exceptionsCount: number;
  recalculatedPointsCount: number;
  steps: PipelineStepResult[];
}

export interface ExceptionItem {
  id: string;
  pickId: string;
  participantId: string;
  participantName: string;
  stockSymbol: string;
  tradingDate: string;
  status: 'PENDING_DATA' | 'REVIEW_REQUIRED';
  entryPrice: number;
  exitPrice: number | null;
  realizedReturn: number | null;
  exitReason: string | null;
  notes: string;
  createdAt: string;
}

export interface ExceptionsSummaryResponse {
  tournamentId: string;
  tournamentName: string;
  tradingDate?: string;
  totalExceptions: number;
  pendingDataCount: number;
  reviewRequiredCount: number;
  items: ExceptionItem[];
}
