import { NormalizedCandle } from '../interfaces/market-data-provider.interface';

export class CandleNormalizer {
  /**
   * Normalizes, validates, and sorts raw intraday candles.
   * Enforces integrity: high >= open/close >= low, positive prices,
   * deduplicates timestamps, and orders chronologically ascending.
   */
  static normalize(candles: NormalizedCandle[]): NormalizedCandle[] {
    if (!candles || candles.length === 0) {
      return [];
    }

    const timestampMap = new Map<number, NormalizedCandle>();

    for (const raw of candles) {
      // Validate positive numeric prices
      const open = Number(raw.open);
      const close = Number(raw.close);
      const high = Number(raw.high);
      const low = Number(raw.low);

      if (
        isNaN(open) ||
        isNaN(close) ||
        isNaN(high) ||
        isNaN(low) ||
        open <= 0 ||
        close <= 0 ||
        high <= 0 ||
        low <= 0
      ) {
        continue; // Skip invalid non-positive or corrupted price data
      }

      // Enforce physical OHLC candle geometry
      const actualHigh = Math.max(open, high, low, close);
      const actualLow = Math.min(open, high, low, close);

      const timestamp =
        raw.timestamp instanceof Date ? raw.timestamp : new Date(raw.timestamp);

      if (isNaN(timestamp.getTime())) {
        continue; // Skip invalid timestamp
      }

      const normalized: NormalizedCandle = {
        symbol: raw.symbol.trim().toUpperCase(),
        tradingDate: raw.tradingDate.substring(0, 10),
        timestamp,
        open,
        high: actualHigh,
        low: actualLow,
        close,
        volume: raw.volume !== undefined ? raw.volume : 0,
        provider: raw.provider || 'canonical',
      };

      // In case of duplicate timestamp for the same symbol, keep the latest
      timestampMap.set(timestamp.getTime(), normalized);
    }

    // Sort chronologically ascending
    return Array.from(timestampMap.values()).sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
  }
}
