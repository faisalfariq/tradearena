# TradeArena

[![Architecture: Modular Monolith](https://img.shields.io/badge/Architecture-Modular%20Monolith-blue.svg)](docs/architecture/overview.md)
[![Backend: NestJS 10](https://img.shields.io/badge/Backend-NestJS%2010-ea2845.svg)](https://nestjs.com/)
[![Frontend: Next.js 14](https://img.shields.io/badge/Frontend-Next.js%2014-black.svg)](https://nextjs.org/)
[![Database: PostgreSQL 16](https://img.shields.io/badge/Database-PostgreSQL%2016-336791.svg)](https://www.postgresql.org/)
[![ORM: Prisma 5](https://img.shields.io/badge/ORM-Prisma%205-2d3748.svg)](https://www.prisma.io/)
[![Status: MVP Complete](https://img.shields.io/badge/Status-MVP%20Complete%20(M0--M9)-brightgreen.svg)](docs/progress.md)

**TradeArena** adalah platform otomatisasi evaluasi turnamen stock-picking pasar modal Indonesia (Bursa Efek Indonesia / IDX). Platform ini menggantikan proses penjurian manual post-market yang memakan waktu berjam-jam menjadi pipeline evaluasi deterministik yang berjalan dalam hitungan detik.

---

## 📑 Daftar Isi
- [Alur Kerja & Prinsip Sistem](#-alur-kerja--prinsip-sistem)
- [Fitur Utama](#-fitur-utama)
- [Struktur Monorepo](#-struktur-monorepo)
- [Persyaratan Sistem](#-persyaratan-sistem)
- [Panduan Memulai Cepat (Quick Start)](#-panduan-memulai-cepat-quick-start)
- [Kredensial Default Seed](#-kredensial-default-seed)
- [Panduan Operasional Turnamen](#-panduan-operasional-turnamen)
- [Deployment Produksi (Docker Compose)](#-deployment-produksi-docker-compose)
- [Katalog API & Swagger](#-katalog-api--swagger)
- [Pengujian & Verifikasi Kualitas](#-pengujian--verifikasi-kualitas)
- [Status Milestone & Definition of Done](#-status-milestone--definition-of-done)

---

## 🔄 Alur Kerja & Prinsip Sistem

TradeArena dibangun di atas prinsip fundamental:
> **"Data First $\rightarrow$ Deterministic Evaluation $\rightarrow$ Auditable Result $\rightarrow$ Points $\rightarrow$ Leaderboard"**

```text
PESERTA SUBMIT PICK (SEBELUM MARKET OPEN)
                    ↓
IDX MARKET CLOSE (16:00 WIB) & POST-CLOSING (16:15 WIB)
                    ↓
CRON SCHEDULER OTOMATIS (16:15 WIB, SENIN–JUMAT)
                    ↓
POST-MARKET PIPELINE ORCHESTRATION:
  [1] Koleksi Emiten Unik dari Seluruh Pick Turnamen
  [2] Sinkronisasi Data Historis Intraday 1-Menit per Emiten
  [3] Evaluasi Deterministik Per Saham (Cut Loss / Trailing Stop)
  [4] Kalkulasi Poin & Pemeringkatan Klasemen Resmi
  [5] Pencatatan Riwayat Audit Trail Permanen
                    ↓
KLASEMEN RESMI & KONSOL EXCEPTION ADMIN TERPERBARUI SECARA REAL-TIME
```

---

## ✨ Fitur Utama

1. **Evaluasi Deterministik 100% Non-AI**:
   - Menghitung **Cut Loss (-3% batas stop minimum)** dan **Trailing Stop (-3% dari puncak tertinggi / high watermark)** menit ke menit secara berurutan.
   - Mengikuti **Aturan Fraksi Harga IDX (Tick Size V1)** untuk menentukan level harga valid bursa yang dapat dieksekusi secara nyata (*distinction between theoretical threshold vs actual exit price*).
   - Penanganan ambiguitas candle (*High & Low menembus exit level pada menit yang sama*) sesuai kebijakan turnamen (`CONSERVATIVE_LOSS_FIRST`).
   - Fallback otomatis ke harga penutupan bursa (`MARKET_CLOSE`) jika stop tidak pernah tersentuh sepanjang hari.
2. **Post-Market Pipeline & Scheduler Otomatis**:
   - Scheduler `@Cron('15 16 * * 1-5', { timeZone: 'Asia/Jakarta' })` yang memicu pemrosesan harian secara otomatis pada pukul 16:15 WIB setiap hari kerja.
   - Pipeline idempoten yang aman dijalankan ulang (*re-run / retry*) kapan saja tanpa menghasilkan duplikasi poin.
3. **Pusat Penanganan Exception & Manual Override**:
   - Mendeteksi otomatis trade yang berstatus `REVIEW_REQUIRED` (misalnya lonjakan anomali data bursa) atau `PENDING_DATA`.
   - Tombol satu-klik *Retry Evaluasi* dan modal *Manual Override* yang mewajibkan input alasan tertulis serta mencatat seluruh bukti data sebelumnya ke dalam audit trail permanen.
4. **Scoring & Multi-Tier Tie-Breaking Engine**:
   - Menghitung poin persentase (`1% return = 1.0000 poin`) dengan aturan penalti return negatif yang simetris.
   - Pemeringkatan deterministik berjenjang: Total Poin $\rightarrow$ Win Rate % $\rightarrow$ Rata-rata Return % $\rightarrow$ Jumlah Evaluasi $\rightarrow$ Alfabetis Nama.
5. **Dashboard Operasional & Broadcast-Ready Leaderboard**:
   - Dashboard admin terpusat dengan indikator kesehatan turnamen, metrik performa, dan feed evaluasi terkini.
   - Halaman klasemen publik `/tournaments/[id]/leaderboard` dengan visual podium juara Top 3 (Emas, Perak, Perunggu) dan bukti audit candle OHLC yang dapat diinspeksi.

---

## 📁 Struktur Monorepo

```text
tradearena/
├── backend/                        # NestJS Modular Monolith API
│   ├── src/
│   │   ├── auth/                   # JWT Auth, Refresh Rotation, Role Guards
│   │   ├── automation/             # Pipeline Orchestrator, Cron Scheduler, Exceptions
│   │   ├── dashboard/              # Centralized Platform Operational Metrics
│   │   ├── evaluation/             # Deterministic Trade Evaluation Engine & Price Fractions
│   │   ├── market-data/            # Intraday Candle Normalizer & Provider Adapters
│   │   ├── participants/           # Participant Registry
│   │   ├── picks/                  # Daily Stock Pick Ingestion & Validation
│   │   ├── results/                # Points Calculation & Dynamic Leaderboard
│   │   ├── stocks/                 # IDX Stock Ticker Master
│   │   └── tournaments/            # Tournament Lifecycle & Rules Engine
│   ├── prisma/                     # Database Schema & Migrations
│   ├── test/                       # Comprehensive E2E Test Suites
│   └── Dockerfile                  # Multi-stage production container
├── frontend/                       # Next.js 14 App Router Web Client
│   ├── src/
│   │   ├── app/                    # Pages: /, /tournaments, /participants, /stocks, /login
│   │   │   └── tournaments/[id]/   # Tabbed detail console & /leaderboard public view
│   │   └── components/             # Reusable UI components & Navbar
│   └── Dockerfile                  # Multi-stage production container
├── docs/                           # Dokumentasi Arsitektur, ADR, dan Progress M0–M9
├── scripts/
│   └── run-dev.js                  # Cross-platform development orchestrator
├── docker-compose.yml              # Dev containers (PostgreSQL 16 & Redis 7)
├── docker-compose.prod.yml         # Full-stack production compose (DB, Redis, API, Web)
├── run.bat                         # Launcher sekali-klik untuk Windows
├── run.sh                          # Launcher sekali-klik untuk Linux/macOS
└── README.md                       # Dokumentasi utama proyek
```

---

## 🛠️ Persyaratan Sistem

- **Node.js**: `>= 20.x` (Direkomendasikan Node.js LTS v20 atau v22)
- **npm**: `>= 10.x`
- **PostgreSQL**: `16.x` (Lokal via Laragon/Postgres service, atau via Docker)
- **Redis**: `7.x` (Opsional untuk background queue)
- **Docker & Docker Compose**: (Opsional, untuk containerized deployment)

---

## ⚙️ Panduan Memulai Cepat (Quick Start)

### 1. Salin Konfigurasi Lingkungan
```bash
cp .env.example .env
cp .env.example backend/.env
```

### 2. Pasang Dependensi
```bash
npm install
npm --prefix backend install
npm --prefix frontend install
```

### 3. Setup Database & Jalankan Migrasi
Pastikan PostgreSQL berjalan pada port 5432, kemudian jalankan:
```bash
npm --prefix backend run prisma:generate
npx --prefix backend prisma migrate deploy
npm --prefix backend run seed
```

### 4. Jalankan Aplikasi

**Di Windows:**
Cukup klik ganda atau jalankan di command prompt:
```cmd
run.bat
```

**Di Linux / macOS / Git Bash:**
```bash
chmod +x run.sh
./run.sh
```

Layanan akan aktif secara bersamaan:
- **Frontend Web UI**: [http://localhost:4444](http://localhost:4444)
- **Backend API**: [http://localhost:3333/api/v1](http://localhost:3333/api/v1)
- **Dokumentasi Swagger**: [http://localhost:3333/api/docs](http://localhost:3333/api/docs)
- **Health Check**: [http://localhost:3333/api/v1/health](http://localhost:3333/api/v1/health)

---

## 🔐 Kredensial Default Seed

Setelah menjalankan perintah `npm --prefix backend run seed`, gunakan akun administrator berikut untuk masuk ke sistem:

| Peran | Email | Password |
| :--- | :--- | :--- |
| **Super Admin** | `admin@tradearena.local` | `AdminSecurePass123!` |

Turnamen contoh aktif otomatis dibuat: **"BSJP Championship Musim 1 — 2026"** lengkap dengan 5 peserta terdaftar, master emiten IDX (BBCA, BBRI, TLKM, ASII, BMRI), sample picks, data candle intraday, dan riwayat evaluasi.

---

## 📋 Panduan Operasional Turnamen

### A. Eksekusi Harian Otomatis (Default 16:15 WIB)
- Sistem scheduler di backend secara otomatis mendeteksi seluruh turnamen berstatus `ACTIVE` setiap hari bursa pada pukul 16:15 WIB.
- Seluruh stock pick akan ditarik datanya, dihitung exit price dan return-nya, serta klasemen diperbarui secara instan.

### B. Memicu Pipeline Manual On-Demand
1. Buka browser ke `http://localhost:4444` dan login sebagai Admin.
2. Masuk ke halaman detail turnamen: `Turnamen` $\rightarrow$ pilih turnamen aktif.
3. Klik tab **"Otomasi & Exceptions"** (Tab 7).
4. Pilih tanggal perdagangan yang ingin diproses, lalu klik tombol **"Jalankan Pipeline Harian"**.
5. Stepper visual 4 tahap akan menampilkan progres dan metrik real-time.

### C. Penanganan Exception & Dispute (Banding)
1. Jika terdapat trade yang berstatus `REVIEW_REQUIRED` atau `PENDING_DATA`, trade tersebut akan muncul pada tabel **Pusat Exception**.
2. Klik tombol **"Retry Evaluasi"** untuk mencoba ulang sinkronisasi data bursa.
3. Jika terdapat situasi khusus (misal: suspensi mendadak atau penyesuaian aksi korporasi), klik **"Manual Override"**, masukkan harga exit baru dan alasan lengkap. Sistem akan menyimpan hasil evaluasi lama dan mencatat alasan override ke log audit.

### D. Siaran Langsung Klasemen Publik (Live Broadcast / Proyektor)
- Buka alamat URL: `http://localhost:4444/tournaments/[id]/leaderboard`.
- Halaman ini dirancang bersih bebas dari tombol aksi admin sehingga aman disiarkan langsung ke peserta atau livestream komunitas.

---

## 🐳 Deployment Produksi (Docker Compose)

Untuk menjalankan seluruh platform (PostgreSQL, Redis, Backend, dan Frontend) dalam satu perintah produksi:

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

Perintah ini akan membangun container multi-stage yang aman (menjalankan non-root user `nodejs`/`nestjs`), menerapkan migrasi database secara otomatis, dan membuka port:
- Frontend: `http://localhost:4444`
- Backend API: `http://localhost:3333/api/v1`

Untuk menghentikan layanan:
```bash
docker compose -f docker-compose.prod.yml down
```

---

## 📡 Katalog API & Swagger

Dokumentasi OpenAPI / Swagger interaktif tersedia lengkap di [http://localhost:3333/api/docs](http://localhost:3333/api/docs).

### Ringkasan Endpoint Inti

| Modul | Method | Endpoint | Akses | Deskripsi |
| :--- | :--- | :--- | :--- | :--- |
| **Health** | `GET` | `/api/v1/health` | Publik | Status kesehatan API, uptime, dan konektivitas DB |
| **Auth** | `POST` | `/api/v1/auth/login` | Publik | Login user & perolehan Access/Refresh Token |
| **Auth** | `GET` | `/api/v1/auth/me` | Auth | Cek profil user yang sedang login |
| **Dashboard**| `GET` | `/api/v1/dashboard/stats` | Admin | Metrik statistik operasional platform real-time |
| **Tournaments**| `GET` | `/api/v1/tournaments` | Publik | Daftar turnamen |
| **Tournaments**| `POST` | `/api/v1/tournaments` | Admin | Pembuatan turnamen baru & konfigurasi rules |
| **Picks** | `POST` | `/api/v1/tournaments/:id/picks` | Admin | Input & konfirmasi stock pick peserta harian |
| **Market Data**| `POST` | `/api/v1/tournaments/:id/market-data/sync` | Admin | Sinkronisasi manual data intraday bursa |
| **Evaluation** | `POST` | `/api/v1/evaluations/tournament/:id/day` | Admin | Evaluasi deterministik seluruh trade harian |
| **Evaluation** | `POST` | `/api/v1/evaluations/:id/override` | Admin | Manual override hasil evaluasi dengan catatan audit |
| **Results** | `GET` | `/api/v1/tournaments/:id/results/overall` | Publik | Klasemen akumulasi turnamen & podium Top 3 |
| **Results** | `GET` | `/api/v1/tournaments/:id/results/daily` | Publik | Rincian hasil dan peringkat sesi harian |
| **Automation** | `POST` | `/api/v1/tournaments/:id/pipeline/run` | Admin | Menjalankan pipeline pasca-market lengkap |
| **Automation** | `GET` | `/api/v1/tournaments/:id/exceptions` | Admin | Inventarisasi trade berstatus exception |
| **Automation** | `POST` | `/api/v1/evaluations/:id/retry` | Admin | Retry sinkronisasi & evaluasi trade individual |
| **Automation** | `GET` | `/api/v1/tournaments/:id/audit-trail` | Admin | Riwayat rekaman audit operasional turnamen |

---

## 🧪 Pengujian & Verifikasi Kualitas

Semua modul diverifikasi dengan automated test suites:

```bash
# 1. Jalankan Unit Tests Backend (16 test suites, 95 tests)
npm --prefix backend test

# 2. Jalankan End-to-End (E2E) Tests Backend (8 test suites, 45 tests)
npm --prefix backend run test:e2e

# 3. Jalankan Linter Backend & Frontend
npm --prefix backend run lint
npm --prefix frontend run lint

# 4. Uji Kompilasi Bundle Produksi
npm --prefix backend run build
npm --prefix frontend run build

# 5. Jalankan Verifikasi Sistem Lengkap (Master MVP Verification)
node scratch/verify-m9.js
```

---

## 🏆 Status Milestone & Definition of Done

TradeArena telah menyelesaikan seluruh 10 Milestone pengembangan sesuai spesifikasi `tradearena-prd.md`:

| Milestone | Ruang Lingkup | Status | Tanggal Penyelesaian |
|---|---|---|---|
| **M0** | Project Bootstrap & Monorepo Architecture | **COMPLETED** | 2026-09-05 |
| **M1** | Authentication, JWT Rotation & User Management | **COMPLETED** | 2026-09-05 |
| **M2** | Tournament Core, Lifecycle & Rules Engine | **COMPLETED** | 2026-09-05 |
| **M3** | Participants, IDX Stock Master & Pick Ingestion | **COMPLETED** | 2026-09-06 |
| **M4** | Intraday Market Data Provider & Normalizer | **COMPLETED** | 2026-09-06 |
| **M5** | Deterministic Trade Evaluation Engine (CL & TS) | **COMPLETED** | 2026-09-06 |
| **M6** | Scoring, Points Engine & Multi-Tier Tie-Breaking | **COMPLETED** | 2026-09-06 |
| **M7** | Admin Operations Dashboard & Broadcast Leaderboard | **COMPLETED** | 2026-09-06 |
| **M8** | Post-Market Pipeline Orchestrator & Exceptions | **COMPLETED** | 2026-09-06 |
| **M9** | MVP Stabilization, Security Hardening & Release Sign-Off | **COMPLETED** | 2026-09-06 |

Lihat dokumentasi lengkap di [`docs/progress.md`](docs/progress.md).
