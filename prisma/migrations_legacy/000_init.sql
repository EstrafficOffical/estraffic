-- ===== Schema =====
CREATE SCHEMA IF NOT EXISTS "public";

-- ===== Enums =====
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'Role' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "public"."Role" AS ENUM ('USER','ADMIN');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'UserStatus' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "public"."UserStatus" AS ENUM ('PENDING','APPROVED','BANNED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'OfferMode' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "public"."OfferMode" AS ENUM ('Auto','Manual');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'OfferStatus' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "public"."OfferStatus" AS ENUM ('ACTIVE','ARCHIVED','PAUSED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'PayoutType' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "public"."PayoutType" AS ENUM ('CPA','CPL','CPS','REVSHARE','OTHER');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'RequestStatus' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "public"."RequestStatus" AS ENUM ('PENDING','APPROVED','REJECTED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'ConversionType' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "public"."ConversionType" AS ENUM ('REG','DEP','REBILL','SALE','LEAD');
  END IF;
END $$;

-- На случай отсутствующих значений (идемпотентно)
ALTER TYPE "public"."Role"           ADD VALUE IF NOT EXISTS 'USER';
ALTER TYPE "public"."Role"           ADD VALUE IF NOT EXISTS 'ADMIN';

ALTER TYPE "public"."UserStatus"     ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "public"."UserStatus"     ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "public"."UserStatus"     ADD VALUE IF NOT EXISTS 'BANNED';

ALTER TYPE "public"."OfferMode"      ADD VALUE IF NOT EXISTS 'Auto';
ALTER TYPE "public"."OfferMode"      ADD VALUE IF NOT EXISTS 'Manual';

ALTER TYPE "public"."OfferStatus"    ADD VALUE IF NOT EXISTS 'ACTIVE';
ALTER TYPE "public"."OfferStatus"    ADD VALUE IF NOT EXISTS 'ARCHIVED';
ALTER TYPE "public"."OfferStatus"    ADD VALUE IF NOT EXISTS 'PAUSED';

ALTER TYPE "public"."PayoutType"     ADD VALUE IF NOT EXISTS 'CPA';
ALTER TYPE "public"."PayoutType"     ADD VALUE IF NOT EXISTS 'CPL';
ALTER TYPE "public"."PayoutType"     ADD VALUE IF NOT EXISTS 'CPS';
ALTER TYPE "public"."PayoutType"     ADD VALUE IF NOT EXISTS 'REVSHARE';
ALTER TYPE "public"."PayoutType"     ADD VALUE IF NOT EXISTS 'OTHER';

ALTER TYPE "public"."RequestStatus"  ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "public"."RequestStatus"  ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "public"."RequestStatus"  ADD VALUE IF NOT EXISTS 'REJECTED';

ALTER TYPE "public"."ConversionType" ADD VALUE IF NOT EXISTS 'REG';
ALTER TYPE "public"."ConversionType" ADD VALUE IF NOT EXISTS 'DEP';
ALTER TYPE "public"."ConversionType" ADD VALUE IF NOT EXISTS 'REBILL';
ALTER TYPE "public"."ConversionType" ADD VALUE IF NOT EXISTS 'SALE';
ALTER TYPE "public"."ConversionType" ADD VALUE IF NOT EXISTS 'LEAD';

-- ===== Tables =====
CREATE TABLE IF NOT EXISTS "public"."User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "passwordHash" TEXT,
  "image" TEXT,
  "telegram" TEXT,
  "role" "public"."Role" NOT NULL DEFAULT 'USER',
  "status" "public"."UserStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."Account" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."Session" (
  "id" TEXT NOT NULL,
  "sessionToken" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."VerificationToken" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."Offer" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "tag" TEXT,
  "cpa" DECIMAL(12,2),
  "geo" TEXT NOT NULL,
  "vertical" TEXT NOT NULL,
  "kpi1" DOUBLE PRECISION,
  "kpi2" DOUBLE PRECISION,
  "mode" "public"."OfferMode" NOT NULL DEFAULT 'Auto',
  "targetUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."OfferAccess" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "offerId" TEXT NOT NULL,
  "approved" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OfferAccess_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."OfferRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "offerId" TEXT NOT NULL,
  "message" TEXT,
  "status" "public"."RequestStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "OfferRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."Click" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "offerId" TEXT NOT NULL,
  "subId" TEXT,
  "ip" TEXT,
  "userAgent" TEXT,
  "referer" TEXT,
  "country" TEXT,
  "source" TEXT,
  "sub1" TEXT,
  "sub2" TEXT,
  "sub3" TEXT,
  "sub4" TEXT,
  "sub5" TEXT,
  "campaign" TEXT,
  "adset" TEXT,
  "creative" TEXT,
  "clickId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Click_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."Conversion" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "offerId" TEXT NOT NULL,
  "subId" TEXT,
  "type" "public"."ConversionType" NOT NULL,
  "amount" DECIMAL(12,2),
  "currency" TEXT,
  "txId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Conversion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."Wallet" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."Payout" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" TEXT NOT NULL DEFAULT 'Paid',
  "txHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- ===== Indexes =====
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "public"."User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "public"."Account"("provider","providerAccountId");
CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "public"."Session"("sessionToken");
CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_token_key" ON "public"."VerificationToken"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "public"."VerificationToken"("identifier","token");

CREATE INDEX IF NOT EXISTS "Offer_title_idx"    ON "public"."Offer"("title");
CREATE INDEX IF NOT EXISTS "Offer_geo_idx"      ON "public"."Offer"("geo");
CREATE INDEX IF NOT EXISTS "Offer_vertical_idx" ON "public"."Offer"("vertical");

CREATE UNIQUE INDEX IF NOT EXISTS "OfferAccess_userId_offerId_key" ON "public"."OfferAccess"("userId","offerId");
CREATE UNIQUE INDEX IF NOT EXISTS "OfferRequest_userId_offerId_key" ON "public"."OfferRequest"("userId","offerId");

CREATE INDEX IF NOT EXISTS "Click_userId_createdAt_idx"  ON "public"."Click"("userId","createdAt");
CREATE INDEX IF NOT EXISTS "Click_offerId_createdAt_idx" ON "public"."Click"("offerId","createdAt");
CREATE INDEX IF NOT EXISTS "Click_subId_createdAt_idx"   ON "public"."Click"("subId","createdAt");
CREATE INDEX IF NOT EXISTS "Click_clickId_idx"           ON "public"."Click"("clickId");

CREATE INDEX IF NOT EXISTS "Conversion_userId_createdAt_idx"  ON "public"."Conversion"("userId","createdAt");
CREATE INDEX IF NOT EXISTS "Conversion_offerId_createdAt_idx" ON "public"."Conversion"("offerId","createdAt");
CREATE INDEX IF NOT EXISTS "Conversion_subId_createdAt_idx"   ON "public"."Conversion"("subId","createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "Conversion_offerId_txId_key" ON "public"."Conversion"("offerId","txId");

CREATE INDEX IF NOT EXISTS "Wallet_userId_isPrimary_idx" ON "public"."Wallet"("userId","isPrimary");
CREATE UNIQUE INDEX IF NOT EXISTS "Wallet_userId_address_key" ON "public"."Wallet"("userId","address");

CREATE INDEX IF NOT EXISTS "Payout_userId_createdAt_idx" ON "public"."Payout"("userId","createdAt");

-- ===== Foreign keys =====
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Account_userId_fkey') THEN
    ALTER TABLE "public"."Account"
      ADD CONSTRAINT "Account_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Session_userId_fkey') THEN
    ALTER TABLE "public"."Session"
      ADD CONSTRAINT "Session_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OfferAccess_userId_fkey') THEN
    ALTER TABLE "public"."OfferAccess"
      ADD CONSTRAINT "OfferAccess_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OfferAccess_offerId_fkey') THEN
    ALTER TABLE "public"."OfferAccess"
      ADD CONSTRAINT "OfferAccess_offerId_fkey"
      FOREIGN KEY ("offerId") REFERENCES "public"."Offer"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OfferRequest_userId_fkey') THEN
    ALTER TABLE "public"."OfferRequest"
      ADD CONSTRAINT "OfferRequest_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OfferRequest_offerId_fkey') THEN
    ALTER TABLE "public"."OfferRequest"
      ADD CONSTRAINT "OfferRequest_offerId_fkey"
      FOREIGN KEY ("offerId") REFERENCES "public"."Offer"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Click_userId_fkey') THEN
    ALTER TABLE "public"."Click"
      ADD CONSTRAINT "Click_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Click_offerId_fkey') THEN
    ALTER TABLE "public"."Click"
      ADD CONSTRAINT "Click_offerId_fkey"
      FOREIGN KEY ("offerId") REFERENCES "public"."Offer"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Conversion_userId_fkey') THEN
    ALTER TABLE "public"."Conversion"
      ADD CONSTRAINT "Conversion_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Conversion_offerId_fkey') THEN
    ALTER TABLE "public"."Conversion"
      ADD CONSTRAINT "Conversion_offerId_fkey"
      FOREIGN KEY ("offerId") REFERENCES "public"."Offer"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Wallet_userId_fkey') THEN
    ALTER TABLE "public"."Wallet"
      ADD CONSTRAINT "Wallet_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Payout_userId_fkey') THEN
    ALTER TABLE "public"."Payout"
      ADD CONSTRAINT "Payout_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
