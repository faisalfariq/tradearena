import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role, TournamentStatus, CandleAmbiguityPolicy, GapPolicy, EntrySource, PickStatus } from '@prisma/client';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Check API and system health' })
  @ApiResponse({ status: 200, description: 'System health status' })
  check() {
    return {
      status: 'ok',
      service: 'tradearena-backend',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
    };
  }

  @Get('db')
  @ApiOperation({ summary: 'Diagnose database connectivity and counts' })
  async checkDb() {
    try {
      const userCount = await this.prisma.user.count();
      const admin = await this.prisma.user.findFirst({
        where: { role: Role.ADMIN },
        select: { id: true, email: true, name: true, role: true },
      });
      const stockCount = await this.prisma.stock.count();
      const tournamentCount = await this.prisma.tournament.count();

      const ruleColumns = await this.prisma.$queryRawUnsafe(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tournament_rules' ORDER BY ordinal_position;"
      );
      const tournamentColumns = await this.prisma.$queryRawUnsafe(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tournaments' ORDER BY ordinal_position;"
      );

      return {
        database: 'connected',
        userCount,
        stockCount,
        tournamentCount,
        adminFound: !!admin,
        admin,
        ruleColumns,
        tournamentColumns,
      };
    } catch (err: any) {
      return {
        database: 'error',
        message: err.message,
        code: err.code,
        meta: err.meta,
      };
    }
  }

  @Post('seed')
  @ApiOperation({ summary: 'Ensure admin user and initial data are seeded' })
  async seed() {
    try {
      const schemaStatements = [
        `DO $$ BEGIN CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'GOOGLE'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'USER'; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN CREATE TYPE "ParticipantStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DISQUALIFIED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN ALTER TYPE "TournamentStatus" ADD VALUE IF NOT EXISTS 'UPCOMING'; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN ALTER TYPE "TournamentStatus" ADD VALUE IF NOT EXISTS 'CANCELLED'; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN ALTER TYPE "CandleAmbiguityPolicy" ADD VALUE IF NOT EXISTS 'HIGH_FIRST'; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN ALTER TYPE "CandleAmbiguityPolicy" ADD VALUE IF NOT EXISTS 'LOW_FIRST'; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN ALTER TYPE "GapPolicy" ADD VALUE IF NOT EXISTS 'THEORETICAL_THRESHOLD'; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN ALTER TYPE "PickStatus" ADD VALUE IF NOT EXISTS 'PENDING'; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN ALTER TYPE "EntrySource" ADD VALUE IF NOT EXISTS 'MANUAL'; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN ALTER TYPE "EntrySource" ADD VALUE IF NOT EXISTS 'SUBMISSION_PRICE'; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN ALTER TYPE "EntrySource" ADD VALUE IF NOT EXISTS 'OTHER_TOURNAMENT_RULE'; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN ALTER TYPE "SyncStatus" ADD VALUE IF NOT EXISTS 'RUNNING'; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN ALTER TYPE "EvaluationStatus" ADD VALUE IF NOT EXISTS 'PROCESSING'; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN ALTER TYPE "ExitReason" ADD VALUE IF NOT EXISTS 'INITIAL_CL'; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN ALTER TYPE "ExitReason" ADD VALUE IF NOT EXISTS 'INITIAL_STOP'; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `ALTER TABLE "tournament_rules" ADD COLUMN IF NOT EXISTS "initial_stop_pct" DECIMAL(5,4) NOT NULL DEFAULT 0.03;`,
        `ALTER TABLE "tournament_rules" ADD COLUMN IF NOT EXISTS "trailing_stop_pct" DECIMAL(5,4) NOT NULL DEFAULT 0.03;`,
        `ALTER TABLE "tournament_rules" ADD COLUMN IF NOT EXISTS "initial_stop_percentage" DECIMAL(5,4) NOT NULL DEFAULT 0.03;`,
        `ALTER TABLE "tournament_rules" ADD COLUMN IF NOT EXISTS "trailing_stop_percentage" DECIMAL(5,4) NOT NULL DEFAULT 0.03;`,
        `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "provider" "AuthProvider" NOT NULL DEFAULT 'LOCAL';`,
        `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_id" TEXT;`,
        `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" TEXT;`,
        `ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;`,
        `DO $$ BEGIN CREATE UNIQUE INDEX IF NOT EXISTS "users_google_id_key" ON "users"("google_id"); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `ALTER TABLE "participants" ADD COLUMN IF NOT EXISTS "user_id" TEXT;`,
        `ALTER TABLE "participants" ADD COLUMN IF NOT EXISTS "phone_number" TEXT;`,
        `DO $$ BEGIN CREATE UNIQUE INDEX IF NOT EXISTS "participants_user_id_key" ON "participants"("user_id"); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN ALTER TABLE "participants" ADD CONSTRAINT "participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `ALTER TABLE "tournament_participants" ADD COLUMN IF NOT EXISTS "user_id" TEXT;`,
        `ALTER TABLE "tournament_participants" ADD COLUMN IF NOT EXISTS "status" "ParticipantStatus" NOT NULL DEFAULT 'APPROVED';`,
        `ALTER TABLE "tournament_participants" ADD COLUMN IF NOT EXISTS "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
        `ALTER TABLE "tournament_participants" ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMP(3);`,
        `ALTER TABLE "tournament_participants" ADD COLUMN IF NOT EXISTS "reviewed_by" TEXT;`,
        `ALTER TABLE "tournament_participants" ADD COLUMN IF NOT EXISTS "review_notes" TEXT;`,
        `DO $$ BEGIN ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      ];

      for (const stmt of schemaStatements) {
        try {
          await this.prisma.$executeRawUnsafe(stmt);
        } catch (e) {
          console.warn('[HealthController] Migration statement notice:', (e as Error).message);
        }
      }

      const adminEmail = (process.env.ADMIN_EMAIL || 'admin@tradearena.local').toLowerCase();
      const adminPassword = process.env.ADMIN_PASSWORD || 'AdminSecurePass123!';
      const adminName = process.env.ADMIN_NAME || 'TradeArena Super Admin';
      const passwordHash = await bcrypt.hash(adminPassword, 10);

      const admin = await this.prisma.user.upsert({
        where: { email: adminEmail },
        update: {
          name: adminName,
          passwordHash,
          role: Role.ADMIN,
        },
        create: {
          email: adminEmail,
          name: adminName,
          passwordHash,
          role: Role.ADMIN,
        },
        select: { id: true, email: true, name: true, role: true },
      });

      // Seed 5 core IDX stocks
      const initialStocks = [
        { symbol: 'BBCA', name: 'Bank Central Asia Tbk', exchange: 'IDX' },
        { symbol: 'BBRI', name: 'Bank Rakyat Indonesia (Persero) Tbk', exchange: 'IDX' },
        { symbol: 'BMRI', name: 'Bank Mandiri (Persero) Tbk', exchange: 'IDX' },
        { symbol: 'TLKM', name: 'Telkom Indonesia (Persero) Tbk', exchange: 'IDX' },
        { symbol: 'ASII', name: 'Astra International Tbk', exchange: 'IDX' },
      ];
      for (const s of initialStocks) {
        await this.prisma.stock.upsert({
          where: { symbol: s.symbol },
          update: { name: s.name, exchange: s.exchange, isActive: true },
          create: { ...s, isActive: true },
        });
      }

      // Seed demo tournament if none exists
      let tournament = await this.prisma.tournament.findFirst();
      if (!tournament) {
        tournament = await this.prisma.tournament.create({
          data: {
            name: 'BSJP Championship Musim 1 — 2026',
            description:
              'Turnamen resmi stock picking harian komunitas BSJP dengan evaluasi Cut Loss (-3%) & Trailing Stop (-3% dari peak).',
            startDate: new Date('2026-09-01T00:00:00.000Z'),
            endDate: new Date('2026-09-30T23:59:59.000Z'),
            status: TournamentStatus.ACTIVE,
            rules: {
              create: {
                initialStopPct: 0.03,
                trailingStopPct: 0.03,
                candleAmbiguityPolicy: CandleAmbiguityPolicy.CONSERVATIVE_LOSS_FIRST,
                gapPolicy: GapPolicy.ACTUAL_FIRST_VALID_LEVEL,
                priceFractionPolicy: 'IDX_STANDARD_V1',
                pointsRule: 'PERCENTAGE_RETURN_V1',
              },
            },
          },
        });
      }

      return {
        success: true,
        message: 'Seeding successful',
        admin,
        tournamentId: tournament.id,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        code: err.code,
      };
    }
  }
}

