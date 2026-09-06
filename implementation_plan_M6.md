# Milestone M6 — Results & Standings Engine (Hasil & Klasemen)

This implementation plan details the architecture, ranking logic, tie-breaker mechanisms, and UI components for **Milestone M6 (Results & Standings)** in accordance with `tradearena-prd.md`.

---

## User Review Required

> [!IMPORTANT]
> - **Scoring & Point Calculation**: Realized return percentage is directly converted into tournament points (1% return = 1.0000 points). Negative returns subtract points symmetrically.
> - **Deterministic Tie-Breaking**: When participants have identical total points, ranking is resolved deterministically in strict priority order:
>   1. Higher Accumulated Tournament Points (`totalPoints` DESC)
>   2. Higher Win Rate Percentage (`winRate` DESC)
>   3. Higher Average Return Percentage (`averageReturn` DESC)
>   4. Higher Total Picks Evaluated (`picksCount` DESC)
>   5. Alphabetical Participant Name (`participantName` ASC)
> - **Podium Visual Display**: The top 3 ranked participants are highlighted in a prominent podium (Gold #1, Silver #2, Bronze #3) featuring win rate badges and best-performing emiten.
> - **Dual-View Support**: Operators and participants can seamlessly switch between **Overall Cumulative Standings** and **Intraday Daily Breakdown** for any specific trading session.
> - **Live Recalculation Endpoint**: Admin has access to a synchronous recalculation trigger to re-aggregate standings after evaluation overrides or corrections.

---

## Proposed Changes

### 1. Backend Services & Controllers (`backend/src/results/`)

#### [NEW] `results.service.ts`
- Core calculation & aggregation service:
  * `getOverallStandings(tournamentId: string)`:
    - Queries all active participants and their completed trade evaluations.
    - Computes `totalPoints`, `picksCount`, `winCount` (return > 0), `lossCount` (return < 0), `breakevenCount` (return == 0).
    - Calculates `winRate = (winCount / evaluatedCount) * 100` and `averageReturn = totalPoints / evaluatedCount`.
    - Identifies `bestPick` and `worstPick` per participant.
    - Applies multi-tiered deterministic tie-breaking sorting.
    - Assigns sequential rank (1..N).
  * `getDailyResults(tournamentId: string, tradingDateStr?: string)`:
    - Fallbacks gracefully to tournament `startDate` if `tradingDateStr` is not specified.
    - Aggregates intraday evaluations for the specified date.
    - Ranks participants based on that day's points.
  * `recalculateTournamentResults(tournamentId: string)`:
    - Verifies tournament status and forces standings cache invalidation / recomputation.

#### [NEW] `results.controller.ts`
- Endpoints:
  * `GET /api/v1/tournaments/:id/results/overall` — Cumulative tournament standings.
  * `GET /api/v1/tournaments/:id/results/daily?date=YYYY-MM-DD` — Per-day results breakdown.
  * `POST /api/v1/tournaments/:id/results/recalculate` — Admin recalculation trigger (Guarded by `Roles(Role.ADMIN)`).

#### [NEW] `results.module.ts`
- Registered with `PrismaModule` into root `app.module.ts`.

---

### 2. Frontend Application (`frontend/src/app/tournaments/[id]/page.tsx`)

#### [MODIFY] Tab 6: "Hasil & Klasemen"
- **Tab Header & Controls**:
  * View Mode Switcher: Toggle between "Klasemen Akumulasi (Overall)" and "Hasil Harian (Daily)".
  * Date picker for daily breakdown view.
  * "Hitung Ulang Klasemen" action button for Admins calling recalculate endpoint with feedback notification.
  * Refresh button.
- **Top 3 Podium (Visual Hierarchy)**:
  * Gold Card (#1 Champion): Highlighted with amber gradient and trophy icon.
  * Silver Card (#2 Runner-up): Slate gradient with medal icon.
  * Bronze Card (#3 Third place): Bronze/orange gradient with medal icon.
  * Metric chips on cards: Total points, Win rate %, Best trade ticker & return %.
- **Full Cumulative Standings Table**:
  * Columns:
    - **Peringkat**: Badged rank (#1-#3 colored, #4+ muted).
    - **Peserta**: Name and email.
    - **Poin Total**: Bold formatted points with up/down indicator.
    - **Pick Selesai**: Total completed trades.
    - **W / L / B**: Win / Loss / Breakeven record badge.
    - **Win Rate**: Color-coded percentage badge.
    - **Rata-rata Return**: Average return per pick.
    - **Trade Terbaik**: Best emiten ticker with return badge.
    - **Trade Terburuk**: Worst emiten ticker with return badge.
- **Daily Results Breakdown Table**:
  * Date selector with formatted Indonesian date.
  * Intraday table listing all submitted picks, entry price, exit price, exit reason, return %, and daily points awarded.
  * Empty state when no trades were executed on the selected date.

---

## Verification Plan

### 1. Automated Tests
- **API Unit & Integration Tests**:
  * Verify `GET /api/v1/tournaments/:id/results/overall` returns sorted standings matching mathematical points.
  * Verify tie-breaker rules rank identical point totals by win rate, then average return.
  * Verify `GET /api/v1/tournaments/:id/results/daily` handles missing/optional date parameter without error.
  * Verify `POST /api/v1/tournaments/:id/results/recalculate` returns updated summary.
- **Command verification**:
  * `cmd /c "npm --prefix backend run build"`
  * `cmd /c "npm --prefix frontend run build"`

### 2. Live Verification (`verify-m6.js`)
- Authenticate as tournament admin.
- Fetch overall standings for active tournament `BSJP Championship Musim 1 — 2026`.
- Validate standings consistency:
  * Participant Budi Santoso ranked #1 with 0.4878 pts (100% win rate).
  * Participant Siti Rahma ranked #5 with -2.549 pts.
- Fetch daily results for tournament start date.
- Trigger recalculate endpoint and verify successful status response.
