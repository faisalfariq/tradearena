import { Injectable } from '@nestjs/common';
import {
  PointsCalculationInput,
  PointsCalculationResult,
} from '../interfaces/points.interface';

@Injectable()
export class PointsEngine {
  /**
   * Calculates tournament points from a trade evaluation.
   * Decoupled from market data and evaluation engine per PRD Section 21 & 23.
   */
  calculatePoints(input: PointsCalculationInput): PointsCalculationResult {
    const {
      realizedReturn,
      exitReason,
      pointsRule,
      pointsRuleVersion = 'v1.0.0',
      overridePoints,
      rankInDay = 1,
    } = input;

    // 1. If manual override points are present, honor them directly
    if (overridePoints !== undefined && overridePoints !== null) {
      return {
        points: Number(Number(overridePoints).toFixed(4)),
        pointsRule: 'MANUAL_OVERRIDE',
        pointsRuleVersion,
      };
    }

    const ruleNormalized = (pointsRule || 'PERCENTAGE_RETURN_V1').toUpperCase();

    switch (ruleNormalized) {
      case 'ASYMMETRIC_RISK_REWARD_V1':
        return this.calculateAsymmetricPoints(
          realizedReturn,
          exitReason,
          pointsRuleVersion,
        );

      case 'RANK_BASED_DAILY_V1':
        return this.calculateRankBasedPoints(
          realizedReturn,
          rankInDay,
          pointsRuleVersion,
        );

      case 'PERCENTAGE_RETURN_V1':
      default:
        return this.calculatePercentagePoints(
          realizedReturn,
          pointsRuleVersion,
        );
    }
  }

  /**
   * Rule: PERCENTAGE_RETURN_V1 (Default BSJP Standard)
   * 1.0000% realized return = 1.0000 tournament points.
   */
  private calculatePercentagePoints(
    realizedReturn: number,
    version: string,
  ): PointsCalculationResult {
    return {
      points: Number(Number(realizedReturn).toFixed(4)),
      pointsRule: 'PERCENTAGE_RETURN_V1',
      pointsRuleVersion: version,
    };
  }

  /**
   * Rule: ASYMMETRIC_RISK_REWARD_V1
   * High reward incentive: +1.5x multiplier for gains > +3.0%.
   * Defined risk penalty: flat -3.0000 for INITIAL_CL.
   */
  private calculateAsymmetricPoints(
    realizedReturn: number,
    exitReason: string,
    version: string,
  ): PointsCalculationResult {
    let points: number;

    if (realizedReturn > 3.0) {
      points = realizedReturn * 1.5;
    } else if (exitReason === 'INITIAL_CL' && realizedReturn < 0) {
      points = Math.min(-3.0, realizedReturn);
    } else {
      points = realizedReturn;
    }

    return {
      points: Number(points.toFixed(4)),
      pointsRule: 'ASYMMETRIC_RISK_REWARD_V1',
      pointsRuleVersion: version,
    };
  }

  /**
   * Rule: RANK_BASED_DAILY_V1
   * Allocates points based on daily ranking order.
   * Rank 1: 10, Rank 2: 8, Rank 3: 6, Rank 4: 5, Rank 5: 4, Rank 6: 3, Rank 7: 2, Rank 8+: 1.
   * If negative return, score is 0.
   */
  private calculateRankBasedPoints(
    realizedReturn: number,
    rank: number,
    version: string,
  ): PointsCalculationResult {
    if (realizedReturn < 0) {
      return {
        points: 0,
        pointsRule: 'RANK_BASED_DAILY_V1',
        pointsRuleVersion: version,
      };
    }

    const rankPointsMap: Record<number, number> = {
      1: 10,
      2: 8,
      3: 6,
      4: 5,
      5: 4,
      6: 3,
      7: 2,
    };

    const points = rankPointsMap[rank] ?? 1;

    return {
      points: Number(points.toFixed(4)),
      pointsRule: 'RANK_BASED_DAILY_V1',
      pointsRuleVersion: version,
    };
  }
}
