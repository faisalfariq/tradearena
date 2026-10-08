import { Injectable, Logger } from '@nestjs/common';
import {
  MarketDataProvider,
  GetIntradayCandlesParams,
  NormalizedCandle,
} from '../interfaces/market-data-provider.interface';
import { CandleNormalizer } from '../utils/candle-normalizer';
import { MockMarketDataProvider } from './mock-market-data.provider';

@Injectable()
export class YahooMarketDataProvider implements MarketDataProvider {
  readonly providerName = 'idx_yahoo_finance';
  private readonly logger = new Logger(YahooMarketDataProvider.name);

  constructor(private readonly mockFallback: MockMarketDataProvider) {}

  async getIntradayCandles(
    params: GetIntradayCandlesParams,
  ): Promise<NormalizedCandle[]> {
    const { symbol, tradingDate } = params;
    const cleanSymbol = symbol.trim().toUpperCase();
    const dateStr = tradingDate.substring(0, 10);
    const symbolJk = `${cleanSymbol}.JK`;

    this.logger.log(
      `[YahooMarketDataProvider] Fetching real IDX 1-minute intraday candles for ${symbolJk} on ${dateStr}...`,
    );

    try {
      // Request 1-minute interval candles for the last 5 days from Yahoo Finance
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
        symbolJk,
      )}?interval=1m&range=5d`;

      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(
          `Yahoo Finance HTTP error: ${res.status} ${res.statusText}`,
        );
      }

      const data = await res.json();
      const chartResult = data?.chart?.result?.[0];

      if (
        chartResult &&
        chartResult.timestamp &&
        chartResult.timestamp.length > 0 &&
        chartResult.indicators?.quote?.[0]
      ) {
        const quote = chartResult.indicators.quote[0];
        const timestamps: number[] = chartResult.timestamp;
        const rawCandles: NormalizedCandle[] = [];

        for (let i = 0; i < timestamps.length; i++) {
          const tSec = timestamps[i];
          const dt = new Date(tSec * 1000);

          // Format date in Asia/Jakarta (WIB) timezone
          const wibDateStr = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Jakarta',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(dt);

          // Only collect candles belonging to the requested trading date
          if (wibDateStr !== dateStr) {
            continue;
          }

          const open = quote.open[i];
          const high = quote.high[i];
          const low = quote.low[i];
          const close = quote.close[i];

          // Skip if missing price data (null/undefined/NaN)
          if (
            open == null ||
            high == null ||
            low == null ||
            close == null ||
            isNaN(open) ||
            isNaN(close)
          ) {
            continue;
          }

          const vol = quote.volume?.[i];

          rawCandles.push({
            symbol: cleanSymbol,
            tradingDate: dateStr,
            timestamp: dt,
            open: Math.round(Number(open)),
            high: Math.round(Number(high)),
            low: Math.round(Number(low)),
            close: Math.round(Number(close)),
            volume: vol != null && !isNaN(vol) ? BigInt(Math.round(Number(vol))) : undefined,
            provider: this.providerName,
          });
        }

        if (rawCandles.length > 0) {
          this.logger.log(
            `[YahooMarketDataProvider] Successfully parsed ${rawCandles.length} real 1m candles for ${cleanSymbol} on ${dateStr}`,
          );
          return CandleNormalizer.normalize(rawCandles);
        } else {
          this.logger.warn(
            `[YahooMarketDataProvider] No 1m candles found matching date ${dateStr} for ${cleanSymbol}. Falling back to simulation...`,
          );
        }
      } else {
        this.logger.warn(
          `[YahooMarketDataProvider] Empty result from Yahoo Finance for ${cleanSymbol}. Falling back to simulation...`,
        );
      }
    } catch (err: any) {
      this.logger.error(
        `[YahooMarketDataProvider] Failed fetching real market data for ${cleanSymbol}: ${err.message}. Using simulation fallback.`,
      );
    }

    // Fallback to mock simulation provider if Yahoo Finance does not have candles for this date
    return this.mockFallback.getIntradayCandles(params);
  }
}
