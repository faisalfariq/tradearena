# Milestone M7 — Leaderboard & Dashboard

This implementation plan details the architecture, UI components, data aggregation, and responsive design for **Milestone M7 (Leaderboard & Dashboard)** in accordance with `tradearena-prd.md` Section 48.

---

## User Review Required

> [!IMPORTANT]
> - **Unified Admin Operations Dashboard**: The home page (`/`) will dynamically transform for logged-in Administrators into a high-level Operations Dashboard displaying real-time platform metrics (Turnamen Aktif, Total Peserta, Evaluasi Selesai vs Pending Review, dan Aktivitas Terkini), while preserving the public hero showcase for visitors.
> - **Broadcast-Ready Public Leaderboard**: A dedicated public route (`/tournaments/[id]/leaderboard`) designed for participants, community members, and livestream displays. This view focuses on the Top 3 Podium, dynamic rankings, win rates, and transparent audit evidence inspection without administrative mutation controls.
> - **Authoritative Derivation**: Ranks, scores, and statistics are derived strictly from authoritative evaluation data with zero caching inconsistencies.
> - **Responsive Touch-Friendly Design**: Full mobile and desktop adaptability with sticky columns, scrollable podium cards, and clear loading/empty/error states.

---

## Proposed Changes

### 1. Backend Modules (`/backend`)

#### [NEW] `dashboard/dashboard.service.ts`
- Calculates platform-wide summary metrics:
  * `activeTournamentsCount`: count of tournaments in `ACTIVE` or `REGISTRATION_OPEN`.
  * `totalParticipantsCount`: total enrolled participants across all tournaments.
  * `totalPicksCount`: total submitted stock picks.
  * `completedEvaluationsCount`: total evaluations with status `COMPLETED`.
  * `pendingReviewsCount`: total evaluations with status `REVIEW_REQUIRED` or `PENDING_DATA`.
  * `tournamentsSummary`: list of recent tournaments with enrollment counts, dates, and active status.
  * `recentEvaluations`: latest 10 trade evaluations with emiten, realized return, and participant.

#### [NEW] `dashboard/dashboard.controller.ts`
- `GET /api/v1/dashboard/stats`: Secured endpoint with `JwtAuthGuard` and `Roles(Role.ADMIN)`.

#### [NEW] `dashboard/dashboard.module.ts`
- Registered in root `backend/src/app.module.ts`.

#### [NEW] Backend Unit & Integration Tests
- `backend/src/dashboard/dashboard.service.spec.ts`

---

### 2. Frontend Application (`/frontend`)

#### [MODIFY] `frontend/src/app/page.tsx`
- Implement role-aware dashboard for authenticated Admin:
  * **Top Metrics Bar (4 Cards)**:
    1. Turnamen Aktif (with active indicator badge)
    2. Total Peserta Terdaftar
    3. Total Pick & Evaluasi Selesai
    4. Perlu Review / Exception (with amber warning if > 0)
  * **Turnamen Aktif Showcase**: Grid of active tournament cards with dates, participant count, status badge, and direct links to "Detail & Aturan" or "Klasemen Publik".
  * **Aksi Cepat (Quick Actions)**: Direct buttons for "Buat Turnamen Baru", "Kelola Emiten Saham", "Daftar Peserta", and "Sinkronisasi Market Data".
  * **Evaluasi Terkini**: Recent evaluations feed with return % badges.
  * Preserves marketing hero for unauthenticated visitors.

#### [NEW] `frontend/src/app/tournaments/[id]/leaderboard/page.tsx`
- Dedicated public tournament leaderboard:
  * Top navigation with tournament title, date badge, and "Kembali ke Turnamen" button.
  * Top 3 Champion Podium (#1 Gold Trophy, #2 Silver Medal, #3 Bronze Medal) with total points, win rate, best stock.
  * Toggle between "Klasemen Akumulasi" and "Hasil Harian".
  * Full leaderboard table with responsive design.
  * Modal "Bukti Audit" inspection for any pick.

#### [MODIFY] `frontend/src/components/Navbar.tsx`
- Ensure navbar links to "Dashboard" and "Turnamen" highlight properly based on current route.

---

## Verification Plan

### 1. Automated Tests
- `cmd /c "npm --prefix backend test"`
- `cmd /c "npm --prefix backend run build"`
- `cmd /c "npm --prefix frontend run build"`

### 2. Live Verification (`verify-m7.js`)
- Test `/api/v1/dashboard/stats` with Admin JWT.
- Verify accurate counts against database records.
- Check that `/tournaments/[id]/leaderboard` renders accurately and displays Top 3 podium.
- Verify responsive layout on mobile viewport.
