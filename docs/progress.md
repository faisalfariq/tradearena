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
| **M6** | Points & Results | **COMPLETED** | 2026-09-06 |
| **M7** | Leaderboard & Dashboard | **COMPLETED** | 2026-09-06 |
| **M8** | Automation & Exception Handling | **COMPLETED** | 2026-09-06 |
| **M9** | MVP Stabilization | **COMPLETED** | 2026-09-06 |
| **M10** | User Roles, Google SSO & Participant Approval | **COMPLETED** | 2026-09-06 |
| **M11** | Participant Self-Service Portal & 08:45 WIB Lock | **COMPLETED** | 2026-09-25 |
| **M12** | Cloud Deployment | **PENDING** | - |
| **M13** | Live Market Dry Run & Backtesting | **PENDING** | - |

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
- **Next Milestone:** M6 — Results & Standings Engine

---

### M6 — Results & Standings Engine
- **Status:** COMPLETED
- **Completion Date:** 2026-09-06
- **Implemented Scope:**
  - **Scoring & Points Engine (`ResultsService`):**
    * Kalkulasi poin berbasis rule turnamen (`PERCENTAGE_RETURN_V1`): 1% return = 1.0000 poin. Return negatif mengurangi poin secara simetris.
    * Agregasi performa peserta multi-hari: total poin akumulasi, jumlah pick dievaluasi, jumlah menang (W), kalah (L), seri/breakeven (B), win rate %, dan average return %.
    * Identifikasi otomatis emiten dengan return terbaik (*Best Pick*) dan return terburuk (*Worst Pick*) per peserta.
  - **Deterministic Multi-Tier Tie-Breaking:**
    * Peringkat klasemen turnamen deterministik: Total Points (DESC) -> Win Rate (DESC) -> Average Return (DESC) -> Evaluated Picks Count (DESC) -> Nama Peserta (ASC).
  - **Daily Results & Intraday Breakdown:**
    * `GET /api/v1/tournaments/:id/results/daily`: Mendukung parameter tanggal harian opsional (default ke `startDate` turnamen).
    * `GET /api/v1/tournaments/:id/results/overall`: Rekap klasemen akumulasi turnamen.
    * `POST /api/v1/tournaments/:id/results/recalculate`: Kalkulasi ulang seluruh perolehan poin dan klasemen oleh Admin.
  - **Frontend Tab 6: "Hasil & Klasemen" (`/tournaments/[id]`):**
    * Mode switcher: Klasemen Akumulasi (Overall) vs Hasil Harian (Daily).
    * Podium Juara Top 3 (Emas #1, Perak #2, Perunggu #3) dengan kartu metrik visual, lencana win rate, dan emiten terbaik.
    * Tabel Klasemen Turnamen Lengkap: Peringkat, Peserta, Poin Akumulasi, Total Pick, Rekor W/L/B, Win Rate badge, Rata-rata Return %, dan chip emiten terbaik/terburuk.
    * Tabel Hasil Harian dengan date picker terintegrasi.
    * Tombol aksi Admin "Hitung Ulang Klasemen" dengan feedback loading dan toast notifikasi.
- **Verification:**
  - Backend Build: PASS (`nest build`, exit code 0)
  - Frontend Build: PASS (`next build`, 9/9 routes compiled, 0 lint/type errors, exit code 0)
  - Live Database Verification (`verify-m6.js`): PASS (Admin auth, recalculate endpoint, query klasemen akumulasi, dan query hasil harian berhasil)
- **Decisions:**
  - Ranking dihitung dinamis dari data evaluasi dan poin otoritatif tanpa menyimpan static rank di database.
- **Next Milestone:** M7 — Leaderboard & Dashboard

---

### M7 — Leaderboard & Dashboard
- **Status:** COMPLETED
- **Completion Date:** 2026-09-06
- **Implemented Scope:**
  - **Backend Dashboard Module (`DashboardService` & `DashboardController`):**
    * `GET /api/v1/dashboard/stats`: Endpoint statistik terpusat platform yang diamankan dengan `JwtAuthGuard` dan `Roles(Role.ADMIN)`.
    * Agregasi real-time: jumlah turnamen aktif vs total, total peserta terdaftar, total pick, total evaluasi trade selesai, total review yang diperlukan (exceptions), dan total emiten aktif.
    * Ringkasan turnamen aktif beserta jumlah pendaftar dan total pick.
    * Feed evaluasi trade terkini lengkap dengan emiten, return %, alasan exit, dan peserta.
  - **Frontend Admin Operations Dashboard (`/`):**
    * Tampilan cerdas berbasis role: pengunjung umum melihat landing page edukatif, sementara Admin yang terautentikasi langsung disajikan Operations Dashboard.
    * 4 Kartu Metrik Kunci: Turnamen Aktif (dengan indikator status real-time), Peserta Terdaftar, Evaluasi Trade Selesai, dan Status Review/Audit.
    * Hub Turnamen Aktif: Kartu turnamen interaktif dengan rincian jadwal, status, jumlah peserta, serta tautan cepat ke Detail Turnamen dan Klasemen Publik.
    * Panel Aksi Cepat: Akses satu klik ke pembuatan turnamen baru, master emiten saham, data peserta, dan Swagger API docs.
    * Tabel Evaluasi Trade Terkini dengan indikator badge return hijau/merah dan status deterministik bursa IDX.
  - **Broadcast-Ready Public Leaderboard (`/tournaments/[id]/leaderboard`):**
    * Halaman khusus klasemen publik yang dirancang bersih untuk peserta turnamen, komunitas, dan proyektor/livestream.
    * Podium Juara Top 3 (#1 Gold Trophy, #2 Silver Medal, #3 Bronze Medal) menampilkan poin akumulasi, win rate %, rekor W/L/B, dan trade terbaik.
    * Tampilan dwimode yang responsif: Klasemen Akumulasi Turnamen dan Hasil Sesi Harian (dengan pemilih tanggal dan kartu sorotan Top Gainer).
    * Modal inspeksi Bukti Audit Terbuka (OHLC candle pemicu bursa, perhitungan fraksi harga IDX, dan kronologi menit ke menit).
  - **Navbar Enhancements (`Navbar.tsx`):**
    * Tautan "Dashboard" dinamis untuk Admin yang sedang login dan status indikator API real-time.
- **Verification:**
  - Lint: PASS (Backend: 0 errors/warnings | Frontend: 0 errors/warnings)
  - Backend Unit Tests: PASS (15/15 test suites, 91/91 tests passed)
  - Backend Build: PASS (`nest build`, exit code 0)
  - Frontend Build: PASS (`next build`, 10/10 routes compiled, 0 lint/type errors, exit code 0)
  - Live Database Verification (`verify-m7.js`): PASS (Admin auth, dashboard stats, query leaderboard publik, dan pemeriksaan route HTTP 200)
- **Decisions:**
  - Halaman utama (root `/`) dibuat adaptif: menyajikan landing hero konversi untuk publik dan dashboard operasional real-time untuk admin.
  - Halaman leaderboard publik (`/tournaments/[id]/leaderboard`) dipisahkan dari konsol admin agar bebas dari tombol manipulasi data saat disiarkan ke publik/peserta.
- **Next Milestone:** M8 — Automation & Exception Handling

---

### M8 — Automation & Exception Handling
- **Status:** COMPLETED
- **Completion Date:** 2026-09-06
- **Implemented Scope:**
  - **Backend Automation Module (`AutomationService`, `AutomationController`, `AutomationScheduler`, `AutomationModule`):**
    * Orkesktasi Pipeline Pasca-Market Terpadu (`runDailyPipeline`): 4-step pipeline sekuensial dan atomik:
      1. Koleksi Stock Pick terkonfirmasi turnamen untuk tanggal perdagangan target.
      2. Sinkronisasi data intraday bursa untuk seluruh emiten unik pick.
      3. Eksekusi evaluasi deterministik (Cut Loss / Trailing Stop) dengan pencatatan status exception.
      4. Kalkulasi ulang perolehan poin dan peringkat klasemen turnamen secara instan.
      5. Pencatatan audit trail permanen dengan metadata lengkap metrik pemrosesan.
    * Scheduler Cron Otomatis: `@Cron('15 16 * * 1-5', { timeZone: 'Asia/Jakarta' })` yang berjalan setiap hari bursa (Senin-Jumat) pukul 16:15 WIB untuk seluruh turnamen berstatus `ACTIVE`.
    * Exception Handling & Recovery Center:
      * Identifikasi trade yang berstatus `REVIEW_REQUIRED` (ambiguitas candle ekstrem) atau `PENDING_DATA` (data bursa belum lengkap).
      * Endpoint `GET /api/v1/tournaments/:tournamentId/exceptions` untuk inventarisasi exception.
      * Endpoint `POST /api/v1/evaluations/:id/retry` untuk coba ulang sinkronisasi bursa dan evaluasi ulang trade pick secara individual.
      * Integrasi mulus dengan modal manual override untuk penyelesaian sengketa manual oleh admin.
    * Riwayat Audit Log Operasional:
      * Endpoint `GET /api/v1/tournaments/:tournamentId/audit-trail` untuk melacak seluruh aktivitas pipeline harian, retry, dan override.
  - **Frontend Tab 7: "Otomasi & Exceptions" (`/tournaments/[id]`):**
    * Toolbar eksekusi on-demand dengan date picker dan tombol "Jalankan Pipeline Harian".
    * Stepper visual 4 tahap real-time dengan status badge (Berhasil, Peringatan, Dilewati, Gagal) dan metrik pill (jumlah pick, emiten unik, evaluasi selesai, poin dihitung).
    * Exception Center Management Table: Daftar emiten/peserta yang membutuhkan tindakan dengan tombol aksi "Retry" dan "Override".
    * Tabel Riwayat Audit Trail Operasional dengan timeline aktivitas admin/sistem.
- **Verification:**
  - Backend Unit Tests: PASS (`automation.service.spec.ts`, 4/4 passed)
  - Backend Lint & Build: PASS (`nest build`, exit code 0)
  - Frontend Lint & Build: PASS (`next build`, 10/10 routes compiled, 0 lint/type errors, exit code 0)
  - Live End-to-End Test (`verify-m8.js`): PASS (Admin auth, eksekusi pipeline lengkap 4 step, query exceptions, query audit trail, dan pemeriksaan HTTP 200 Tab 7)
- **Decisions:**
  - Pipeline dirancang idempoten sehingga dapat dijalankan ulang berkali-kali secara aman (manual on-demand maupun cron) tanpa merusak konsistensi data poin.
  - Jika tanggal yang diproses tidak memiliki stock pick, langkah sinkronisasi dan evaluasi dilewati (`SKIPPED`) dengan anggun tanpa menggagalkan keseluruhan pipeline.
- **Next Milestone:** M9 — MVP Stabilization

---

### M9 — MVP Stabilization
- **Status:** COMPLETED
- **Completion Date:** 2026-09-06
- **Implemented Scope:**
  - **Security & Token Hardening:**
    * Penambahan identifikasi unik kriptografis `jti: randomUUID()` pada pembuatan JWT Access Token dan Refresh Token (`AuthService.generateTokens`). Mencegah tabrakan unique constraint token pada konkurensi tinggi dan pengujian paralel.
    * Hardening `ValidationPipe` di `backend/src/main.ts` (`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`).
    * Konfigurasi CORS origin dinamis dan dukungan credentials untuk lingkungan dev, staging, dan container Docker.
    * Konfigurasi standardized graceful shutdown hooks (`app.enableShutdownHooks()`).
  - **End-to-End Test Suite Completion:**
    * Penambahan `backend/test/automation.e2e-spec.ts` yang mencakup seluruh alur pipeline harian, query exception, retry evaluasi, dan query audit trail.
    * Seluruh 8 test suites E2E lulus 100% (45/45 tests passed).
  - **Database Migration & Schema Integrity:**
    * Inisialisasi migration resmi PostgreSQL pertama: `backend/prisma/migrations/20260905000000_init/migration.sql`.
    * Verifikasi status migrasi bersih: `Database schema is up to date!` (1 migration found).
    * Idempoten dan siap untuk deploy otomatis container (`npx prisma migrate deploy`).
  - **Containerization & Deployment Packaging:**
    * Multi-stage production `Dockerfile` untuk NestJS backend (non-root `nestjs` user, dumb-init, Alpine Linux).
    * Multi-stage production `Dockerfile` untuk Next.js frontend (non-root `nextjs` user, dumb-init, Alpine Linux).
    * Konfigurasi full-stack `docker-compose.prod.yml` mencakup PostgreSQL 16, Redis 7, Backend API, dan Frontend UI.
  - **Comprehensive Master Documentation:**
    * Pembaruan menyeluruh `README.md` dengan badge arsitektur, diagram alur data, runbook operasional bursa 16:15 WIB, panduan quickstart (`run.bat` / `run.sh`), kredensial seed admin, katalog API Swagger, dan deployment Docker.
- **Verification:**
  - Backend Unit Tests: PASS (16/16 test suites, 95/95 tests passed)
  - Backend E2E Tests: PASS (8/8 test suites, 45/45 tests passed)
  - Backend Lint & Build: PASS (`nest build`, exit code 0)
  - Frontend Lint & Build: PASS (`next build`, 10/10 routes compiled, 0 lint/type errors, exit code 0)
  - Prisma Migration Status: PASS (1 migration, schema is up to date)
  - Master MVP System Verification (`scratch/verify-m9.js`): PASS (10/10 sistem check lulus 100%)

---

## 🎖️ Master MVP Release Sign-Off Report

Sesuai ketentuan **PRD Section 51 (MVP Release Criteria)** dan **PRD Section 55 (Engineering Priority)**:

| Kriteria Rilis MVP (PRD §51) | Bukti Verifikasi Repositori | Status |
| :--- | :--- | :---: |
| **Admin can login** | `POST /api/v1/auth/login` + JWT Access/Refresh Rotation + E2E Tests | **SATISFIED** |
| **Tournament & rules can be configured** | `TournamentModule` + CL/TS policies + IDX Price Fraction rules | **SATISFIED** |
| **Participants & picks can be managed** | `ParticipantsModule` + `PicksModule` + validasi batas jam bursa | **SATISFIED** |
| **Historical intraday data synchronized** | `MarketDataModule` + 1-min canonical candles + normalizer | **SATISFIED** |
| **Evaluation handles CL & trailing stop** | `TradeEvaluationEngine` + Cut Loss (-3%) & Trailing Stop (-3%) | **SATISFIED** |
| **-3% treated as minimum stop threshold** | Logika pemisahan theoretical threshold vs actual price level | **SATISFIED** |
| **Actual valid exit level determines result** | `PriceFractionService` berbasis fraksi harga resmi bursa IDX | **SATISFIED** |
| **Market close fallback works** | Exit reason `MARKET_CLOSE` pada candle penutupan jika tidak tersentuh | **SATISFIED** |
| **Result calculation reproducible** | 100% deterministik non-LLM, versioned calculation rule `v1.0.0` | **SATISFIED** |
| **Points generated** | `ResultsService` (`PERCENTAGE_RETURN_V1`: 1% return = 1.0000 poin) | **SATISFIED** |
| **Daily result generated** | `GET /api/v1/tournaments/:id/results/daily` + breakdown metrik | **SATISFIED** |
| **Overall leaderboard generated** | `GET /api/v1/tournaments/:id/results/overall` + multi-tier tie-breaking | **SATISFIED** |
| **Exceptions visibly flagged** | `REVIEW_REQUIRED` & `PENDING_DATA` tercatat dan ber-badge kuning | **SATISFIED** |
| **Manual override audited** | `POST /api/v1/evaluations/:id/override` + audit trail log permanen | **SATISFIED** |
| **Responsive admin UI usable** | Next.js 14 Dark-Mode UI: Dashboard, 7 Tab Detail, & Public Leaderboard | **SATISFIED** |
| **Critical tests pass** | Unit (95/95) + E2E (45/45) = 140/140 automated tests passed | **SATISFIED** |
| **Production builds pass** | Backend `nest build` (code 0) + Frontend `next build` (code 0) | **SATISFIED** |
| **Clean DB migration works** | `prisma/migrations/20260905000000_init/migration.sql` up to date | **SATISFIED** |
| **Documentation exists** | `README.md`, `docs/architecture/`, ADRs, & Runbook operasional | **SATISFIED** |

**KESIMPULAN:** SELURUH 10 MILESTONE (M0 s.d. M9) SELESAI SECARA PURNA (100% DEFINITION OF DONE TERCAPAI). TRADEARENA SIAP UNTUK PRODUCTION MVP RELEASE.

---

### M10 — User Roles, Google SSO & Tournament Participant Approval
- **Status:** COMPLETED
- **Completion Date:** 2026-09-06
- **Implemented Scope:**
  - Refactoring Role Otorisasi Sistem: 2 Role baku (`ADMIN` & `USER`).
  - Google SSO Integration (`POST /api/v1/auth/google`) dengan auto-provisioning role `USER`.
  - Halaman Konsol Pengguna (`/users`) untuk manajemen role user oleh Super Admin.
  - Alur Persetujuan Kepesertaan Turnamen (`apply`, `my-status`, `applicants`, `review` dengan status `PENDING`, `APPROVED`, `REJECTED`, `DISQUALIFIED`).
  - Integrasi Manajemen Peserta Berlingkup Turnamen langsung di `/tournaments/[id]` (Tab Peserta Terdaftar: enroll multi-mode, diskualifikasi dengan input alasan, pulihkan, dan unenroll).
  - Custom Glassmorphic Confirmation Modals menggantikan seluruh dialog browser bawaan (`confirm()` dan `prompt()`).

---

### M11 — Participant Self-Service Portal & 08:45 WIB Lock
- **Status:** COMPLETED
- **Completion Date:** 2026-09-25
- **Implemented Scope:**
  - Endpoint Mandiri Peserta:
    - `GET /api/v1/tournaments/:id/my-pick`: Mengambil status kepesertaan, pick aktif hari ini, dan status kunci 08:45 WIB.
    - `POST /api/v1/tournaments/:id/my-pick`: Submit atau update pick saham harian mandiri untuk peserta berstatus `APPROVED`.
    - `DELETE /api/v1/tournaments/:id/my-pick/:pickId`: Membatalkan pick mandiri sebelum pukul 08:45 WIB.
    - `GET /api/v1/my-tournaments/picks-overview`: Ringkasan seluruh turnamen aktif yang diikuti user beserta status pick hari ini.
  - Penegakan Aturan Kunci Otomatis (08:45:00 WIB Lock Enforcement):
    - Pengiriman, pengubahan, dan pembatalan pick untuk hari ini ditolak setelah pukul 08:45 WIB (`403 Forbidden`).
    - Dukungan konfigurasi fleksibel `BYPASS_PICK_LOCK=true` untuk pengujian dev.
  - Halaman Baru Portal Peserta (`/my-picks`):
    - Jam Digital Real-time WIB (Asia/Jakarta).
    - Banner Fase Pasar Dinamis (Prapasar buka sebelum 08:45, Sesi Bursa terkunci 08:45–16:00, Pascapasar evaluasi selesai 16:00+).
    - Kartu Formulir Input Pick Saham Interaktif dengan pencarian kode emiten IDX dan kalkulator level Stop Loss otomatis (-3%).
    - Kartu Status Pick Terkonfirmasi dengan ringkasan emiten, harga entry, level cut loss, dan tombol batal/ubah sebelum lock.
    - Tabel Riwayat Pick & Hasil Trade Saya lengkap dengan hasil return realized, outcome, dan modal inspeksi bukti (*Evidence*).
  - Integrasi Menu & Navigasi:
    - Menu sidebar *"Pick Saham Saya"* (`/my-picks`) untuk role `USER` dan `ADMIN`.
    - Tombol cepat prapasar pada halaman detail turnamen (`/tournaments/[id]`) untuk peserta `APPROVED`.
- **Verification:**
  - Unit Tests: 13/13 unit tests lolos (100% pass).
  - Integration Script: `scratch/verify-self-service.js` pass (Login -> Apply -> Approve -> GET my-pick -> POST my-pick -> Overview).
  - Next.js Build/Routing: `/my-picks` HTTP 200 pass.



