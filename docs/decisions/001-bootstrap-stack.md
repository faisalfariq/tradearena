# ADR 001: Bootstrap Stack & Modular Monolith

## Status
Accepted

## Context
TradeArena requires an automated tournament evaluation system for Indonesian stock picks (IDX). The evaluation workflow operates in batch post-market rather than real-time streaming. A microservice or multi-repo architecture would add unnecessary complexity and latency in development.

## Decision
1. Use a **Monorepo** structure (`/frontend` and `/backend`) at the repository root.
2. Backend is a **Modular Monolith** using NestJS + TypeScript + Prisma + PostgreSQL + Redis/BullMQ.
3. Frontend uses **Next.js** + TypeScript + Tailwind CSS with mobile-first responsive design.
4. Provide root-level launchers `run.sh` and `run.bat` for seamless local development.

## Consequences
- Single repository simplifies coordinated development, versioning, and testing.
- Modular monolith enforces domain boundary separation while keeping deployment unified.
