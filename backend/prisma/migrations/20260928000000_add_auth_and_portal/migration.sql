-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'GOOGLE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterEnum
DO $$ BEGIN
  ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'USER';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ParticipantStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DISQUALIFIED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "provider" "AuthProvider" NOT NULL DEFAULT 'LOCAL';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" TEXT;
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

-- CreateIndex
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "users_google_id_key" ON "users"("google_id");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable participants
ALTER TABLE "participants" ADD COLUMN IF NOT EXISTS "user_id" TEXT;
ALTER TABLE "participants" ADD COLUMN IF NOT EXISTS "phone_number" TEXT;

-- CreateIndex
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "participants_user_id_key" ON "participants"("user_id");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "participants" ADD CONSTRAINT "participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable tournament_participants
ALTER TABLE "tournament_participants" ADD COLUMN IF NOT EXISTS "user_id" TEXT;
ALTER TABLE "tournament_participants" ADD COLUMN IF NOT EXISTS "status" "ParticipantStatus" NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "tournament_participants" ADD COLUMN IF NOT EXISTS "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "tournament_participants" ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMP(3);
ALTER TABLE "tournament_participants" ADD COLUMN IF NOT EXISTS "reviewed_by" TEXT;
ALTER TABLE "tournament_participants" ADD COLUMN IF NOT EXISTS "review_notes" TEXT;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
