# Milestone M8 — Automation & Exception Handling

This implementation plan details the architecture, background orchestration, scheduling, and exception management for **Milestone M8 (Automation & Exception Handling)** in accordance with `tradearena-prd.md` Section 14, 27, and 48.

---

## User Review Required

> [!IMPORTANT]
> - **End-to-End Post-Market Pipeline**: Combines market data sync, candle validation, deterministic evaluation, and points calculation into a single idempotent, multi-step orchestration pipeline (`runDailyPipeline`).
> - **Automated Cron Scheduling**: Configured with `@nestjs/schedule` to automatically trigger post-market execution at **16:15 WIB** (`15 16 * * 1-5` Asia/Jakarta) on trading days for all `ACTIVE` tournaments.
> - **Isolated Failure Handling**: If an emiten data feed fails or experiences network timeouts, failures are isolated per symbol. Completed symbols evaluate normally, while affected picks enter `PENDING_DATA` or `REVIEW_REQUIRED` without blocking the rest of the tournament.
> - **Automatic & Manual Retry**: Failed symbol syncs can be automatically retried with exponential backoff and manually re-triggered from the Admin Exception Center.
> - **Permanent Audit Trail**: All pipeline runs, retries, and overrides are immutably recorded in the `AuditLog` table.

---

## Proposed Changes

### 1. Backend Modules (`/backend`)

#### [NEW] Automation Module (`backend/src/automation/`)
- **`automation.service.ts`**:
  * `runDailyPipeline(tournamentId: string, tradingDateStr: string)`:
    - Step 1: Collect today's confirmed picks for the tournament.
    - Step 2: Resolve unique stock symbols.
    - Step 3: Trigger market data sync run with automatic retry (up to 3 attempts with exponential backoff).
    - Step 4: Validate candles (OHLC consistency, candle count). If missing, flag as `PENDING_DATA`.
    - Step 5: Deterministic trade evaluation (`TradeEvaluationEngine`).
    - Step 6: Points engine calculation & standings update.
    - Step 7: Record audit log of the execution.
  * `retryFailedEvaluations(tournamentId: string, tradingDateStr: string)`:
    - Re-evaluates picks in `PENDING_DATA` or `REVIEW_REQUIRED` once market data becomes available.
  * `getPipelineStatus(tournamentId: string, tradingDateStr: string)`:
    - Returns progress breakdown (synced symbols, evaluated picks, exceptions, points status).
- **`automation.scheduler.ts`**:
  * Cron job scheduled at `15 16 * * 1-5` (16:15 WIB, Monday-Friday) using `@nestjs/schedule`.
  * Queries all `ACTIVE` tournaments and orchestrates daily post-market processing.
- **`automation.controller.ts`**:
  * `POST /api/v1/tournaments/:id/pipeline/run` (Admin trigger with optional `tradingDate`).
  * `GET /api/v1/tournaments/:id/pipeline/status` (Get pipeline execution status).
  * `GET /api/v1/tournaments/:id/exceptions` (Get list of picks in `REVIEW_REQUIRED` / `PENDING_DATA`).
  * `POST /api/v1/tournaments/:id/exceptions/:id/retry` (Retry evaluation for a specific pick).
- **`automation.module.ts`**:
  * Registered in root `backend/src/app.module.ts`.

#### [NEW] Dependencies
- Install `@nestjs/schedule` in backend for cron execution.

---

### 2. Frontend Application (`frontend/src/`)

#### [MODIFY] `frontend/src/app/tournaments/[id]/page.tsx`
- Add Tab 7: **"Otomasi & Exception"**:
  * **Daily Pipeline Orchestrator**:
    - "Jalankan Pipeline Harian (Full Orchestration)" button.
    - Visual step-by-step progress stepper: `Sync Data` $\rightarrow$ `Validasi` $\rightarrow$ `Evaluasi CL/TS` $\rightarrow$ `Kalkulasi Poin` $\rightarrow$ `Finalisasi`.
  * **Exception & Review Required Center**:
    - Filterable table displaying trades in `REVIEW_REQUIRED` or `PENDING_DATA`.
    - Anomaly badge, trigger description, and action buttons ("Coba Ulang / Retry", "Manual Override").
  * **Audit Trail History Log**:
    - Timeline table of pipeline runs, sync completions, and manual overrides with timestamp, actor, and affected entities.

---

## Verification Plan

### 1. Automated Tests
- Unit tests: `backend/src/automation/automation.service.spec.ts`:
  * Test pipeline execution sequence (Sync $\rightarrow$ Evaluate $\rightarrow$ Points).
  * Test retry behavior when market data is initially unavailable.
  * Test isolation of failed symbols (unaffected symbols evaluate to `COMPLETED`).
- Backend & Frontend Build tests:
  * `cmd /c "npm --prefix backend run build"`
  * `cmd /c "npm --prefix frontend run build"`

### 2. Live Verification (`verify-m8.js`)
- Authenticate as Admin.
- Trigger `POST /api/v1/tournaments/:id/pipeline/run` on tournament.
- Verify end-to-end execution: sync run created $\rightarrow$ picks evaluated $\rightarrow$ points calculated.
- Verify exception query endpoint returns proper items.
- Verify audit log entry is created.
