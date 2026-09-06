# Milestone M5 — Trade Evaluation Engine

This implementation plan details the architecture, design decisions, mathematical rules, and components for **Milestone M5 (Trade Evaluation Engine)** in accordance with `tradearena-prd.md`.

---

## User Review Required

> [!IMPORTANT]
> - **Pure Deterministic (Non-LLM)**: Trade judging is strictly rule-based and mathematical. No LLM is involved in trade execution to guarantee 100% reproducibility, tournament fairness, and regulatory compliance.
> - **Chronological Cutoff**: 1-minute candles are evaluated strictly in ascending time order. The instant a stop loss or exit condition is triggered, the trade is frozen and all subsequent intraday candles are ignored.
> - **IDX Price Fractions**: Stop thresholds are conservatively floored to the nearest valid official Indonesia Stock Exchange (IDX) tick size across all 5 tiers.
> - **Gap Down Open Policy (`ACTUAL_FIRST_VALID_LEVEL`)**: If a candle opens below the stop threshold, the exit price is executed at the actual opening price of that candle.
> - **Auditable Evidence & Override**: Every evaluation generates an immutable audit record with the exact trigger candle OHLC and step-by-step timeline. Admin overrides require mandatory reasoning and are permanently logged.

---

## Proposed Changes

### 1. Backend Services & Engines (`backend/src/evaluation/`)

#### [NEW] `services/price-fraction.service.ts`
- Implements the 5 official IDX price fraction tiers:
  * **Tier 1**: Harga $< \text{Rp } 200 \rightarrow$ Fraksi Rp 1
  * **Tier 2**: Harga $\text{Rp } 200 - \text{Rp } 500 \rightarrow$ Fraksi Rp 2
  * **Tier 3**: Harga $\text{Rp } 500 - \text{Rp } 2.000 \rightarrow$ Fraksi Rp 5
  * **Tier 4**: Harga $\text{Rp } 2.000 - \text{Rp } 5.000 \rightarrow$ Fraksi Rp 10
  * **Tier 5**: Harga $\ge \text{Rp } 5.000 \rightarrow$ Fraksi Rp 25
- Methods:
  * `getTickSize(price: number): number`
  * `roundToValidTick(price: number, mode: 'floor' | 'ceil' | 'round'): number`
  * `calculateStopLevel(basePrice: number, pctLoss: number): number` (floors stop level to avoid violating minimum tournament risk constraints)

#### [NEW] `interfaces/evaluation.interface.ts`
- Defines contracts for:
  * `EvaluationInput`: pick data, entry price, stop percentages, rule versions, candle array.
  * `EvaluationOutput`: exit price, realized return, peak price, max floating return, exit reason, status, auditable evidence.
  * `EvaluationEvidence`: provider, candle count, trigger candle index & timestamp, trigger OHLC, timeline.
  * `EvaluationTimelineStep`: per-minute progression tracking (minute, timestamp, OHLC, peak, current threshold).

#### [NEW] `engines/trade-evaluation.engine.ts`
- Core deterministic engine:
  * Loops through 1-minute intraday candles in chronological order.
  * Dynamically updates `highestPrice` whenever `high > highestPrice`.
  * Ratchets up the trailing stop threshold: `currentStop = peak * (1 - trailingStopPct)`, floored to valid IDX tick.
  * Evaluates exit conditions:
    1. **Gap Down Open**: If `open <= currentStop`, exit price = `open`, reason = `INITIAL_CL` or `TRAILING_STOP`.
    2. **Intraday Low Breach**: If `low <= currentStop`, exit price = `currentStop`, reason = `INITIAL_CL` or `TRAILING_STOP`.
    3. **Chronological Freeze**: On exit trigger, breaks loop immediately; subsequent candles are untouched.
  * **Market Close Fallback**: If no stop triggered across all 330 candles, exit price = `close` of final candle (16:00 WIB), reason = `MARKET_CLOSE`.

#### [NEW] `evaluation.service.ts` & `evaluation.controller.ts`
- `evaluatePick(pickId: string)`: Evaluates a single pick against stored 1-minute candles.
- `evaluateTournamentDay(tournamentId: string, tradingDate: string)`: Ingests/evaluates all picks for a tournament day.
- `getTournamentEvaluations(tournamentId: string, tradingDate?: string)`: Queries evaluation results with participant, stock, and override relations.
- `getEvaluationDetail(id: string)`: Retrieves full audit evidence and timeline.
- `overrideEvaluation(id: string, dto: OverrideEvaluationDto, adminId: string)`: Admin manual adjustment with audit log (`AuditLog`).

#### [NEW] DTOs & Module Registration
- `dto/evaluate-tournament-day.dto.ts` & `dto/override-evaluation.dto.ts`.
- `evaluation.module.ts` registered in `app.module.ts`.

---

### 2. Frontend Application (`frontend/src/app/tournaments/[id]/page.tsx`)

#### [MODIFY] Tab 5: "Evaluasi Trade"
- **Navigation**: Added Tab 5 with icon `Award`.
- **Action Header**:
  * Date selector (`evalDateFilter`).
  * "Jalankan Evaluasi" button calling `POST /api/v1/tournaments/:id/evaluations/run`.
  * Refresh button calling `GET /api/v1/tournaments/:id/evaluations`.
- **Summary Metrics (5 Cards)**:
  * Total Dievaluasi
  * Rata-rata Return %
  * Initial Cut Loss (-3% Floor)
  * Trailing Stop (-3% from Peak)
  * Market Close (EOD Fallback)
- **Evaluations Table**:
  * Columns: Peserta, Emiten, Entry Price, Highest Peak & Max Float %, Exit Price & Timestamp, Realized Return badge (green/red), Alasan Exit badge (`INITIAL_CL`, `TRAILING_STOP`, `MARKET_CLOSE`, `MANUAL_OVERRIDE`), Status, Aksi.
- **Modal Bukti Audit (Evidence)**:
  * Summary metrics (Entry, Peak, Exit, Return).
  * Trigger Candle Box (WIB timestamp, candle # / 330, Open, High, Low, Close).
  * Threshold Math comparison: Teoretis vs Fraksi Harga Aktual IDX.
  * Chronological Intraday Timeline table (scrollable minute-by-minute progression).
  * Override indicator banner if modified by admin.
- **Modal Penyesuaian Manual (Override)**:
  * Current values display (Entry, Original Exit, Original Return).
  * Input for new Exit Price (auto-computes new Return %).
  * Mandatory reason textarea for database audit logging.

---

## Verification Plan

### 1. Automated Tests
- **Price Fraction Unit Tests** (`price-fraction.service.spec.ts`):
  * Test all 5 IDX tiers, boundary values (Rp 199, 200, 499, 500, 1995, 2000, 4990, 5000).
  * Test floor rounding for stop loss levels.
- **Evaluation Engine Unit Tests** (`trade-evaluation.engine.spec.ts`):
  * Test Initial Cut Loss trigger.
  * Test Trailing Stop trigger from peak.
  * Test Gap Down open execution at actual open level.
  * Test Market Close fallback on final candle.
  * Test chronological cutoff (no subsequent candles evaluated).
  * Test IDX fraction rounding integration.
  * Test pending data safety fallback.
- **Service & Controller Tests** (`evaluation.service.spec.ts` & `test/evaluation.e2e-spec.ts`):
  * Test single pick evaluation, tournament day evaluation, permissions, detail queries, and admin overrides.
- **Command verification**:
  * `cmd /c "npm --prefix backend test"`
  * `cmd /c "npm --prefix backend run test:e2e"`
  * `cmd /c "npm --prefix backend run build"`
  * `cmd /c "npm --prefix frontend run lint"`
  * `cmd /c "npm --prefix frontend run build"`

### 2. Live Verification
- Execute live evaluation for tournament day with real database records.
- Verify that `TLKM`, `BBCA`, and `BBRI` evaluate to appropriate exit reasons (`MARKET_CLOSE`, `TRAILING_STOP`).
- Verify that trigger candle and step-by-step timeline are recorded.
- Test manual override endpoint and check that `AuditLog` records original vs new values.
