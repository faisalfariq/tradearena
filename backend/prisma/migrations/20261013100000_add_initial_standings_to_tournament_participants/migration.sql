-- AlterTable
ALTER TABLE "tournament_participants" ADD COLUMN "initial_points" DECIMAL(10,4) NOT NULL DEFAULT 0;
ALTER TABLE "tournament_participants" ADD COLUMN "initial_win_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "tournament_participants" ADD COLUMN "initial_loss_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "tournament_participants" ADD COLUMN "initial_breakeven_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "tournament_participants" ADD COLUMN "initial_picks_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "tournament_participants" ADD COLUMN "initial_penalties_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "tournament_participants" ADD COLUMN "initial_penalty_points" DECIMAL(10,4) NOT NULL DEFAULT 0;
