import { TradeEvaluationEngine } from './trade-evaluation.engine';
import { PriceFractionService } from '../services/price-fraction.service';
import {
  CandleAmbiguityPolicy,
  GapPolicy,
  ExitReason,
  EvaluationStatus,
} from '@prisma/client';
import { NormalizedCandle } from '../../market-data/interfaces/market-data-provider.interface';

describe('TradeEvaluationEngine', () => {
  let engine: TradeEvaluationEngine;
  let priceFractionService: PriceFractionService;

  beforeEach(() => {
    priceFractionService = new PriceFractionService();
    engine = new TradeEvaluationEngine(priceFractionService);
  });

  const createCandle = (
    minute: number,
    open: number,
    high: number,
    low: number,
    close: number,
  ): NormalizedCandle => ({
    symbol: 'BBCA',
    tradingDate: '2026-09-05',
    timestamp: new Date(
      `2026-09-05T09:${minute.toString().padStart(2, '0')}:00.000Z`,
    ),
    open,
    high,
    low,
    close,
    volume: 1000,
    provider: 'canonical',
  });

  it('Scenario 1: should trigger Initial Cut Loss at -3% minimum', () => {
    // Entry: 100
    // Bar 1: 100 -> 101 -> 99 -> 100
    // Bar 2: 100 -> 100 -> 96.5 -> 97 (Low breaches 97 threshold)
    const candles = [
      createCandle(0, 100, 100, 99, 100),
      createCandle(1, 100, 100, 96.5, 97),
      createCandle(2, 97, 105, 96, 104), // Later rally must be ignored!
    ];

    const result = engine.evaluate({
      pickId: 'pick-1',
      symbol: 'BBCA',
      entryPrice: 100,
      initialStopPct: 0.03,
      trailingStopPct: 0.03,
      candleAmbiguityPolicy: CandleAmbiguityPolicy.CONSERVATIVE_LOSS_FIRST,
      gapPolicy: GapPolicy.ACTUAL_FIRST_VALID_LEVEL,
      priceFractionPolicy: 'IDX_STANDARD_V1',
      calculationRuleVersion: 'v1.0.0',
      candles,
    });

    expect(result.status).toBe(EvaluationStatus.COMPLETED);
    expect(result.exitReason).toBe(ExitReason.INITIAL_CL);
    expect(result.theoreticalThreshold).toBe(97);
    expect(result.actualExitPrice).toBe(97);
    expect(result.realizedReturn).toBe(-3);
    expect(result.evidence.triggerCandleIndex).toBe(1);
  });

  it('Scenario 2: should trigger Trailing Stop at -3% from peak (PRD Section 8)', () => {
    // PRD Section 8:
    // Entry: 100
    // Peak: 109
    // Theoretical TS: 109 * 0.97 = 105.73
    // Price ladder: 106 (not triggered), 105 (triggered) -> Exit: 105 -> Return: +5%
    const candles = [
      createCandle(0, 100, 104, 100, 103),
      createCandle(1, 103, 109, 102, 108), // Reaches peak 109!
      createCandle(2, 108, 108, 106, 107), // Low 106 > 105.73 (not triggered)
      createCandle(3, 107, 107, 104, 104.5), // Low 104 <= 105.73 (triggered at 105!)
      createCandle(4, 105, 120, 105, 120), // Later massive rally must be ignored!
    ];

    const result = engine.evaluate({
      pickId: 'pick-2',
      symbol: 'BBCA',
      entryPrice: 100,
      initialStopPct: 0.03,
      trailingStopPct: 0.03,
      candleAmbiguityPolicy: CandleAmbiguityPolicy.CONSERVATIVE_LOSS_FIRST,
      gapPolicy: GapPolicy.ACTUAL_FIRST_VALID_LEVEL,
      priceFractionPolicy: 'IDX_STANDARD_V1',
      calculationRuleVersion: 'v1.0.0',
      candles,
    });

    expect(result.status).toBe(EvaluationStatus.COMPLETED);
    expect(result.highestPrice).toBe(109);
    expect(result.exitReason).toBe(ExitReason.TRAILING_STOP);
    expect(result.theoreticalThreshold).toBe(105.73);
    expect(result.actualExitPrice).toBe(105);
    expect(result.realizedReturn).toBe(5);
    expect(result.maxFloatingReturn).toBe(9);
    expect(result.evidence.triggerCandleIndex).toBe(3);
  });

  it('Scenario 3: should handle Gap Down Open below stop threshold', () => {
    // Entry: 100, Initial Stop: 97
    // Bar 1: Normal bar
    // Bar 2: Gap down open at 94 (past 97)
    const candles = [
      createCandle(0, 100, 101, 99, 100),
      createCandle(1, 94, 95, 93, 93.5),
    ];

    const result = engine.evaluate({
      pickId: 'pick-3',
      symbol: 'BBCA',
      entryPrice: 100,
      initialStopPct: 0.03,
      trailingStopPct: 0.03,
      candleAmbiguityPolicy: CandleAmbiguityPolicy.CONSERVATIVE_LOSS_FIRST,
      gapPolicy: GapPolicy.ACTUAL_FIRST_VALID_LEVEL,
      priceFractionPolicy: 'IDX_STANDARD_V1',
      calculationRuleVersion: 'v1.0.0',
      candles,
    });

    expect(result.status).toBe(EvaluationStatus.COMPLETED);
    expect(result.actualExitPrice).toBe(94); // Traded at open 94, not forced 97
    expect(result.realizedReturn).toBe(-6);
  });

  it('Scenario 4: should exit at Market Close if position never hits stop loss', () => {
    // Entry: 100
    // Position climbs and finishes at 108 without ever hitting trailing stop
    const candles = [
      createCandle(0, 100, 103, 100, 102),
      createCandle(1, 102, 106, 101, 105),
      createCandle(2, 105, 109, 104, 108), // Final candle close 108
    ];

    const result = engine.evaluate({
      pickId: 'pick-4',
      symbol: 'BBCA',
      entryPrice: 100,
      initialStopPct: 0.03,
      trailingStopPct: 0.03,
      candleAmbiguityPolicy: CandleAmbiguityPolicy.CONSERVATIVE_LOSS_FIRST,
      gapPolicy: GapPolicy.ACTUAL_FIRST_VALID_LEVEL,
      priceFractionPolicy: 'IDX_STANDARD_V1',
      calculationRuleVersion: 'v1.0.0',
      candles,
    });

    expect(result.status).toBe(EvaluationStatus.COMPLETED);
    expect(result.exitReason).toBe(ExitReason.MARKET_CLOSE);
    expect(result.actualExitPrice).toBe(108);
    expect(result.realizedReturn).toBe(8);
    expect(result.highestPrice).toBe(109);
    expect(result.evidence.triggerCandleIndex).toBe(2);
  });

  it('Scenario 5: should obey Chronological Integrity: no later candles processed after exit', () => {
    const candles = [
      createCandle(0, 100, 100, 96, 97), // Hits initial stop in first minute!
      createCandle(1, 97, 120, 97, 120), // Huge rally afterward
      createCandle(2, 120, 150, 120, 145),
    ];

    const result = engine.evaluate({
      pickId: 'pick-5',
      symbol: 'BBCA',
      entryPrice: 100,
      initialStopPct: 0.03,
      trailingStopPct: 0.03,
      candleAmbiguityPolicy: CandleAmbiguityPolicy.CONSERVATIVE_LOSS_FIRST,
      gapPolicy: GapPolicy.ACTUAL_FIRST_VALID_LEVEL,
      priceFractionPolicy: 'IDX_STANDARD_V1',
      calculationRuleVersion: 'v1.0.0',
      candles,
    });

    expect(result.exitReason).toBe(ExitReason.INITIAL_CL);
    expect(result.actualExitPrice).toBe(97);
    expect(result.highestPrice).toBe(100); // Does NOT record the later 150 peak!
    expect(result.evidence.triggerCandleIndex).toBe(0);
  });

  it('Scenario 6: should enforce IDX tick size tier >= 5000 (tick = 25)', () => {
    // Entry: 10,000 (BBCA tier)
    // Initial CL 3% -> Threshold: 10000 * 0.97 = 9,700
    // In minute 1: drops to 9675 (valid IDX tick multiple of 25)
    const candles = [createCandle(0, 10000, 10050, 9675, 9725)];

    const result = engine.evaluate({
      pickId: 'pick-6',
      symbol: 'BBCA',
      entryPrice: 10000,
      initialStopPct: 0.03,
      trailingStopPct: 0.03,
      candleAmbiguityPolicy: CandleAmbiguityPolicy.CONSERVATIVE_LOSS_FIRST,
      gapPolicy: GapPolicy.ACTUAL_FIRST_VALID_LEVEL,
      priceFractionPolicy: 'IDX_STANDARD_V1',
      calculationRuleVersion: 'v1.0.0',
      candles,
    });

    expect(result.exitReason).toBe(ExitReason.INITIAL_CL);
    expect(result.actualExitPrice).toBe(9700);
    expect(result.realizedReturn).toBe(-3);
  });

  it('Scenario 7: should return PENDING_DATA if no candles are provided', () => {
    const result = engine.evaluate({
      pickId: 'pick-7',
      symbol: 'BBCA',
      entryPrice: 100,
      initialStopPct: 0.03,
      trailingStopPct: 0.03,
      candleAmbiguityPolicy: CandleAmbiguityPolicy.CONSERVATIVE_LOSS_FIRST,
      gapPolicy: GapPolicy.ACTUAL_FIRST_VALID_LEVEL,
      priceFractionPolicy: 'IDX_STANDARD_V1',
      calculationRuleVersion: 'v1.0.0',
      candles: [],
    });

    expect(result.status).toBe(EvaluationStatus.PENDING_DATA);
  });
});
