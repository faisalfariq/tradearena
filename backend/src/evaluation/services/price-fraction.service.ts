import { Injectable } from '@nestjs/common';

export interface TickRule {
  minPrice: number;
  maxPrice: number;
  tickSize: number;
  maxStep: number;
}

@Injectable()
export class PriceFractionService {
  /**
   * Official Indonesia Stock Exchange (IDX / BEI) Price Fractions (Fraksi Harga)
   * Rule standard: IDX_STANDARD_V1
   *
   * Kelompok 1: Harga < Rp 200            -> Fraksi = Rp 1
   * Kelompok 2: Harga Rp 200 - < Rp 500   -> Fraksi = Rp 2
   * Kelompok 3: Harga Rp 500 - < Rp 2.000 -> Fraksi = Rp 5
   * Kelompok 4: Harga Rp 2.000 - < Rp 5.000 -> Fraksi = Rp 10
   * Kelompok 5: Harga >= Rp 5.000         -> Fraksi = Rp 25
   */
  private readonly idxRules: TickRule[] = [
    { minPrice: 1, maxPrice: 200, tickSize: 1, maxStep: 10 },
    { minPrice: 200, maxPrice: 500, tickSize: 2, maxStep: 20 },
    { minPrice: 500, maxPrice: 2000, tickSize: 5, maxStep: 50 },
    { minPrice: 2000, maxPrice: 5000, tickSize: 10, maxStep: 100 },
    { minPrice: 5000, maxPrice: Infinity, tickSize: 25, maxStep: 250 },
  ];

  /**
   * Get tick size for a given price level on IDX.
   */
  getTickSize(price: number): number {
    if (price <= 0) return 1;

    for (const rule of this.idxRules) {
      if (price < rule.maxPrice) {
        return rule.tickSize;
      }
    }
    return 25;
  }

  /**
   * Rounds a price to a valid IDX tick fraction.
   * direction:
   *  - 'DOWN': floor to the nearest lower valid price level
   *  - 'UP': ceil to the nearest higher valid price level
   *  - 'NEAREST': round to closest valid price level
   */
  roundToValidTick(
    price: number,
    direction: 'UP' | 'DOWN' | 'NEAREST' = 'NEAREST',
  ): number {
    if (price <= 0) return 1;

    const tick = this.getTickSize(price);

    if (direction === 'DOWN') {
      return Math.floor(price / tick) * tick;
    } else if (direction === 'UP') {
      return Math.ceil(price / tick) * tick;
    } else {
      return Math.round(price / tick) * tick;
    }
  }

  /**
   * Determines the actual valid exit price candidate when a stop loss threshold is breached.
   *
   * Principle (PRD Section 7 & 8):
   * - The theoretical threshold (e.g. 105.73) indicates where the stop becomes VALID (minimum 3% drawdown).
   * - The actual exit price must be a valid market price level.
   * - If price trades normally through the threshold, the first valid tick level at or below
   *   the threshold is selected (e.g., 105 for a threshold of 105.73 when tick is 1).
   * - If a gap down occurs where the candle's open or actual traded low is even lower (e.g. 103),
   *   the actual execution price follows the gap policy (ACTUAL_FIRST_VALID_LEVEL -> 103).
   */
  resolveExitPrice(params: {
    theoreticalThreshold: number;
    candleOpen: number;
    candleLow: number;
    gapPolicy: string;
  }): number {
    const { theoreticalThreshold, candleOpen, gapPolicy } = params;

    // First valid tick level at or below theoretical threshold
    const firstValidLevel = this.roundToValidTick(theoreticalThreshold, 'DOWN');

    if (gapPolicy === 'THEORETICAL_THRESHOLD') {
      return firstValidLevel;
    }

    // Default: ACTUAL_FIRST_VALID_LEVEL
    // If the candle opened below the threshold (gap down open), the exit occurs at the candle open
    if (candleOpen <= theoreticalThreshold) {
      return this.roundToValidTick(candleOpen, 'DOWN');
    }

    // Otherwise, it was reached intra-candle, exit at first valid price level at/below threshold
    return firstValidLevel;
  }
}
