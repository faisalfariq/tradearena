# Milestone M4 — Market Data Integration

This plan implements Canonical Intraday Market Data ingestion, normalization, provider abstraction, and sync run tracking according to `tradearena-prd.md` Milestone M4 scope.

## User Review Required

> [!NOTE]
> - Intraday historical data uses 1-minute canonical candles (`symbol`, `tradingDate`, `timestamp`, `open`, `high`, `low`, `close`, `volume`, `provider`).
> - Unique Symbol Strategy: if 30 participants submit picks across 5 unique stocks (e.g. BBCA, BBRI, TLKM, BMRI, ASII), data is fetched once per unique stock/date and shared for all evaluations.
> - Pluggable provider architecture with `MockMarketDataProvider` (generates realistic IDX trading hours 09:00 - 16:00 WIB with configurable market scenarios) and `HttpMarketDataProvider` adapter skeleton for live external feeds.

---

## Proposed Changes

### 1. Backend Modules (`/backend`)

#### [NEW] Market Data Module (`backend/src/market-data`)
- **Interfaces & Types** (`interfaces/market-data-provider.interface.ts`):
  - `NormalizedCandle`: standardized 1-minute OHLCV candle object.
  - `MarketDataProvider`: contract defining `getIntradayCandles({ symbol, tradingDate, interval })`.
- **Normalizer & Validator** (`utils/candle-normalizer.ts`):
  - Validates `high >= open`, `high >= close`, `low <= open`, `low <= close`, positive prices.
  - Filters timestamp duplicates and orders chronologically.
- **Provider Implementations** (`providers/`):
  - `MockMarketDataProvider`: generates deterministic 1-minute candles for IDX sessions (09:00-12:00, 13:30-15:50, 16:00 close), with configurable volatility and scenarios (CL trigger, Trailing Stop trigger).
  - `HttpMarketDataProvider`: extensible HTTP adapter for external market data APIs with timeout, retry, and rate-limit handling.
- **Service** (`market-data.service.ts`):
  - `triggerSync(tournamentId: string, tradingDate: string)`:
    - Resolves unique symbols from picks for that tournament and date.
    - Creates `MarketSyncRun` record (status `RUNNING`).
    - Fetches data for each unique symbol once.
    - Saves candles into `IntradayCandle` using `upsert` / batching (preventing duplicates via `@@unique([symbol, timestamp, provider])`).
    - Records per-symbol status in `MarketSyncItem`.
    - Updates `MarketSyncRun` (`SUCCESS`, `PARTIAL`, or `FAILED`).
  - `getSyncRuns(tournamentId: string)`: list all sync runs.
  - `getSyncRunDetail(runId: string)`: get run details and item statuses.
  - `getCandles(symbol: string, tradingDate: string)`: query stored candles.
- **Controller** (`market-data.controller.ts`):
  - `POST /api/v1/tournaments/:tournamentId/market-sync`: Trigger sync run (Admin only).
  - `GET /api/v1/tournaments/:tournamentId/market-sync`: List sync runs.
  - `GET /api/v1/tournaments/:tournamentId/market-sync/:runId`: Get sync run detail.
  - `GET /api/v1/market-data/candles`: Retrieve candles for symbol & date.
- **Module** (`market-data.module.ts`).

#### [MODIFY] `backend/src/app.module.ts`
- Register `MarketDataModule`.

---

### 2. Frontend Application (`/frontend`)

#### [MODIFY] `frontend/src/app/tournaments/[id]/page.tsx`
- Add Tab 4: **Market Data & Sync**:
  - Sync trigger panel: Date selector + "Tarik Data Intraday (Sync)" button.
  - Sync Runs history table: Tanggal trading, Status badge (`SUCCESS`, `PARTIAL`, `RUNNING`, `FAILED`), Total Simbol, Waktu Sinkronisasi.
  - Detail item popover/drawer: Per-symbol sync status & jumlah candle yang tersimpan (misal: BBCA 390 candles).
  - Candle preview viewer: Quick modal/table to inspect 1-minute OHLCV candles for any synced symbol.

---

### 3. Automated Tests & Verification

- **Unit Tests**:
  - `backend/src/market-data/candle-normalizer.spec.ts`: Test candle chronological ordering, high/low validity, duplicate timestamp filtering.
  - `backend/src/market-data/providers/mock-provider.spec.ts`: Test realistic IDX trading hour generation (09:00 - 16:00 WIB).
  - `backend/src/market-data/market-data.service.spec.ts`: Test unique symbol extraction, sync run creation, error handling per symbol, duplicate prevention.
- **E2E Tests**:
  - `backend/test/market-data.e2e-spec.ts`: Full flow e2e testing trigger sync -> query sync runs -> retrieve stored candles.
- **Verification Gates**:
  - Backend Lint: `npm --prefix backend run lint`
  - Backend Unit Tests: `npm --prefix backend test`
  - Backend E2E Tests: `npm --prefix backend run test:e2e`
  - Backend Build: `npm --prefix backend run build`
  - Frontend Lint: `npm --prefix frontend run lint`
  - Frontend Build: `npm --prefix frontend run build`

---

## Verification Plan

### Automated Tests
- `cmd.exe /c npm --prefix backend test` -> all unit tests pass
- `cmd.exe /c npm --prefix backend run test:e2e` -> all e2e suites pass
- `cmd.exe /c npm --prefix backend run build` -> clean build
- `cmd.exe /c npm --prefix frontend run lint` -> clean lint
- `cmd.exe /c npm --prefix frontend run build` -> clean build (all static & dynamic routes)

### Manual Verification
- Start `run.bat` dev server on port 3333 (BE) and 4444 (FE).
- Trigger market sync for `2026-09-05` in UI at `http://localhost:4444/tournaments/[id]`.
- Verify unique stocks (BBCA, BBRI, TLKM) get synced with ~390 1-minute candles each.
- Inspect candles via API `http://localhost:3333/api/v1/market-data/candles?symbol=BBCA&tradingDate=2026-09-05`.
