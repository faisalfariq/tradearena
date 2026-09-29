-- Synchronize all enum values and tournament_rules column mappings
DO $$ BEGIN ALTER TYPE "TournamentStatus" ADD VALUE IF NOT EXISTS 'UPCOMING'; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TYPE "TournamentStatus" ADD VALUE IF NOT EXISTS 'CANCELLED'; EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN ALTER TYPE "CandleAmbiguityPolicy" ADD VALUE IF NOT EXISTS 'HIGH_FIRST'; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TYPE "CandleAmbiguityPolicy" ADD VALUE IF NOT EXISTS 'LOW_FIRST'; EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN ALTER TYPE "GapPolicy" ADD VALUE IF NOT EXISTS 'THEORETICAL_THRESHOLD'; EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN ALTER TYPE "PickStatus" ADD VALUE IF NOT EXISTS 'PENDING'; EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN ALTER TYPE "EntrySource" ADD VALUE IF NOT EXISTS 'MANUAL'; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TYPE "EntrySource" ADD VALUE IF NOT EXISTS 'SUBMISSION_PRICE'; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TYPE "EntrySource" ADD VALUE IF NOT EXISTS 'OTHER_TOURNAMENT_RULE'; EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN ALTER TYPE "SyncStatus" ADD VALUE IF NOT EXISTS 'RUNNING'; EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN ALTER TYPE "EvaluationStatus" ADD VALUE IF NOT EXISTS 'PROCESSING'; EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN ALTER TYPE "ExitReason" ADD VALUE IF NOT EXISTS 'INITIAL_CL'; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TYPE "ExitReason" ADD VALUE IF NOT EXISTS 'INITIAL_STOP'; EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE "tournament_rules" ADD COLUMN IF NOT EXISTS "initial_stop_pct" DECIMAL(5,4) NOT NULL DEFAULT 0.03;
ALTER TABLE "tournament_rules" ADD COLUMN IF NOT EXISTS "trailing_stop_pct" DECIMAL(5,4) NOT NULL DEFAULT 0.03;
ALTER TABLE "tournament_rules" ADD COLUMN IF NOT EXISTS "initial_stop_percentage" DECIMAL(5,4) NOT NULL DEFAULT 0.03;
ALTER TABLE "tournament_rules" ADD COLUMN IF NOT EXISTS "trailing_stop_percentage" DECIMAL(5,4) NOT NULL DEFAULT 0.03;
