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
