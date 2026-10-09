-- AlterTable
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "is_pick_window_force_open" BOOLEAN NOT NULL DEFAULT FALSE;

-- AlterTable
ALTER TABLE "stocks" ADD COLUMN IF NOT EXISTS "board" VARCHAR(50) NOT NULL DEFAULT 'Utama';
