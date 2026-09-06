# Implementation Plan: Milestone M9 — MVP Stabilization

TradeArena has successfully completed all operational feature milestones (M0 through M8). Milestone **M9: MVP Stabilization** is the final phase to prepare a rock-solid, production-grade MVP release in strict adherence to **PRD Sections 48, 50, 51, 54, and 55**.

---

## User Review Required

> [!IMPORTANT]
> Milestone M9 is the **final release milestone** of TradeArena. Upon approval and execution, all 10 milestones (M0 through M9) will be completely satisfied, verified, documented, and ready for deployment.

> [!NOTE]
> No breaking architectural changes are introduced. All enhancements in M9 focus on stability, test coverage expansion, security hardening, containerization, and production runbook documentation.

---

## Proposed Changes

### 1. Security & Token Generation Hardening

#### [MODIFY] backend/src/auth/auth.service.ts
- Inject cryptographic `jti: randomUUID()` into both Access Token and Refresh Token payloads.
- Guarantees token uniqueness even when multiple tokens are issued to the same user within the same second, eliminating database unique-constraint collisions during concurrent operations and parallel testing.

#### [MODIFY] backend/src/main.ts
- Verify `ValidationPipe` settings: `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`.
- Ensure robust CORS origin handling supporting local dev, custom frontend URLs via environment variables, and Docker network hosts.
- Configure standardized graceful shutdown hooks for container lifecycle management (`app.enableShutdownHooks()`).

---

### 2. End-to-End Test Suite Completion

#### [NEW] backend/test/automation.e2e-spec.ts
- Comprehensive E2E test suite for Milestone M8/M9 automation features:
  * Admin login & tournament pipeline execution (`POST /api/v1/tournaments/:id/pipeline/run`).
  * Exception querying (`GET /api/v1/tournaments/:id/exceptions`).
  * Retry evaluation workflow (`POST /api/v1/evaluations/:id/retry`).
  * Audit trail log retrieval (`GET /api/v1/tournaments/:id/audit-trail`).
  * Verification that unauthenticated and non-admin requests are rejected with 401/403.

---

### 3. Containerization & Deployment Packaging

#### [NEW] backend/Dockerfile
- Multi-stage Docker build for NestJS backend (dependencies -> build -> lightweight alpine production runner with Prisma runtime).

#### [NEW] frontend/Dockerfile
- Standalone multi-stage Docker build for Next.js 14 App Router.

#### [NEW] docker-compose.prod.yml
- Full production stack compose file containing:
  * `postgres`: PostgreSQL 16 Alpine with health check.
  * `redis`: Redis 7 Alpine with health check.
  * `backend`: Production NestJS API on port 3333 with automatic migration deploy on startup.
  * `frontend`: Production Next.js web application on port 4444.
  * Named network & persistent volumes.

---

### 4. Migration & Schema Verification

- Run `prisma migrate status` to confirm all database migrations are cleanly applied.
- Validate that seed script (`backend/prisma/seed.ts`) populates initial admin, test participants, IDX stocks, sample tournament, picks, intraday candles, and evaluation records with zero errors.

---

### 5. Documentation & Operational Runbook

#### [MODIFY] README.md
- Complete master documentation:
  * High-level architectural overview & data flow diagram.
  * Quickstart guide using `run.bat` (Windows) and `run.sh` (Linux/macOS).
  * Production deployment guide via Docker Compose.
  * Default admin credentials & seed data overview.
  * Complete API catalog & interactive Swagger documentation link (`/api/docs`).
  * Operational runbook:
    1. Daily post-market orchestration at 16:15 WIB.
    2. Exception handling & manual override procedures.
    3. Live broadcast leaderboard display guide.

#### [MODIFY] docs/progress.md
- Mark Milestone **M9** as `COMPLETED`.
- Include the official **MVP Release Sign-Off Report** satisfying PRD Sections 51, 54, and 55.

---

## Verification Plan

### Automated Tests
1. **Backend Unit Tests**:
   - `cmd /c "npm --prefix backend test"` (Verify all 16 test suites and 95+ unit tests pass).
2. **Backend E2E Tests**:
   - `cmd /c "npm --prefix backend run test:e2e"` (Verify all 8 E2E test suites pass with 0 failures).
3. **Frontend Linter & Type Check**:
   - `cmd /c "npm --prefix frontend run lint"` (0 errors, 0 warnings).
4. **Production Builds**:
   - `cmd /c "npm --prefix backend run build"` (NestJS production build exit code 0).
   - `cmd /c "npm --prefix frontend run build"` (Next.js production build exit code 0).

### Live Verification Script (`scratch/verify-m9.js`)
- Full round-trip automated workflow test:
  1. Admin authentication & JWT validation.
  2. Health check inspection (`/api/v1/health`).
  3. Dashboard operational statistics (`/api/v1/dashboard/stats`).
  4. Daily pipeline execution for tournament (`/api/v1/tournaments/:id/pipeline/run`).
  5. Overall standings & Daily results retrieval (`/api/v1/tournaments/:id/results/overall`).
  6. Audit trail query (`/api/v1/tournaments/:id/audit-trail`).
  7. Public Leaderboard frontend route accessibility (`/tournaments/:id/leaderboard`).
  8. Main landing / Admin dashboard route accessibility (`/`).
