# Architecture Overview — TradeArena

## Core Mental Model

```text
PARTICIPANT PICK
        ↓
MARKET CLOSE
        ↓
HISTORICAL INTRADAY MARKET DATA (1-min canonical candles)
        ↓
DETERMINISTIC TRADE EVALUATION ENGINE
        ↓
INITIAL CL (-3% min) / TRAILING STOP (-3% min) / MARKET CLOSE
        ↓
REALIZED RETURN
        ↓
POINTS ENGINE
        ↓
DAILY RESULT
        ↓
LEADERBOARD
```

## Structure
- **Backend:** NestJS Modular Monolith in `/backend`. Provides REST API (`/api/v1`), domain logic, background jobs, and evaluation engine.
- **Frontend:** Next.js in `/frontend`. Mobile-responsive web UI using Tailwind CSS and TanStack Query.
- **Database:** PostgreSQL with Prisma ORM.
- **Queue/Worker:** BullMQ backed by Redis for batch data sync and evaluations.
- **Launchers:** Root `run.sh` and `run.bat` executing concurrent dev processes.
