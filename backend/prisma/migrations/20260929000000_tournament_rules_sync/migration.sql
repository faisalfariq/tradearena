-- Synchronize tournament_rules column mappings and ExitReason enum values
DO $$ BEGIN ALTER TYPE "ExitReason" ADD VALUE IF NOT EXISTS 'INITIAL_CL'; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TYPE "ExitReason" ADD VALUE IF NOT EXISTS 'INITIAL_STOP'; EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE "tournament_rules" ADD COLUMN IF NOT EXISTS "initial_stop_pct" DECIMAL(5,4) NOT NULL DEFAULT 0.03;
ALTER TABLE "tournament_rules" ADD COLUMN IF NOT EXISTS "trailing_stop_pct" DECIMAL(5,4) NOT NULL DEFAULT 0.03;
ALTER TABLE "tournament_rules" ADD COLUMN IF NOT EXISTS "initial_stop_percentage" DECIMAL(5,4) NOT NULL DEFAULT 0.03;
ALTER TABLE "tournament_rules" ADD COLUMN IF NOT EXISTS "trailing_stop_percentage" DECIMAL(5,4) NOT NULL DEFAULT 0.03;
