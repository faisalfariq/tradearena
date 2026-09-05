# TradeArena

Automated stock-picking tournament evaluation platform for Indonesian stock market (IDX) community tournaments.

---

## 🚀 Overview

TradeArena eliminates manual post-market trade evaluation by automating:
1. **Historical Intraday Data Ingestion** (1-minute canonical candles per unique symbol).
2. **Deterministic Evaluation Engine** (Strictly non-LLM algorithmic trade execution).
3. **Cut Loss (-3% minimum threshold)** & **Trailing Stop (-3% static drawdown from peak)**.
4. **Valid Exchange Price Level Execution** (distinguishing theoretical threshold vs actual price level).
5. **Market Close Exit Fallback**.
6. **Auditable Evidence & Manual Override Trail**.
7. **Tournament Scoring & Leaderboard Generation**.

---

## 📁 Monorepo Structure

```text
TradeArena/
├── frontend/               # Next.js 14+ Web UI (Tailwind CSS, TanStack Query)
├── backend/                # NestJS Modular Monolith API & Evaluation Engine
├── docs/
│   ├── architecture/       # Architectural diagrams & specifications
│   ├── decisions/          # Architecture Decision Records (ADRs)
│   └── progress.md         # Detailed milestone tracking
├── run.sh                  # One-click launcher for Linux/macOS/Git Bash
├── run.bat                 # One-click launcher for Windows
├── docker-compose.yml      # PostgreSQL 16 & Redis 7 development containers
├── README.md               # Project documentation & setup instructions
├── .env.example            # Environment variables template
└── .gitignore
```

---

## 🛠️ Prerequisites

- **Node.js**: >= 20.x (Tested with Node.js v22.x)
- **npm**: >= 10.x
- **Docker & Docker Compose**: (Optional, recommended for PostgreSQL & Redis)

---

## ⚙️ Quick Start

### 1. Clone & Configure Environment
```bash
cp .env.example backend/.env
```

### 2. Install Dependencies
```bash
# Install root, backend, and frontend dependencies
npm install
npm --prefix backend install
npm --prefix frontend install
```

### 3. Generate Database Client (Prisma)
```bash
npm --prefix backend run prisma:generate
```

### 4. Run Both Frontend and Backend

**On Linux / macOS / Git Bash:**
```bash
chmod +x run.sh
./run.sh
```

**On Windows:**
```cmd
run.bat
```

Services will start concurrently:
- **Frontend App**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:3001/api/v1](http://localhost:3001/api/v1)
- **Swagger Documentation**: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)
- **Health Check**: [http://localhost:3001/api/v1/health](http://localhost:3001/api/v1/health)

Press `Ctrl+C` in the terminal to cleanly terminate both processes.

---

## 🧪 Testing & Verification

Run tests from the repository root:
```bash
# Backend Unit Tests
npm --prefix backend test

# Backend E2E Tests
npm --prefix backend run test:e2e

# Backend Linting
npm --prefix backend run lint

# Backend Production Build
npm --prefix backend run build

# Frontend Production Build
npm --prefix frontend run build
```

---

## 📜 Development Status & Milestones

See [`docs/progress.md`](docs/progress.md) for milestone breakdown (M0 to M9) and verification logs.
