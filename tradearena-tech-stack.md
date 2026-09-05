# TradeArena — Tech Stack

## Prinsip Pemilihan Teknologi
TradeArena adalah aplikasi turnamen dengan beban transaksi relatif kecil, tetapi memiliki kebutuhan batch evaluation dan integrasi external market data. Stack dipilih untuk development speed, maintainability, self-hosting, dan kemudahan AI Coding Agent mengeksekusi project tanpa overengineering.

| Layer | Technology | Fungsi | Alasan Pemilihan |
|---|---|---|---|
| Architecture | Modular Monolith | Memisahkan domain auth, tournament, participant, picks, market data, evaluation, points, results dalam satu backend deployable. | Scope belum membutuhkan microservices. Lebih mudah dikembangkan, diuji, dan dioperasikan. |
| Repository | Monorepo | `/frontend` dan `/backend` dalam satu repository. | Memudahkan koordinasi FE/BE dan sesuai workflow development project. |
| Frontend | Next.js + TypeScript | Web UI TradeArena. | Ekosistem kuat, routing matang, TypeScript end-to-end, mudah untuk responsive application. |
| Server State | TanStack Query | Fetch/cache/mutation API state. | Mengurangi boilerplate dan mempermudah invalidation dashboard/result. |
| UI | Tailwind CSS + shadcn/ui | Responsive UI component system. | Cepat dikembangkan, fleksibel, cocok untuk desktop dan mobile. |
| Mobile UX | Responsive Web + Bottom Navigation where appropriate | Pengalaman mobile participant/admin. | Tidak perlu native app untuk MVP; tetap nyaman dipakai dari smartphone. |
| Chart | Apache ECharts | Opsional untuk menampilkan intraday price path/evaluation evidence. | Mendukung line/candlestick/annotation dan cukup fleksibel untuk visual audit. |
| Backend | NestJS + TypeScript | REST API, business logic, auth, scheduler, jobs, evaluation engine. | Modular, maintainable, cocok dengan domain project dan TypeScript frontend. |
| Validation | class-validator + class-transformer | DTO/API validation. | Integrasi natural dengan NestJS. |
| Database | PostgreSQL | Transactional data + historical candle + evaluation/result. | Relasional, kuat untuk query/reporting, JSONB tersedia bila perlu, cukup untuk scale MVP. |
| ORM | Prisma | Schema, migration, CRUD utama. | Developer experience baik dan migration mudah diaudit. Raw SQL tetap boleh untuk query kompleks. |
| Authentication | JWT Access Token + Refresh Token | Login dan protected API. | Sederhana untuk SPA/web application dan mudah diintegrasikan dengan RBAC. |
| Authorization | NestJS Guards / RBAC | Membatasi Admin dan future Participant. | Backend tetap menjadi source of truth untuk permission. |
| Market Data | Provider Adapter Interface | Integrasi historical intraday IDX. | Provider bisa diganti tanpa mengubah Trade Evaluation Engine. |
| Canonical Market Data | PostgreSQL table | Menyimpan timestamp + OHLC + provider/source. | Data historical dapat di-reuse oleh banyak participant yang memilih emiten sama. |
| Scheduler | `@nestjs/schedule` | Memicu post-market synchronization. | Cukup ringan untuk jadwal harian. |
| Background Jobs | BullMQ | Fetch market data, batch evaluation, retry. | Cocok untuk job yang dapat gagal/diulang dan tidak seharusnya menahan HTTP request. |
| Queue Backend | Redis | Queue state dan optional cache. | Dibutuhkan BullMQ dan mudah dijalankan via Docker Compose. |
| Cache | Redis (optional usage) | Cache leaderboard/dashboard bila diperlukan. | Sudah tersedia untuk queue; jangan gunakan sebelum ada kebutuhan nyata. |
| Price Fraction Engine | Backend domain service | Mengubah threshold teoritis menjadi valid price level sesuai tournament/IDX fraction policy. | Critical business logic harus deterministic dan mudah dites. |
| Trade Evaluation Engine | Pure TypeScript domain service | CL, trailing stop, peak tracking, exit, realized return. | Pure function/service memudahkan unit test dan reproducibility. |
| Points Engine | Separate backend domain service | Mengubah trade result menjadi points. | Formula point dapat berubah tanpa merusak evaluation engine. |
| API | REST JSON `/api/v1` | Interface frontend-backend. | Sederhana dan cukup untuk kebutuhan MVP. |
| API Documentation | Swagger / OpenAPI | Dokumentasi endpoint. | Mempermudah testing dan future integration. |
| Logging | Pino / nestjs-pino | Structured application/job logging. | Cepat dan cocok untuk tracing sync/evaluation failures. |
| Error Monitoring | Health endpoint + structured logs; Sentry optional | Operational monitoring. | Jangan menambah platform observability berat untuk MVP. |
| Testing Backend | Jest atau Vitest + Supertest | Unit/integration/API testing. | Critical karena fairness tournament bergantung pada calculation correctness. |
| Testing Frontend | Vitest + Testing Library | Component/logic test. | Cukup untuk UI penting. |
| E2E | Playwright | Critical happy-path end-to-end. | Memastikan admin workflow berjalan dari pick hingga result. |
| Containerization | Docker + Docker Compose | PostgreSQL, Redis, backend/frontend. | Mudah untuk local development dan self-hosting. |
| Reverse Proxy | Caddy atau Nginx | HTTPS/routing production. | Ringan dan umum untuk VPS deployment. |
| Deployment | Docker Compose on VPS/Cloud VM | Production deployment awal. | Biaya murah dan cukup untuk komunitas. Kubernetes belum diperlukan. |
| CI | GitHub Actions | Lint, test, build. | Quality gate sederhana dan otomatis. |
| Secrets | `.env` / deployment secrets | API key, JWT secret, DB URL. | Tidak boleh hardcoded atau dikirim ke frontend. |
| Launcher Linux/macOS | `run.sh` | Menjalankan frontend dan backend sekaligus. | Development ergonomics. |
| Launcher Windows | `run.bat` | Menjalankan frontend dan backend sekaligus. | Native untuk workflow Windows. |
| Documentation | README + `/docs` + `prd.md` | Setup, architecture, progress, decisions. | Memungkinkan AI Coding Agent baru melanjutkan project tanpa kehilangan konteks. |

---

## Recommended Repository Structure

```text
TradeArena/
├── frontend/
├── backend/
├── docs/
│   ├── architecture/
│   ├── decisions/
│   └── progress.md
├── prd.md
├── run.sh
├── run.bat
├── docker-compose.yml
├── README.md
├── .env.example
└── .gitignore
```

---

## Technology yang Sengaja Tidak Digunakan pada MVP

TradeArena tidak membutuhkan secara default:

- Microservices
- Kubernetes
- Kafka
- Elasticsearch
- MongoDB
- TimescaleDB
- ClickHouse
- Machine Learning
- Vector Database
- LLM untuk menentukan hasil
- Realtime websocket market feed

Tambahkan hanya jika ada kebutuhan produk yang sudah terbukti.

---

## Data Provider Strategy

Core domain tidak boleh mengetahui detail provider.

```text
External Market Data Provider
        ↓
Provider Adapter
        ↓
Normalizer
        ↓
Canonical Intraday Candle
        ↓
Trade Evaluation Engine
```

Minimal contract:

```ts
interface MarketDataProvider {
  getIntradayCandles(params: {
    symbol: string;
    tradingDate: string;
    interval: '1m';
  }): Promise<IntradayCandle[]>;
}
```

Provider production dipilih berdasarkan:
- coverage saham IDX;
- historical intraday availability;
- data completeness;
- reliability;
- rate limit;
- pricing;
- licensing/redistribution terms.

---

## Critical Engineering Principle

```text
Market Data
    ↓
Deterministic Evaluation
    ↓
Realized Return
    ↓
Points
    ↓
Leaderboard
```

Tidak ada AI di calculation path.
