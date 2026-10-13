-- CreateTable
CREATE TABLE IF NOT EXISTS "participant_penalties" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "trading_date" DATE NOT NULL,
    "penalty_type" VARCHAR(50) NOT NULL DEFAULT 'NO_PICK',
    "points" DECIMAL(10,4) NOT NULL DEFAULT -10,
    "reason" TEXT NOT NULL DEFAULT 'Tidak memilih emiten harian (-10 poin)',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participant_penalties_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "participant_penalties_tournament_id_participant_id_trading_date_penalty_type_key" ON "participant_penalties"("tournament_id", "participant_id", "trading_date", "penalty_type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "participant_penalties_tournament_id_trading_date_idx" ON "participant_penalties"("tournament_id", "trading_date");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'participant_penalties_tournament_id_fkey'
    ) THEN
        ALTER TABLE "participant_penalties" ADD CONSTRAINT "participant_penalties_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'participant_penalties_participant_id_fkey'
    ) THEN
        ALTER TABLE "participant_penalties" ADD CONSTRAINT "participant_penalties_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
