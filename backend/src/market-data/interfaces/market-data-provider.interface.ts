export interface NormalizedCandle {
  symbol: string;
  tradingDate: string; // Format YYYY-MM-DD
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: bigint | number;
  provider: string;
}

export interface GetIntradayCandlesParams {
  symbol: string;
  tradingDate: string; // Format YYYY-MM-DD
  interval?: '1m';
}

export interface MarketDataProvider {
  readonly providerName: string;

  getIntradayCandles(
    params: GetIntradayCandlesParams,
  ): Promise<NormalizedCandle[]>;
}

export const MARKET_DATA_PROVIDER = 'MARKET_DATA_PROVIDER';
