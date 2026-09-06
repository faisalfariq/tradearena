import {
  EvaluationStatus,
  ExitReason,
  CandleAmbiguityPolicy,
  GapPolicy,
} from '@prisma/client';
import { NormalizedCandle } from '../../market-data/interfaces/market-data-provider.interface';

export interface EvaluationInput {
  pickId: string;
  symbol: string;
  entryPrice: number;
  entryTimestamp?: Date;
  entrySource?: string;
  initialStopPct: number; // e.g. 0.03
  trailingStopPct: number; // e.g. 0.03
  candleAmbiguityPolicy: CandleAmbiguityPolicy;
  gapPolicy: GapPolicy;
  priceFractionPolicy: string;
  calculationRuleVersion: string;
  candles: NormalizedCandle[];
}

export interface EvaluationTimelineStep {
  minute: number;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  peak: number;
  currentThreshold: number;
}

export interface EvaluationOutput {
  pickId: string;
  status: EvaluationStatus;
  entryPrice: number;
  exitPrice: number;
  exitTimestamp: Date;
  exitReason: ExitReason;
  highestPrice: number;
  maxFloatingReturn: number;
  theoreticalThreshold: number;
  actualExitPrice: number;
  realizedReturn: number;
  calculationVersion: string;
  evidence: {
    marketDataProvider: string;
    marketDataDate: string;
    candleCount: number;
    triggerCandleIndex: number;
    triggerCandleTimestamp: string;
    triggerCandle: { open: number; high: number; low: number; close: number };
    priceFractionVersion: string;
    gapPolicy: string;
    ambiguityPolicy: string;
    reviewNotes?: string;
    stepByStepTimeline?: EvaluationTimelineStep[];
  };
}
