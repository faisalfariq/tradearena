import { PointsEngine } from './points.engine';

describe('PointsEngine', () => {
  let engine: PointsEngine;

  beforeEach(() => {
    engine = new PointsEngine();
  });

  describe('PERCENTAGE_RETURN_V1 (Default)', () => {
    it('should map realized return 1:1 to tournament points', () => {
      const result = engine.calculatePoints({
        evaluationId: 'eval-1',
        realizedReturn: 2.5412,
        exitReason: 'MARKET_CLOSE',
        pointsRule: 'PERCENTAGE_RETURN_V1',
      });

      expect(result.points).toBe(2.5412);
      expect(result.pointsRule).toBe('PERCENTAGE_RETURN_V1');
      expect(result.pointsRuleVersion).toBe('v1.0.0');
    });

    it('should correctly handle negative return', () => {
      const result = engine.calculatePoints({
        evaluationId: 'eval-2',
        realizedReturn: -3.05,
        exitReason: 'INITIAL_CL',
        pointsRule: 'PERCENTAGE_RETURN_V1',
      });

      expect(result.points).toBe(-3.05);
    });

    it('should fallback to PERCENTAGE_RETURN_V1 if unknown rule provided', () => {
      const result = engine.calculatePoints({
        evaluationId: 'eval-3',
        realizedReturn: 1.2,
        exitReason: 'TRAILING_STOP',
        pointsRule: 'UNKNOWN_CUSTOM_RULE',
      });

      expect(result.points).toBe(1.2);
      expect(result.pointsRule).toBe('PERCENTAGE_RETURN_V1');
    });
  });

  describe('ASYMMETRIC_RISK_REWARD_V1', () => {
    it('should grant 1.5x multiplier for gains greater than 3.0%', () => {
      const result = engine.calculatePoints({
        evaluationId: 'eval-4',
        realizedReturn: 4.0,
        exitReason: 'TRAILING_STOP',
        pointsRule: 'ASYMMETRIC_RISK_REWARD_V1',
      });

      // 4.0 * 1.5 = 6.0
      expect(result.points).toBe(6.0);
      expect(result.pointsRule).toBe('ASYMMETRIC_RISK_REWARD_V1');
    });

    it('should keep standard points for moderate returns (0% to 3%)', () => {
      const result = engine.calculatePoints({
        evaluationId: 'eval-5',
        realizedReturn: 2.0,
        exitReason: 'MARKET_CLOSE',
        pointsRule: 'ASYMMETRIC_RISK_REWARD_V1',
      });

      expect(result.points).toBe(2.0);
    });

    it('should apply floor penalty on INITIAL_CL', () => {
      const result = engine.calculatePoints({
        evaluationId: 'eval-6',
        realizedReturn: -3.5,
        exitReason: 'INITIAL_CL',
        pointsRule: 'ASYMMETRIC_RISK_REWARD_V1',
      });

      expect(result.points).toBe(-3.5);
    });
  });

  describe('RANK_BASED_DAILY_V1', () => {
    it('should assign 10 points to Rank 1', () => {
      const result = engine.calculatePoints({
        evaluationId: 'eval-7',
        realizedReturn: 5.0,
        exitReason: 'TRAILING_STOP',
        pointsRule: 'RANK_BASED_DAILY_V1',
        rankInDay: 1,
      });

      expect(result.points).toBe(10);
    });

    it('should assign 8 points to Rank 2', () => {
      const result = engine.calculatePoints({
        evaluationId: 'eval-8',
        realizedReturn: 3.5,
        exitReason: 'MARKET_CLOSE',
        pointsRule: 'RANK_BASED_DAILY_V1',
        rankInDay: 2,
      });

      expect(result.points).toBe(8);
    });

    it('should assign 0 points if return is negative', () => {
      const result = engine.calculatePoints({
        evaluationId: 'eval-9',
        realizedReturn: -1.5,
        exitReason: 'INITIAL_CL',
        pointsRule: 'RANK_BASED_DAILY_V1',
        rankInDay: 5,
      });

      expect(result.points).toBe(0);
    });
  });

  describe('Manual Override Handling', () => {
    it('should prioritize override points if provided', () => {
      const result = engine.calculatePoints({
        evaluationId: 'eval-10',
        realizedReturn: 1.0,
        exitReason: 'MARKET_CLOSE',
        pointsRule: 'PERCENTAGE_RETURN_V1',
        overridePoints: 5.5,
      });

      expect(result.points).toBe(5.5);
      expect(result.pointsRule).toBe('MANUAL_OVERRIDE');
    });
  });
});
