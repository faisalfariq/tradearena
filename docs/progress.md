# TradeArena — Progress Tracking

Dokumen ini mencatat status setiap milestone development TradeArena sesuai PRD dan Acceptance Criteria.

---

## Status Milestone Ringkas

| Milestone | Scope | Status | Completion Date |
|---|---|---|---|
| **M0** | Project Bootstrap | **COMPLETED** | 2026-09-05 |
| **M1** | Authentication & User Management | **COMPLETED** | 2026-09-05 |
| **M2** | Tournament Core & Rules | **COMPLETED** | 2026-09-05 |
| **M3** | Participants, Stocks & Picks | **COMPLETED** | 2026-09-06 |
| **M4** | Market Data Integration | **COMPLETED** | 2026-09-06 |
| **M5** | Trade Evaluation Engine | **COMPLETED** | 2026-09-06 |
| **M6** | Points & Results | **NEXT** | - |
| **M7** | Leaderboard & Dashboard | NOT STARTED | - |
| **M8** | Automation & Exception Handling | NOT STARTED | - |
| **M9** | MVP Stabilization | NOT STARTED | - |

---

## Detail Milestone

### M0 — Project Bootstrap
- **Status:** COMPLETED
- **Completion Date:** 2026-09-05
- **Implemented Scope:**
  - Monorepo structure (`frontend/`, `backend/`, `docs/`)
  - Root configuration (`.gitignore`, `.env.example`, `docker-compose.yml`, `package.json`)
  - Root launchers (`run.sh` untuk Linux/macOS, `run.bat` untuk Windows)
  - Backend NestJS Modular Monolith + TypeScript + Prisma + PostgreSQL schema
  - Frontend Next.js 14 App Router + Tailwind CSS + Responsive UI + Live API Health checker
  - Endpoints: `GET /api/v1/health`, Swagger docs `/api/docs`
  - Documentation: `README.md`, `docs/architecture/overview.md`, `docs/decisions/001-bootstrap-stack.md`, `docs/progress.md`
- **Verification:**
  - Lint: PASS
  - Tests: PASS (Unit & E2E)
  - Builds: PASS (Backend & Frontend)

---

### M1 — Authentication & User Management
- **Status:** COMPLETED
- **Completion Date:** 2026-09-05
- **Implemented Scope:**
  - Backend `PrismaService` & `PrismaModule`
  - `UsersService` & `UsersModule` (Lookup by email/id, user creation, password hashing with bcrypt)
  - `AuthService` & `AuthController` (`POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`, `GET /api/v1/auth/admin-test`)
  - JWT Access Token (1h) + Refresh Token rotation (7d)
  - Passport JWT Strategy (`JwtStrategy`), `JwtAuthGuard`, `RolesGuard`, dan `@Roles(Role.ADMIN)`
  - Admin seed script: `backend/prisma/seed.ts`
  - Frontend `AuthContext` (`AuthProvider`, `useAuth`) dengan persistent session dan auto-sync
  - Responsive dark-mode Login Page (`/login`) dengan validation, error feedback, dan auto-redirect
  - Updated `Navbar` menampilkan profil user terautentikasi, badge Role ADMIN, dan action Logout
- **Verification:**
  - Lint: PASS
  - Unit Tests: PASS (10/10 passed)
  - E2E Tests: PASS (9/9 passed)
  - Builds: PASS (Backend & Frontend)

---

### M2 — Tournament Core & Rules
- **Status:** COMPLETED
- **Completion Date:** 2026-09-05
- **Implemented Scope:**
  - Backend `TournamentsModule`, `TournamentsService`, dan `TournamentsController`
  - CRUD turnamen dengan relasi aturan trading `TournamentRule` (Initial Cut Loss % default 3%, Trailing Stop % default 3% dari peak, Candle Ambiguity Policy, Gap Policy, Price Fraction Policy)
  - Enforce backend validation: rentang tanggal valid (`endDate > startDate`), sanitasi persentase stop, proteksi penghapusan turnamen berstatus ACTIVE
  - Endpoints REST `/api/v1/tournaments`:
    * `GET /api/v1/tournaments` (List dengan filter status & rules summary)
    * `GET /api/v1/tournaments/:id` (Detail turnamen dan aturan)
    * `POST /api/v1/tournaments` (Protected Admin: buat turnamen dan auto-generate rules)
    * `PUT /api/v1/tournaments/:id` (Protected Admin: update turnamen & rules)
    * `PATCH /api/v1/tournaments/:id/status` (Protected Admin: transisi status UPCOMING -> ACTIVE -> COMPLETED)
    * `DELETE /api/v1/tournaments/:id` (Protected Admin: hapus turnamen non-aktif)
  - Frontend Manajemen Turnamen:
    * `/tournaments`: Dashboard daftar turnamen responsif dengan filter status (All, Upcoming, Active, Completed), indikator tanggal, jumlah peserta/picks, dan highlight rules (-3% CL & -3% TS).
    * `/tournaments/new`: Formulir interaktif pembuatan turnamen dengan preset aturan BSJP default dan pengaturan kebijakan candle/gap.
    * Navbar update dengan tautan cepat ke menu "Turnamen".
- **Database Changes:**
  - Memanfaatkan relasi entitas `Tournament` dan `TournamentRule` pada schema Prisma.
- **API Changes:**
  - `GET /api/v1/tournaments`
  - `POST /api/v1/tournaments`
  - `GET /api/v1/tournaments/:id`
  - `PUT /api/v1/tournaments/:id`
  - `PATCH /api/v1/tournaments/:id/status`
  - `DELETE /api/v1/tournaments/:id`
- **Frontend Changes:**
  - File baru `frontend/src/app/tournaments/page.tsx`
  - File baru `frontend/src/app/tournaments/new/page.tsx`
  - Update `frontend/src/components/Navbar.tsx`
- **Tests:**
  - `src/tournaments/tournaments.service.spec.ts`: Unit tests untuk date range validation, default BSJP -3% rules creation, list retrieval, status update, dan active deletion constraint -> PASS.
  - `test/tournaments.e2e-spec.ts`: E2E tests untuk public list, unauthenticated rejection 401, admin creation 201 dengan rules, status patch 200 -> PASS.
- **Verification:**
  - Lint: PASS (Backend: 0 errors/warnings | Frontend: 0 errors/warnings)
  - Backend Unit Tests: PASS (19/19 passed)
  - Backend E2E Tests: PASS (14/14 passed)
  - Backend Build: PASS (exit code 0)
  - Frontend Build: PASS (exit code 0, 7/7 static routes generated)
- **Decisions:**
  - Default BSJP initial CL (-3%) dan Trailing Stop (-3% dari peak) ditetapkan secara otomatis jika tidak dispesifikasikan saat turnamen dibuat.
- **Known Limitations:**
  - None
- **Blockers:** None
- **Next Milestone:** M3 — Participants, Stocks & Picks

---

### M3 — Participants, Stocks & Picks
- **Status:** COMPLETED
- **Completion Date:** 2026-09-06
- **Implemented Scope:**
  - Backend `StocksModule`, `StocksService`, dan `StocksController`:
    * Master emiten saham IDX (create, update, search, active filter, soft-delete protection).
    * Endpoints: `GET /api/v1/stocks`, `GET /api/v1/stocks/:id`, `POST /api/v1/stocks`, `PUT /api/v1/stocks/:id`, `DELETE /api/v1/stocks/:id`.
  - Backend `ParticipantsModule`, `ParticipantsService`, dan `ParticipantsController`:
    * CRUD peserta turnamen (nama, email unik, nomor telepon WhatsApp).
    * Tournament Membership: pendaftaran (`enroll`), pembatalan (`unenroll`), dan list peserta terdaftar (`getTournamentParticipants`) dengan hitungan picks.
    * Endpoints: `GET /api/v1/participants`, `POST /api/v1/participants`, `GET /api/v1/participants/:id`, `PUT /api/v1/participants/:id`, `DELETE /api/v1/participants/:id`, `GET /api/v1/tournaments/:id/participants`, `POST /api/v1/tournaments/:id/participants`, `DELETE /api/v1/tournaments/:id/participants/:participantId`.
  - Backend `PicksModule`, `PicksService`, dan `PicksController`:
    * Input pilihan saham harian peserta (`StockPick`).
    * Strict backend business validations:
      - Validasi keberadaan turnamen dan peserta.
      - Enforce kepesertaan turnamen (peserta wajib terdaftar di `TournamentParticipant`).
      - Validasi emiten saham aktif (`isActive = true`).
      - Validasi tanggal trading berada dalam rentang `[startDate, endDate]` turnamen.
      - Validasi harga entry bernilai positif (> 0).
      - **Enforce penolakan pick duplikat (HTTP 409 Conflict)** sesuai `@@unique([tournamentId, participantId, tradingDate, stockId])`.
    * Endpoints: `GET /api/v1/tournaments/:id/picks`, `POST /api/v1/tournaments/:id/picks`, `GET /api/v1/picks/:id`, `PUT /api/v1/picks/:id`, `DELETE /api/v1/picks/:id`.
  - Database & Seeding (`backend/prisma/seed.ts`):
    * 15 emiten saham terlikuid IDX (BBCA, BBRI, BMRI, BBNI, TLKM, ASII, AMMN, GOTO, ADRO, BRIS, UNTR, ICBP, KLBF, PGAS, CPIN).
    * 5 demo peserta turnamen (Budi Santoso, Siti Rahma, Denny Pratama, Hendra Wijaya, Rina Kusuma).
    * Turnamen aktif "BSJP Championship Musim 1 — 2026" beserta pendaftaran 5 peserta dan demo picks harian.
  - Frontend Views:
    * `/participants`: Dashboard manajemen peserta, pencarian, statistik enrollment/picks, dan modal tambah peserta.
    * `/stocks`: Katalog master emiten saham IDX dengan filter status aktif/non-aktif, pencarian ticker/nama, dan modal tambah emiten baru.
    * `/tournaments/[id]`: Halaman detail turnamen interaktif dengan 3 tab:
      - Tab Stock Picks: tabel picks harian, filter tanggal trading, dan modal submit stock pick dengan validasi relasi.
      - Tab Peserta Terdaftar: daftar anggota turnamen dan modal daftarkan peserta dari master data.
      - Tab Overview & Rules: highlight -3% Cut Loss dan -3% Trailing Stop dari peak beserta kebijakan candle ambiguity & gap.
    * Navbar update: penambahan tautan navigasi langsung ke menu "Peserta" dan "Saham".
    * Dashboard Turnamen update: tautan "Detail & Picks →" langsung pada setiap kartu turnamen.
- **Verification:**
  - Lint: PASS (Backend: 0 errors/warnings | Frontend: 0 errors/warnings)
  - Backend Unit Tests: PASS (6/6 test suites, 39/39 tests passed)
  - Backend E2E Tests: PASS (4/4 test suites, 21/21 tests passed)
  - Backend Build: PASS (`nest build`, exit code 0)
  - Frontend Build: PASS (`next build`, 9/9 routes compiled, exit code 0)
- **Decisions:**
  - Validasi duplikasi pick menghasilkan HTTP 409 Conflict yang jelas bagi client/UI.
  - Tanggal perdagangan diparsing secara konsisten pada format `YYYY-MM-DD` untuk menghindari pergeseran akibat timezone client.
- **Next Milestone:** M4 — Market Data Integration

---

### M4 — Market Data Integration
- **Status:** COMPLETED
- **Completion Date:** 2026-09-06
- **Implemented Scope:**
  - Canonical Market Data Interface (`IMarketDataProvider`):
    * Standardized contract for intraday candle feeds (`NormalizedCandle`).
    * Provider abstraction supporting multiple data sources (`MockMarketDataProvider`, `HttpMarketDataProvider`).
  - Candle Normalizer & Geometry Integrity Engine (`CandleNormalizer`):
    * Enforces physical OHLC geometry (`high = Math.max(o, h, l, c)`, `low = Math.min(o, h, l, c)`).
    * Filters non-positive / corrupted candle prices.
    * Timestamps deduplication and chronological ascending order.
  - Deterministic IDX Mock Provider:
    * Generates authentic IDX trading sessions:
      - Sesi 1: 09:00 - 12:00 WIB (180 bars)
      - Sesi 2 & Pre-closing: 13:30 - 16:00 WIB (150 bars)
      - Total: 330 1-minute bars per trading day.
    * Deterministic seed: identic output for identical symbol and date.
  - Market Data Service & Unique Symbol Synchronization:
    * Ingests intraday 1-minute bars for all unique symbols picked in the tournament.
    * Tracks synchronization runs (`MarketSyncRun`) and per-symbol ingestion status (`MarketSyncItem`).
    * Prevents duplicate ingestion via database upsert logic.
  - Endpoints:
    * `POST /api/v1/tournaments/:id/market-sync`: Trigger sync run (Admin only).
    * `GET /api/v1/tournaments/:id/market-sync`: List sync run history.
    * `GET /api/v1/tournaments/:id/market-sync/:runId`: Detailed sync run status & per-symbol item metrics.
    * `GET /api/v1/market-data/candles?symbol=...&tradingDate=...`: Retrieve stored 1-minute canonical candles.
  - Frontend Market Data & Sync Interface (`/tournaments/[id]`):
    * Tab 4: "Data Pasar & Sync".
    * Sync trigger form with trading date picker, provider selector, and execution button with loading feedback.
    * Real-time sync run history table with status badges (`SUCCESS`, `PARTIAL`, `RUNNING`, `FAILED`), synced vs total symbols, and timestamps.
    * Detailed Ingestion Modal with per-symbol breakdown and status.
    * 1-Minute Candle Inspector Modal displaying OHLCV table with WIB timestamps and return badges.
- **Verification:**
  - Lint: PASS (Backend: 0 errors/warnings | Frontend: 0 errors/warnings)
  - Backend Unit Tests: PASS (9/9 test suites, 52/52 tests passed)
  - Backend E2E Tests: PASS (5/5 test suites, 26/26 tests passed)
  - Backend Build: PASS (`nest build`, exit code 0)
  - Frontend Build: PASS (`next build`, 9/9 routes compiled, exit code 0)
- **Decisions:**
  - Menghindari duplikasi penarikan data: hanya emiten unik dari stock picks yang ditarik, tidak peduli berapa banyak peserta memilih emiten yang sama.
  - Validasi integritas geometri bar candle dilakukan di backend sebelum persistensi.
- **Next Milestone:** M5 — Trade Evaluation Engine

---

### M5 — Trade Evaluation Engine
- **Status:** COMPLETED
- **Completion Date:** 2026-09-06
- **Implemented Scope:**
  - **Deterministic Trade Evaluation Engine (`TradeEvaluationEngine`):**
    * Evaluasi murni matematika berbasis rule tanpa campur tangan LLM.
    * Pemrosesan candle 1-menit kanonikal secara kronologis strictly ascending.
    * **Chronological cutoff**: seketika stop loss / exit terpenuhi, candle-candle setelahnya dibekukan dan diabaikan.
    * **Initial Cut Loss (-3% min rule)**: stop loss awal dihitung dari harga entry; dipicu jika `low <= currentStopThreshold`.
    * **Trailing Stop (-3% static drawdown from peak)**: stop loss dinamis mengikuti puncak harga tertinggi (`highestPrice`); jika harga membuat higher high, threshold bergeser naik ke `peak * (1 - trailingStopPct)`. Threshold tidak pernah turun.
    * **Gap Down Open Handling (`ACTUAL_FIRST_VALID_LEVEL`)**: jika pembukaan candle memicu gap down di bawah stop threshold (`open <= threshold`), simulated exit dieksekusi tepat pada harga `open` (realistis bursa, bukan harga teoretis phantom).
    * **Official IDX Price Fractions (`PriceFractionService`)**:
      - Fraksi 1: Harga < Rp 200 (Tick Rp 1)
      - Fraksi 2: Harga Rp 200 - Rp 500 (Tick Rp 2)
      - Fraksi 3: Harga Rp 500 - Rp 2.000 (Tick Rp 5)
      - Fraksi 4: Harga Rp 2.000 - Rp 5.000 (Tick Rp 10)
      - Fraksi 5: Harga >= Rp 5.000 (Tick Rp 25)
      - Pembulatan konservatif ke bawah (floor) untuk level stop loss agar tidak melanggar batas risiko minimal turnamen.
    * **Fallback Market Close (`MARKET_CLOSE`)**: jika posisi bertahan hingga akhir sesi bursa tanpa menyentuh stop loss, exit dieksekusi pada harga `close` bar candle terakhir (menit ke-330 / 16:00 WIB).
    * **Auditable Evidence Generation**: bukti evaluasi lengkap (`marketDataProvider`, `candleCount`, `triggerCandleIndex`, `triggerCandleTimestamp`, `triggerCandle OHLC`, `theoreticalThreshold`, `actualExitPrice`, `stepByStepTimeline`).
    * **Admin Manual Override with Audit Log**: admin dapat melakukan penyesuaian exit price/return secara manual; menyimpan nilai asli, nilai penyesuaian, alasan wajib, dan audit log permanen.
  - **Endpoints:**
    * `POST /api/v1/tournaments/:id/evaluations/run`: Evaluasi deterministik seluruh stock pick turnamen pada tanggal tertentu (Admin only).
    * `POST /api/v1/picks/:pickId/evaluate`: Evaluasi ulang satu stock pick individual (Admin only).
    * `GET /api/v1/tournaments/:id/evaluations?tradingDate=...`: Daftar hasil evaluasi trade, exit price, realized return, status, dan alasan exit.
    * `GET /api/v1/evaluations/:id`: Detail lengkap evaluasi beserta bukti audit (evidence) dan kronologi timeline.
    * `POST /api/v1/evaluations/:id/override`: Penyesuaian manual evaluasi oleh Admin dengan mencatat alasan dan audit log.
  - **Frontend Evaluation UI (`/tournaments/[id]`):**
    * Tab 5: "Evaluasi Trade" dengan icon `Award`.
    * Header form: Pemilihan tanggal perdagangan, tombol "Jalankan Evaluasi" dengan loading feedback, dan refresh button.
    * Quick Metrics Summary: Total Dievaluasi, Rata-rata Return %, Initial Cut Loss count, Trailing Stop count, dan Market Close count.
    * Evaluations Table: Peserta, Emiten, Entry Price, Highest Peak & Max Float %, Exit Price & Timestamp, Realized Return badge (hijau/merah), Alasan Exit badge (`INITIAL_CL`, `TRAILING_STOP`, `MARKET_CLOSE`, `MANUAL_OVERRIDE`), Status badge, dan tombol Aksi.
    * Modal "Bukti Audit Evaluasi Trade (Evidence)":
      - Header dengan identitas emiten, tanggal, peserta, dan versi kalkulasi.
      - Alert banner jika trade telah disesuaikan (override) oleh Admin lengkap dengan nama dan alasan.
      - Ringkasan 4 parameter kunci (Entry, Peak, Exit, Return).
      - Trigger Candle Box (WIB timestamp, index candle / 330, Open, High, Low, Close).
      - Threshold math comparison: Teoretis vs Fraksi Harga Aktual IDX.
      - Kronologi Candle Intraday (Tabel step-by-step timeline hingga titik exit).
    * Modal "Penyesuaian Manual (Override) Evaluasi":
      - Tampilan nilai asli (Entry, Original Exit, Original Return).
      - Input Exit Price baru (auto-compute return baru).
      - Input Alasan Override (wajib untuk audit log).
      - Feedback sukses dan auto-refresh.
- **Verification:**
  - Lint: PASS (Backend: 0 errors/warnings | Frontend: 0 errors/warnings)
  - Backend Unit Tests: PASS (12/12 test suites, 74/74 tests passed)
  - Backend E2E Tests: PASS (6/6 test suites, 31/31 tests passed)
  - Backend Build: PASS (`nest build`, exit code 0)
  - Frontend Build: PASS (`next build`, 9/9 routes compiled, exit code 0)
  - Live REST Test: PASS (Evaluasi live, pembulatan fraksi bursa IDX, trigger candle evidence, dan manual override audit log terverifikasi)
- **Decisions:**
  - Evaluasi wajib 100% deterministik untuk menjamin keadilan turnamen, replikabilitas, dan compliance.
  - Sifat fraksi harga IDX dipisahkan dalam service tersendiri (`PriceFractionService`) agar mudah disesuaikan bila bursa mengubah aturan tick.
- **Next Milestone:** M6 — Points & Results Calculation (Leaderboard calculation rules, rank allocation, multi-day aggregate points)



