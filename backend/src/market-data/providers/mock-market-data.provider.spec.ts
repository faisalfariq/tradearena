import { MockMarketDataProvider } from './mock-market-data.provider';

describe('MockMarketDataProvider', () => {
  let provider: MockMarketDataProvider;

  beforeEach(() => {
    provider = new MockMarketDataProvider();
  });

  it('should be defined with providerName "mock"', () => {
    expect(provider).toBeDefined();
    expect(provider.providerName).toBe('mock');
  });

  it('should generate expected number of 1-minute intraday bars for IDX market sessions', async () => {
    const candles = await provider.getIntradayCandles({
      symbol: 'BBCA',
      tradingDate: '2026-09-05',
    });

    // Session 1 (180 mins) + Session 2 & Close (150 mins) = 330 1-minute bars
    expect(candles).toHaveLength(330);
    expect(candles[0].symbol).toBe('BBCA');
    expect(candles[0].tradingDate).toBe('2026-09-05');
    expect(candles[0].open).toBeGreaterThan(0);
  });

  it('should be deterministic: same symbol and date produce identical candles', async () => {
    const run1 = await provider.getIntradayCandles({
      symbol: 'TLKM',
      tradingDate: '2026-09-05',
    });

    const run2 = await provider.getIntradayCandles({
      symbol: 'TLKM',
      tradingDate: '2026-09-05',
    });

    expect(run1).toHaveLength(run2.length);
    expect(run1[0].open).toBe(run2[0].open);
    expect(run1[100].close).toBe(run2[100].close);
    expect(run1[329].close).toBe(run2[329].close);
  });
});
