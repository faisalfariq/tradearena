import { CandleNormalizer } from './utils/candle-normalizer';
import { NormalizedCandle } from './interfaces/market-data-provider.interface';

describe('CandleNormalizer', () => {
  it('should return an empty array if input is empty or null', () => {
    expect(CandleNormalizer.normalize([])).toEqual([]);
    expect(CandleNormalizer.normalize(null as any)).toEqual([]);
  });

  it('should enforce OHLC integrity: high is highest, low is lowest', () => {
    const raw: NormalizedCandle[] = [
      {
        symbol: 'bbca',
        tradingDate: '2026-09-05',
        timestamp: new Date('2026-09-05T09:00:00.000Z'),
        open: 10000,
        high: 9500, // Invalid: high lower than open
        low: 10500, // Invalid: low higher than open
        close: 10200,
        provider: 'test',
      },
    ];

    const result = CandleNormalizer.normalize(raw);
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('BBCA');
    expect(result[0].high).toBe(10500); // Corrected to max
    expect(result[0].low).toBe(9500); // Corrected to min
    expect(result[0].open).toBe(10000);
    expect(result[0].close).toBe(10200);
  });

  it('should filter out invalid non-positive or corrupted prices', () => {
    const raw: NormalizedCandle[] = [
      {
        symbol: 'BBCA',
        tradingDate: '2026-09-05',
        timestamp: new Date('2026-09-05T09:00:00.000Z'),
        open: -100, // Invalid negative
        high: 100,
        low: 50,
        close: 80,
        provider: 'test',
      },
      {
        symbol: 'BBCA',
        tradingDate: '2026-09-05',
        timestamp: new Date('2026-09-05T09:01:00.000Z'),
        open: 100,
        high: 110,
        low: 90,
        close: 105,
        provider: 'test',
      },
    ];

    const result = CandleNormalizer.normalize(raw);
    expect(result).toHaveLength(1);
    expect(result[0].timestamp).toEqual(new Date('2026-09-05T09:01:00.000Z'));
  });

  it('should deduplicate identical timestamps and sort chronologically ascending', () => {
    const time1 = new Date('2026-09-05T09:01:00.000Z');
    const time2 = new Date('2026-09-05T09:00:00.000Z');

    const raw: NormalizedCandle[] = [
      {
        symbol: 'BBCA',
        tradingDate: '2026-09-05',
        timestamp: time1,
        open: 10100,
        high: 10150,
        low: 10050,
        close: 10120,
        provider: 'test',
      },
      {
        symbol: 'BBCA',
        tradingDate: '2026-09-05',
        timestamp: time2,
        open: 10000,
        high: 10050,
        low: 9950,
        close: 10020,
        provider: 'test',
      },
      {
        // Duplicate of time2 with updated close
        symbol: 'BBCA',
        tradingDate: '2026-09-05',
        timestamp: time2,
        open: 10000,
        high: 10080,
        low: 9950,
        close: 10060,
        provider: 'test',
      },
    ];

    const result = CandleNormalizer.normalize(raw);
    expect(result).toHaveLength(2);
    // Should be sorted time2 first, then time1
    expect(result[0].timestamp.getTime()).toBe(time2.getTime());
    expect(result[1].timestamp.getTime()).toBe(time1.getTime());
    // Should keep latest update for time2
    expect(result[0].close).toBe(10060);
  });
});
