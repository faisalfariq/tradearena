-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PARTICIPANT', 'VIEWER');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CandleAmbiguityPolicy" AS ENUM ('CONSERVATIVE_LOSS_FIRST', 'OPTIMISTIC_PROFIT_FIRST', 'REVIEW_REQUIRED');

-- CreateEnum
CREATE TYPE "GapPolicy" AS ENUM ('THEORETICAL_LIMIT_PRICE', 'ACTUAL_FIRST_VALID_LEVEL');

-- CreateEnum
CREATE TYPE "PickStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EntrySource" AS ENUM ('MARKET_OPEN', 'CUSTOM_PRICE');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUCCESS', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REVIEW_REQUIRED', 'OVERRIDDEN', 'PENDING_DATA', 'FAILED');

-- CreateEnum
CREATE TYPE "ExitReason" AS ENUM ('INITIAL_STOP', 'TRAILING_STOP', 'MARKET_CLOSE', 'MANUAL_OVERRIDE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournaments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" "TournamentStatus" NOT NULL DEFAULT 'DRAFT',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_rules" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "initial_stop_pct" DECIMAL(5,4) NOT NULL DEFAULT 0.03,
    "trailing_stop_pct" DECIMAL(5,4) NOT NULL DEFAULT 0.03,
    "candle_ambiguity_policy" "CandleAmbiguityPolicy" NOT NULL DEFAULT 'CONSERVATIVE_LOSS_FIRST',
    "gap_policy" "GapPolicy" NOT NULL DEFAULT 'ACTUAL_FIRST_VALID_LEVEL',
    "price_fraction_policy" TEXT NOT NULL DEFAULT 'IDX_STANDARD_V1',
    "points_rule" TEXT NOT NULL DEFAULT 'PERCENTAGE_RETURN_V1',
    "calculation_rule_version" TEXT NOT NULL DEFAULT 'v1.0.0',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_participants" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stocks" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "exchange" TEXT NOT NULL DEFAULT 'IDX',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_picks" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "stock_id" TEXT NOT NULL,
    "trading_date" DATE NOT NULL,
    "entry_price" DECIMAL(12,4) NOT NULL,
    "entry_source" "EntrySource" NOT NULL DEFAULT 'MARKET_OPEN',
    "status" "PickStatus" NOT NULL DEFAULT 'CONFIRMED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_picks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intraday_candles" (
    "id" TEXT NOT NULL,
    "stock_id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "trading_date" DATE NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "open" DECIMAL(12,4) NOT NULL,
    "high" DECIMAL(12,4) NOT NULL,
    "low" DECIMAL(12,4) NOT NULL,
    "close" DECIMAL(12,4) NOT NULL,
    "volume" BIGINT NOT NULL DEFAULT 0,
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "is_anomalous" BOOLEAN NOT NULL DEFAULT false,
    "anomaly_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intraday_candles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_sync_runs" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "trading_date" DATE NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "total_symbols" INTEGER NOT NULL DEFAULT 0,
    "synced_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_sync_items" (
    "id" TEXT NOT NULL,
    "sync_run_id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "candles_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_sync_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trade_evaluations" (
    "id" TEXT NOT NULL,
    "pick_id" TEXT NOT NULL,
    "status" "EvaluationStatus" NOT NULL DEFAULT 'PENDING',
    "entry_price" DECIMAL(12,4) NOT NULL,
    "exit_price" DECIMAL(12,4),
    "exit_timestamp" TIMESTAMP(3),
    "exit_reason" "ExitReason",
    "highest_price" DECIMAL(12,4),
    "max_floating_return" DECIMAL(8,4),
    "theoretical_threshold" DECIMAL(12,4),
    "actual_exit_price" DECIMAL(12,4),
    "realized_return" DECIMAL(8,4),
    "calculation_version" TEXT NOT NULL DEFAULT 'v1.0.0',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trade_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trade_evaluation_evidence" (
    "id" TEXT NOT NULL,
    "evaluation_id" TEXT NOT NULL,
    "market_data_provider" TEXT NOT NULL,
    "market_data_date" DATE NOT NULL,
    "candle_count" INTEGER NOT NULL,
    "price_fraction_version" TEXT NOT NULL,
    "details_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trade_evaluation_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "points_results" (
    "id" TEXT NOT NULL,
    "evaluation_id" TEXT NOT NULL,
    "points" DECIMAL(10,4) NOT NULL,
    "points_rule" TEXT NOT NULL,
    "points_rule_version" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "points_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_overrides" (
    "id" TEXT NOT NULL,
    "evaluation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "original_exit_price" DECIMAL(12,4),
    "original_return" DECIMAL(8,4),
    "original_points" DECIMAL(10,4),
    "override_exit_price" DECIMAL(12,4) NOT NULL,
    "override_return" DECIMAL(8,4) NOT NULL,
    "override_points" DECIMAL(10,4) NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_rules_tournament_id_key" ON "tournament_rules"("tournament_id");

-- CreateIndex
CREATE UNIQUE INDEX "participants_email_key" ON "participants"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_participants_tournament_id_participant_id_key" ON "tournament_participants"("tournament_id", "participant_id");

-- CreateIndex
CREATE UNIQUE INDEX "stocks_symbol_key" ON "stocks"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "stock_picks_tournament_id_participant_id_trading_date_stock_key" ON "stock_picks"("tournament_id", "participant_id", "trading_date", "stock_id");

-- CreateIndex
CREATE INDEX "intraday_candles_symbol_trading_date_idx" ON "intraday_candles"("symbol", "trading_date");

-- CreateIndex
CREATE UNIQUE INDEX "intraday_candles_symbol_timestamp_provider_key" ON "intraday_candles"("symbol", "timestamp", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "market_sync_items_sync_run_id_symbol_key" ON "market_sync_items"("sync_run_id", "symbol");

-- CreateIndex
CREATE UNIQUE INDEX "trade_evaluations_pick_id_calculation_version_key" ON "trade_evaluations"("pick_id", "calculation_version");

-- CreateIndex
CREATE UNIQUE INDEX "trade_evaluation_evidence_evaluation_id_key" ON "trade_evaluation_evidence"("evaluation_id");

-- CreateIndex
CREATE UNIQUE INDEX "points_results_evaluation_id_key" ON "points_results"("evaluation_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_overrides_evaluation_id_key" ON "evaluation_overrides"("evaluation_id");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_rules" ADD CONSTRAINT "tournament_rules_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_picks" ADD CONSTRAINT "stock_picks_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_picks" ADD CONSTRAINT "stock_picks_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_picks" ADD CONSTRAINT "stock_picks_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "stocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intraday_candles" ADD CONSTRAINT "intraday_candles_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "stocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_sync_runs" ADD CONSTRAINT "market_sync_runs_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_sync_items" ADD CONSTRAINT "market_sync_items_sync_run_id_fkey" FOREIGN KEY ("sync_run_id") REFERENCES "market_sync_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_evaluations" ADD CONSTRAINT "trade_evaluations_pick_id_fkey" FOREIGN KEY ("pick_id") REFERENCES "stock_picks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_evaluation_evidence" ADD CONSTRAINT "trade_evaluation_evidence_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "trade_evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_results" ADD CONSTRAINT "points_results_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "trade_evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_overrides" ADD CONSTRAINT "evaluation_overrides_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "trade_evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_overrides" ADD CONSTRAINT "evaluation_overrides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
