import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    try {
      await this.$connect();
      console.log('[PrismaService] Connected to database.');

      // Ensure all required columns/enums from recent features exist
      const schemaStatements = [
        `DO $$ BEGIN CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'GOOGLE'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN CREATE TYPE "ParticipantStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DISQUALIFIED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'USER';`,
        `ALTER TYPE "TournamentStatus" ADD VALUE IF NOT EXISTS 'UPCOMING';`,
        `ALTER TYPE "TournamentStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';`,
        `ALTER TYPE "CandleAmbiguityPolicy" ADD VALUE IF NOT EXISTS 'HIGH_FIRST';`,
        `ALTER TYPE "CandleAmbiguityPolicy" ADD VALUE IF NOT EXISTS 'LOW_FIRST';`,
        `ALTER TYPE "GapPolicy" ADD VALUE IF NOT EXISTS 'THEORETICAL_THRESHOLD';`,
        `ALTER TYPE "PickStatus" ADD VALUE IF NOT EXISTS 'PENDING';`,
        `ALTER TYPE "EntrySource" ADD VALUE IF NOT EXISTS 'MANUAL';`,
        `ALTER TYPE "EntrySource" ADD VALUE IF NOT EXISTS 'SUBMISSION_PRICE';`,
        `ALTER TYPE "EntrySource" ADD VALUE IF NOT EXISTS 'OTHER_TOURNAMENT_RULE';`,
        `ALTER TYPE "EntrySource" ADD VALUE IF NOT EXISTS 'CLOSING_PRICE';`,
        `ALTER TYPE "EntrySource" ADD VALUE IF NOT EXISTS 'MARKET_CLOSE';`,
        `ALTER TYPE "SyncStatus" ADD VALUE IF NOT EXISTS 'RUNNING';`,
        `ALTER TYPE "EvaluationStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';`,
        `ALTER TYPE "ExitReason" ADD VALUE IF NOT EXISTS 'INITIAL_CL';`,
        `ALTER TYPE "ExitReason" ADD VALUE IF NOT EXISTS 'INITIAL_STOP';`,
        `ALTER TABLE "tournament_rules" ADD COLUMN IF NOT EXISTS "initial_stop_pct" DECIMAL(5,4) NOT NULL DEFAULT 0.03;`,
        `ALTER TABLE "tournament_rules" ADD COLUMN IF NOT EXISTS "trailing_stop_pct" DECIMAL(5,4) NOT NULL DEFAULT 0.03;`,
        `ALTER TABLE "tournament_rules" ADD COLUMN IF NOT EXISTS "initial_stop_percentage" DECIMAL(5,4) NOT NULL DEFAULT 0.03;`,
        `ALTER TABLE "tournament_rules" ADD COLUMN IF NOT EXISTS "trailing_stop_percentage" DECIMAL(5,4) NOT NULL DEFAULT 0.03;`,
        `ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "completion_type" VARCHAR(50) NOT NULL DEFAULT 'DATE_PERIOD';`,
        `ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "target_points" DECIMAL(10,2) NULL;`,
        `ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "min_picks_per_day" INTEGER NOT NULL DEFAULT 2;`,
        `ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "max_picks_per_day" INTEGER NOT NULL DEFAULT 3;`,
        `ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "pick_window_start" VARCHAR(10) NOT NULL DEFAULT '17:00';`,
        `ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "pick_window_end" VARCHAR(10) NOT NULL DEFAULT '21:00';`,
        `ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "winner_participant_id" TEXT NULL;`,
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
        `DO $$ BEGIN ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `ALTER TABLE "stock_picks" ADD COLUMN IF NOT EXISTS "entry_timestamp" TIMESTAMP(3);`,
        `ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "is_pick_window_force_open" BOOLEAN NOT NULL DEFAULT FALSE;`,
        `ALTER TABLE "stocks" ADD COLUMN IF NOT EXISTS "board" VARCHAR(50) NOT NULL DEFAULT 'Utama';`,
      ];

      for (const stmt of schemaStatements) {
        try {
          await this.$executeRawUnsafe(stmt);
        } catch (e) {
          console.warn('[PrismaService] Migration statement notice:', (e as Error).message);
        }
      }
      console.log('[PrismaService] Database schema verified and synchronized.');

      const userCount = await this.user.count();
      if (userCount === 0) {
        console.log('[PrismaService] Empty database detected. Seeding initial admin...');
        const bcrypt = await import('bcrypt');
        const adminEmail = (process.env.ADMIN_EMAIL || 'admin@tradearena.local').toLowerCase();
        const adminPassword = process.env.ADMIN_PASSWORD || 'AdminSecurePass123!';
        const adminName = process.env.ADMIN_NAME || 'TradeArena Super Admin';
        const passwordHash = await bcrypt.hash(adminPassword, 10);

        await this.user.create({
          data: {
            email: adminEmail,
            name: adminName,
            passwordHash,
            role: 'ADMIN' as any,
          },
        });
        console.log(`[PrismaService] Initial admin created: ${adminEmail}`);
      }

      const stockCount = await this.stock.count();
      if (stockCount < 100) {
        console.log('[PrismaService] Less than 100 stocks found in database. Auto-populating master IDX stock universe...');
        try {
          const idxStocks = require('../stocks/data/idx-stocks.json');
          const chunkSize = 50;
          for (let i = 0; i < idxStocks.length; i += chunkSize) {
            const chunk = idxStocks.slice(i, i + chunkSize);
            await Promise.all(
              chunk.map((s: any) =>
                this.stock.upsert({
                  where: { symbol: s.symbol },
                  update: { name: s.name, exchange: s.exchange || 'IDX', isActive: true },
                  create: { symbol: s.symbol, name: s.name, exchange: s.exchange || 'IDX', isActive: true },
                }),
              ),
            );
          }
          console.log(`[PrismaService] Master IDX stock universe populated (${idxStocks.length} stocks).`);
        } catch (e) {
          console.warn('[PrismaService] Failed to auto-populate IDX stocks:', (e as Error).message);
        }
      }
    } catch (err) {
      console.warn(
        '[PrismaService] Database connection or init issue:',
        (err as Error).message,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
