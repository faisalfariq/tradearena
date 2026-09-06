import { Injectable } from '@nestjs/common';
import {
  MarketDataProvider,
  GetIntradayCandlesParams,
  NormalizedCandle,
} from '../interfaces/market-data-provider.interface';
import { CandleNormalizer } from '../utils/candle-normalizer';

@Injectable()
export class MockMarketDataProvider implements MarketDataProvider {
  readonly providerName = 'mock';

  // Base starting prices for common IDX stocks
  private readonly defaultBasePrices: Record<string, number> = {
    BBCA: 10250,
    BBRI: 5100,
    BMRI: 7150,
    BBNI: 5650,
    TLKM: 2950,
    ASII: 5100,
    AMMN: 10300,
    GOTO: 64,
    ADRO: 3750,
    BRIS: 3050,
    UNTR: 27500,
    ICBP: 12150,
    KLBF: 1680,
    PGAS: 1540,
    CPIN: 5100,
  };

  /**
   * Deterministic pseudo-random number generator based on string seed (symbol + date).
   */
  private createSeededRandom(seedStr: string): () => number {
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = (hash << 5) - hash + seedStr.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }

    return () => {
      hash = Math.sin(hash++) * 10000;
      return hash - Math.floor(hash);
    };
  }

  async getIntradayCandles(
    params: GetIntradayCandlesParams,
  ): Promise<NormalizedCandle[]> {
    const { symbol, tradingDate } = params;
    const cleanSymbol = symbol.trim().toUpperCase();
    const dateStr = tradingDate.substring(0, 10);

    const random = this.createSeededRandom(`${cleanSymbol}_${dateStr}`);
    let currentPrice = this.defaultBasePrices[cleanSymbol] || 1500;

    const rawCandles: NormalizedCandle[] = [];

    // Session 1: 09:00 - 12:00 WIB = 02:00 - 05:00 UTC (180 minutes)
    // Session 2: 13:30 - 15:50 WIB = 06:30 - 08:50 UTC (140 minutes)
    // Pre-close: 15:50 - 16:00 WIB = 08:50 - 09:00 UTC (10 minutes)
    const sessionIntervals = [
      { startHourUTC: 2, startMinuteUTC: 0, count: 180 }, // Session 1
      { startHourUTC: 6, startMinuteUTC: 30, count: 150 }, // Session 2 + Close
    ];

    const [year, month, day] = dateStr.split('-').map(Number);

    for (const session of sessionIntervals) {
      for (let i = 0; i < session.count; i++) {
        const totalMinutes =
          session.startHourUTC * 60 + session.startMinuteUTC + i;
        const hour = Math.floor(totalMinutes / 60);
        const minute = totalMinutes % 60;

        const candleTime = new Date(
          Date.UTC(year, month - 1, day, hour, minute, 0, 0),
        );

        // Generate realistic 1-minute random price movement (-0.3% to +0.3%)
        const deltaPct = (random() - 0.495) * 0.006;
        const open = currentPrice;
        const close = Math.round(open * (1 + deltaPct));

        // Realistic intraday high and low wicks
        const maxOC = Math.max(open, close);
        const minOC = Math.min(open, close);
        const highWick = Math.round(open * (random() * 0.002));
        const lowWick = Math.round(open * (random() * 0.002));

        const high = maxOC + highWick;
        const low = Math.max(1, minOC - lowWick);
        const volume = BigInt(Math.floor(1000 + random() * 50000));

        rawCandles.push({
          symbol: cleanSymbol,
          tradingDate: dateStr,
          timestamp: candleTime,
          open,
          high,
          low,
          close,
          volume,
          provider: this.providerName,
        });

        currentPrice = close;
      }
    }

    return CandleNormalizer.normalize(rawCandles);
  }
}
