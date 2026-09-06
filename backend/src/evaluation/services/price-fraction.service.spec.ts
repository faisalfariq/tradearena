import { PriceFractionService } from './price-fraction.service';

describe('PriceFractionService', () => {
  let service: PriceFractionService;

  beforeEach(() => {
    service = new PriceFractionService();
  });

  describe('getTickSize', () => {
    it('should return tick 1 for prices < Rp 200', () => {
      expect(service.getTickSize(50)).toBe(1);
      expect(service.getTickSize(199)).toBe(1);
    });

    it('should return tick 2 for prices between Rp 200 and < Rp 500', () => {
      expect(service.getTickSize(200)).toBe(2);
      expect(service.getTickSize(350)).toBe(2);
      expect(service.getTickSize(498)).toBe(2);
    });

    it('should return tick 5 for prices between Rp 500 and < Rp 2,000', () => {
      expect(service.getTickSize(500)).toBe(5);
      expect(service.getTickSize(1250)).toBe(5);
      expect(service.getTickSize(1995)).toBe(5);
    });

    it('should return tick 10 for prices between Rp 2,000 and < Rp 5,000', () => {
      expect(service.getTickSize(2000)).toBe(10);
      expect(service.getTickSize(3840)).toBe(10);
      expect(service.getTickSize(4990)).toBe(10);
    });

    it('should return tick 25 for prices >= Rp 5,000', () => {
      expect(service.getTickSize(5000)).toBe(25);
      expect(service.getTickSize(9250)).toBe(25);
      expect(service.getTickSize(25000)).toBe(25);
    });
  });

  describe('roundToValidTick', () => {
    it('should floor to valid level when direction is DOWN', () => {
      // Below 200 (tick 1): 105.73 -> 105
      expect(service.roundToValidTick(105.73, 'DOWN')).toBe(105);

      // 500 - 2000 (tick 5): 1023 -> 1020
      expect(service.roundToValidTick(1023, 'DOWN')).toBe(1020);

      // >= 5000 (tick 25): 9140 -> 9125
      expect(service.roundToValidTick(9140, 'DOWN')).toBe(9125);
    });

    it('should ceil to valid level when direction is UP', () => {
      expect(service.roundToValidTick(105.1, 'UP')).toBe(106);
      expect(service.roundToValidTick(1021, 'UP')).toBe(1025);
      expect(service.roundToValidTick(9130, 'UP')).toBe(9150);
    });
  });

  describe('resolveExitPrice', () => {
    it('should match PRD Section 8 example: Peak 109, TS 3% -> Threshold 105.73 -> Exit 105', () => {
      const exitPrice = service.resolveExitPrice({
        theoreticalThreshold: 105.73,
        candleOpen: 107,
        candleLow: 104,
        gapPolicy: 'ACTUAL_FIRST_VALID_LEVEL',
      });

      // Valid levels are 106 and 105. At 106 drawdown < 3%, at 105 drawdown >= 3%.
      // Exit must be 105!
      expect(exitPrice).toBe(105);
    });

    it('should respect gap down open below threshold when gapPolicy is ACTUAL_FIRST_VALID_LEVEL', () => {
      // Entry 100, Initial CL 3% -> Threshold 97.
      // Next morning gap down open at 95.
      const exitPrice = service.resolveExitPrice({
        theoreticalThreshold: 97,
        candleOpen: 95,
        candleLow: 94,
        gapPolicy: 'ACTUAL_FIRST_VALID_LEVEL',
      });

      // Must execute at candle open 95, NOT artificially clamped to 97!
      expect(exitPrice).toBe(95);
    });

    it('should clamp to threshold level if gapPolicy is THEORETICAL_THRESHOLD', () => {
      const exitPrice = service.resolveExitPrice({
        theoreticalThreshold: 97,
        candleOpen: 95,
        candleLow: 94,
        gapPolicy: 'THEORETICAL_THRESHOLD',
      });

      expect(exitPrice).toBe(97);
    });
  });
});
