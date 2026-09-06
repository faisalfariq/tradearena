import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MarketDataProvider,
  GetIntradayCandlesParams,
  NormalizedCandle,
} from '../interfaces/market-data-provider.interface';
import { CandleNormalizer } from '../utils/candle-normalizer';

@Injectable()
export class HttpMarketDataProvider implements MarketDataProvider {
  readonly providerName = 'http';
  private readonly logger = new Logger(HttpMarketDataProvider.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('MARKET_DATA_BASE_URL') || '';
    this.apiKey = this.config.get<string>('MARKET_DATA_API_KEY') || '';
  }

  async getIntradayCandles(
    params: GetIntradayCandlesParams,
  ): Promise<NormalizedCandle[]> {
    const { symbol, tradingDate, interval = '1m' } = params;

    if (!this.baseUrl) {
      throw new Error(
        `[HttpMarketDataProvider] MARKET_DATA_BASE_URL belum dikonfigurasi pada environment`,
      );
    }

    const url = `${this.baseUrl}/candles?symbol=${encodeURIComponent(
      symbol,
    )}&date=${encodeURIComponent(tradingDate)}&interval=${interval}`;

    const response = await fetch(url, {
      headers: {
        ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(
        `Failed to fetch candles from ${url}: Status ${response.status} - ${errorText}`,
      );
      throw new Error(
        `Gagal mengambil data market dari provider eksternal (${response.status})`,
      );
    }

    const rawData = await response.json();

    // Expecting array of candle objects or standard OHLC array
    const rawCandles: NormalizedCandle[] = (rawData.candles || rawData).map(
      (c: any) => ({
        symbol: symbol.toUpperCase(),
        tradingDate: tradingDate.substring(0, 10),
        timestamp: new Date(c.timestamp || c.time || c.t),
        open: Number(c.open || c.o),
        high: Number(c.high || c.h),
        low: Number(c.low || c.l),
        close: Number(c.close || c.c),
        volume: c.volume !== undefined ? BigInt(c.volume) : undefined,
        provider: this.providerName,
      }),
    );

    return CandleNormalizer.normalize(rawCandles);
  }
}
