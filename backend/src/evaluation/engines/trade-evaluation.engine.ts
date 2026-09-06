import { Injectable } from '@nestjs/common';
import {
  EvaluationStatus,
  ExitReason,
  CandleAmbiguityPolicy,
} from '@prisma/client';
import { PriceFractionService } from '../services/price-fraction.service';
import {
  EvaluationInput,
  EvaluationOutput,
  EvaluationTimelineStep,
} from '../interfaces/evaluation.interface';

@Injectable()
export class TradeEvaluationEngine {
  constructor(private readonly priceFractionService: PriceFractionService) {}

  /**
   * Evaluates a single stock pick deterministically against 1-minute canonical intraday candles.
   *
   * Core Rules Enforced:
   * 1. Initial Cut Loss (-3% minimum threshold).
   * 2. Trailing Stop (-3% static drawdown from highest valid peak price).
   * 3. Price Fraction / Tick Policy (actual exchange price levels, e.g. 105 instead of 105.73).
   * 4. Gap Policy (actual traded level on gap down open).
   * 5. Candle Ambiguity Policy (CONSERVATIVE_LOSS_FIRST as default).
   * 6. Chronological Processing: Once exit is triggered, all later candles are ignored.
   * 7. Market Close Fallback: If no stop triggered, position exits at official close of last candle.
   */
  evaluate(input: EvaluationInput): EvaluationOutput {
    const {
      pickId,
      entryPrice,
      initialStopPct,
      trailingStopPct,
      candleAmbiguityPolicy,
      gapPolicy,
      priceFractionPolicy,
      calculationRuleVersion,
      candles,
    } = input;

    // Safety checks
    if (!candles || candles.length === 0) {
      return this.createPendingDataOutput(
        pickId,
        entryPrice,
        calculationRuleVersion,
      );
    }

    if (entryPrice <= 0) {
      return this.createReviewRequiredOutput(
        pickId,
        entryPrice,
        calculationRuleVersion,
        'Invalid entry price (non-positive)',
      );
    }

    let highestPrice = entryPrice;
    const initialStopThreshold = entryPrice * (1 - initialStopPct);
    let currentStopThreshold = initialStopThreshold;

    let isClosed = false;
    let exitPrice = 0;
    let exitTimestamp = candles[0].timestamp;
    let exitReason: ExitReason = ExitReason.INITIAL_CL;
    let triggerCandleIndex = -1;
    let triggerCandle = candles[0];
    let theoreticalThresholdAtExit = currentStopThreshold;

    const timeline: EvaluationTimelineStep[] = [];

    // Process candles in strict chronological order
    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];
      const open = Number(candle.open);
      const high = Number(candle.high);
      const low = Number(candle.low);
      const close = Number(candle.close);

      // Record step in timeline for auditable evidence
      timeline.push({
        minute: i + 1,
        timestamp:
          candle.timestamp instanceof Date
            ? candle.timestamp.toISOString()
            : new Date(candle.timestamp).toISOString(),
        open,
        high,
        low,
        close,
        peak: highestPrice,
        currentThreshold: Number(currentStopThreshold.toFixed(4)),
      });

      // 1. Check Gap Down Open
      // If market opens directly at or below the stop threshold, exit immediately at open
      if (open <= currentStopThreshold) {
        theoreticalThresholdAtExit = currentStopThreshold;
        exitPrice = this.priceFractionService.resolveExitPrice({
          theoreticalThreshold: currentStopThreshold,
          candleOpen: open,
          candleLow: low,
          gapPolicy,
        });
        exitTimestamp =
          candle.timestamp instanceof Date
            ? candle.timestamp
            : new Date(candle.timestamp);
        exitReason =
          highestPrice <= entryPrice
            ? ExitReason.INITIAL_CL
            : ExitReason.TRAILING_STOP;
        triggerCandleIndex = i;
        triggerCandle = candle;
        isClosed = true;
        break; // Stop processing later candles!
      }

      // 2. Intra-candle evaluation based on Ambiguity Policy
      if (candleAmbiguityPolicy === CandleAmbiguityPolicy.HIGH_FIRST) {
        // Aggressive profit first: check high first, then check low
        if (high > highestPrice) {
          highestPrice = high;
          const trailingThreshold = highestPrice * (1 - trailingStopPct);
          currentStopThreshold = Math.max(
            initialStopThreshold,
            trailingThreshold,
          );
        }

        if (low <= currentStopThreshold) {
          theoreticalThresholdAtExit = currentStopThreshold;
          exitPrice = this.priceFractionService.resolveExitPrice({
            theoreticalThreshold: currentStopThreshold,
            candleOpen: open,
            candleLow: low,
            gapPolicy,
          });
          exitTimestamp =
            candle.timestamp instanceof Date
              ? candle.timestamp
              : new Date(candle.timestamp);
          exitReason =
            highestPrice <= entryPrice
              ? ExitReason.INITIAL_CL
              : ExitReason.TRAILING_STOP;
          triggerCandleIndex = i;
          triggerCandle = candle;
          isClosed = true;
          break; // Stop processing later candles!
        }
      } else {
        // Default: CONSERVATIVE_LOSS_FIRST (PRD Section 15)
        // Check if low breaches stop threshold first
        if (low <= currentStopThreshold) {
          theoreticalThresholdAtExit = currentStopThreshold;
          exitPrice = this.priceFractionService.resolveExitPrice({
            theoreticalThreshold: currentStopThreshold,
            candleOpen: open,
            candleLow: low,
            gapPolicy,
          });
          exitTimestamp =
            candle.timestamp instanceof Date
              ? candle.timestamp
              : new Date(candle.timestamp);
          exitReason =
            highestPrice <= entryPrice
              ? ExitReason.INITIAL_CL
              : ExitReason.TRAILING_STOP;
          triggerCandleIndex = i;
          triggerCandle = candle;
          isClosed = true;
          break; // Stop processing later candles!
        }

        // If stop was not triggered, register new peak and raise trailing stop
        if (high > highestPrice) {
          highestPrice = high;
          const trailingThreshold = highestPrice * (1 - trailingStopPct);
          currentStopThreshold = Math.max(
            initialStopThreshold,
            trailingThreshold,
          );
        }
      }
    }

    // 3. Market Close fallback if no stop triggered until the end of the session
    if (!isClosed) {
      const lastCandle = candles[candles.length - 1];
      const closePrice = Number(lastCandle.close);

      // If close breached stop at the very end
      if (closePrice <= currentStopThreshold) {
        theoreticalThresholdAtExit = currentStopThreshold;
        exitPrice = this.priceFractionService.resolveExitPrice({
          theoreticalThreshold: currentStopThreshold,
          candleOpen: Number(lastCandle.open),
          candleLow: Number(lastCandle.low),
          gapPolicy,
        });
        exitReason =
          highestPrice <= entryPrice
            ? ExitReason.INITIAL_CL
            : ExitReason.TRAILING_STOP;
      } else {
        exitPrice = this.priceFractionService.roundToValidTick(
          closePrice,
          'NEAREST',
        );
        exitReason = ExitReason.MARKET_CLOSE;
        theoreticalThresholdAtExit = currentStopThreshold;
      }

      exitTimestamp =
        lastCandle.timestamp instanceof Date
          ? lastCandle.timestamp
          : new Date(lastCandle.timestamp);
      triggerCandleIndex = candles.length - 1;
      triggerCandle = lastCandle;
    }

    // Calculate returns
    const realizedReturn = Number(
      (((exitPrice - entryPrice) / entryPrice) * 100).toFixed(4),
    );
    const maxFloatingReturn = Number(
      (((highestPrice - entryPrice) / entryPrice) * 100).toFixed(4),
    );

    const firstCandleDate = candles[0].tradingDate || '';

    return {
      pickId,
      status: EvaluationStatus.COMPLETED,
      entryPrice,
      exitPrice,
      exitTimestamp,
      exitReason,
      highestPrice,
      maxFloatingReturn,
      theoreticalThreshold: Number(theoreticalThresholdAtExit.toFixed(4)),
      actualExitPrice: exitPrice,
      realizedReturn,
      calculationVersion: calculationRuleVersion,
      evidence: {
        marketDataProvider: candles[0].provider || 'canonical',
        marketDataDate:
          typeof firstCandleDate === 'string'
            ? firstCandleDate.substring(0, 10)
            : new Date(firstCandleDate).toISOString().substring(0, 10),
        candleCount: candles.length,
        triggerCandleIndex,
        triggerCandleTimestamp: exitTimestamp.toISOString(),
        triggerCandle: {
          open: Number(triggerCandle.open),
          high: Number(triggerCandle.high),
          low: Number(triggerCandle.low),
          close: Number(triggerCandle.close),
        },
        priceFractionVersion: priceFractionPolicy,
        gapPolicy,
        ambiguityPolicy: candleAmbiguityPolicy,
        stepByStepTimeline: timeline.slice(
          Math.max(0, triggerCandleIndex - 10),
          triggerCandleIndex + 1,
        ),
      },
    };
  }

  private createPendingDataOutput(
    pickId: string,
    entryPrice: number,
    calculationVersion: string,
  ): EvaluationOutput {
    return {
      pickId,
      status: EvaluationStatus.PENDING_DATA,
      entryPrice,
      exitPrice: 0,
      exitTimestamp: new Date(),
      exitReason: ExitReason.MARKET_CLOSE,
      highestPrice: entryPrice,
      maxFloatingReturn: 0,
      theoreticalThreshold: 0,
      actualExitPrice: 0,
      realizedReturn: 0,
      calculationVersion,
      evidence: {
        marketDataProvider: 'none',
        marketDataDate: '',
        candleCount: 0,
        triggerCandleIndex: -1,
        triggerCandleTimestamp: new Date().toISOString(),
        triggerCandle: { open: 0, high: 0, low: 0, close: 0 },
        priceFractionVersion: 'IDX_STANDARD_V1',
        gapPolicy: 'ACTUAL_FIRST_VALID_LEVEL',
        ambiguityPolicy: 'CONSERVATIVE_LOSS_FIRST',
      },
    };
  }

  private createReviewRequiredOutput(
    pickId: string,
    entryPrice: number,
    calculationVersion: string,
    reason: string,
  ): EvaluationOutput {
    return {
      pickId,
      status: EvaluationStatus.REVIEW_REQUIRED,
      entryPrice,
      exitPrice: 0,
      exitTimestamp: new Date(),
      exitReason: ExitReason.MANUAL_OVERRIDE,
      highestPrice: entryPrice,
      maxFloatingReturn: 0,
      theoreticalThreshold: 0,
      actualExitPrice: 0,
      realizedReturn: 0,
      calculationVersion,
      evidence: {
        marketDataProvider: 'none',
        marketDataDate: '',
        candleCount: 0,
        triggerCandleIndex: -1,
        triggerCandleTimestamp: new Date().toISOString(),
        triggerCandle: { open: 0, high: 0, low: 0, close: 0 },
        priceFractionVersion: 'IDX_STANDARD_V1',
        gapPolicy: 'ACTUAL_FIRST_VALID_LEVEL',
        ambiguityPolicy: 'CONSERVATIVE_LOSS_FIRST',
        reviewNotes: reason,
      },
    };
  }
}
