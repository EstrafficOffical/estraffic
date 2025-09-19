-- Create enums if they don't exist (safe re-run)
DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('USER','ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "UserStatus" AS ENUM ('PENDING','APPROVED','BANNED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add columns if missing
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" "Role" NOT NULL DEFAULT 'USER';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "status" "UserStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "telegram" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "image" TEXT;

-- Ensure unique email index (safe if already exists)
DO $$ BEGIN
  CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
EXCEPTION WHEN duplicate_table THEN NULL WHEN duplicate_object THEN NULL; END $$;
