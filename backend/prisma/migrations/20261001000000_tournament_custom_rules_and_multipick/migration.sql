-- Migration: 20261001000000_tournament_custom_rules_and_multipick
-- Add EntrySource enum values
DO $$ BEGIN ALTER TYPE "EntrySource" ADD VALUE IF NOT EXISTS 'CLOSING_PRICE'; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TYPE "EntrySource" ADD VALUE IF NOT EXISTS 'MARKET_CLOSE'; EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Add tournament target points, completion criteria, and multi-pick settings
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "completion_type" VARCHAR(50) NOT NULL DEFAULT 'DATE_PERIOD';
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "target_points" DECIMAL(10,2) NULL;
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "min_picks_per_day" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "max_picks_per_day" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "pick_window_start" VARCHAR(10) NOT NULL DEFAULT '17:00';
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "pick_window_end" VARCHAR(10) NOT NULL DEFAULT '21:00';
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "winner_participant_id" TEXT NULL;

-- Add foreign key constraint safely
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tournaments_winner_participant_id_fkey'
  ) THEN
    ALTER TABLE "tournaments"
      ADD CONSTRAINT "tournaments_winner_participant_id_fkey"
      FOREIGN KEY ("winner_participant_id")
      REFERENCES "participants"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
