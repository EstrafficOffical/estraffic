-- STEP 8E.1: NEXUS Finance Core
-- Adds earning lifecycle, immutable bucket ledger, and payout lifecycle.

CREATE TYPE "NexusEarningStatus" AS ENUM ('PENDING', 'AVAILABLE', 'REVERSED');

CREATE TYPE "NexusFinanceBucket" AS ENUM ('PENDING', 'AVAILABLE', 'RESERVED', 'PAID');

CREATE TYPE "NexusFinanceEntryKind" AS ENUM (
  'EARNING_CREDIT',
  'RELEASE_PENDING_DEBIT',
  'RELEASE_AVAILABLE_CREDIT',
  'PAYOUT_RESERVE_AVAILABLE_DEBIT',
  'PAYOUT_RESERVE_CREDIT',
  'PAYOUT_PAID_RESERVED_DEBIT',
  'PAYOUT_PAID_CREDIT',
  'PAYOUT_REJECT_RESERVED_DEBIT',
  'PAYOUT_REJECT_AVAILABLE_CREDIT',
  'REVERSAL',
  'ADMIN_ADJUSTMENT'
);

CREATE TYPE "NexusPayoutStatus" AS ENUM (
  'REQUESTED',
  'APPROVED',
  'PAID',
  'REJECTED',
  'CANCELED'
);

CREATE TABLE "NexusEarning" (
  "id" TEXT NOT NULL,
  "nexusConversionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "flowId" TEXT NOT NULL,
  "termsVersionId" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" VARCHAR(12) NOT NULL DEFAULT 'USD',
  "status" "NexusEarningStatus" NOT NULL DEFAULT 'PENDING',
  "releaseAt" TIMESTAMP(3),
  "availableAt" TIMESTAMP(3),
  "reversedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NexusEarning_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NexusFinanceLedger" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "currency" VARCHAR(12) NOT NULL DEFAULT 'USD',
  "bucket" "NexusFinanceBucket" NOT NULL,
  "kind" "NexusFinanceEntryKind" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "nexusEarningId" TEXT,
  "nexusConversionId" TEXT,
  "payoutId" TEXT,
  "idempotencyKey" VARCHAR(191) NOT NULL,
  "description" VARCHAR(255),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NexusFinanceLedger_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NexusPayout" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "walletId" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" VARCHAR(12) NOT NULL DEFAULT 'USD',
  "status" "NexusPayoutStatus" NOT NULL DEFAULT 'REQUESTED',
  "destinationLabel" VARCHAR(64),
  "destinationAddress" VARCHAR(255) NOT NULL,
  "txHash" VARCHAR(255),
  "reviewedById" TEXT,
  "note" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NexusPayout_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NexusEarning_nexusConversionId_key"
  ON "NexusEarning"("nexusConversionId");

CREATE INDEX "NexusEarning_userId_status_releaseAt_idx"
  ON "NexusEarning"("userId", "status", "releaseAt");

CREATE INDEX "NexusEarning_flowId_createdAt_idx"
  ON "NexusEarning"("flowId", "createdAt");

CREATE INDEX "NexusEarning_termsVersionId_createdAt_idx"
  ON "NexusEarning"("termsVersionId", "createdAt");

CREATE UNIQUE INDEX "NexusFinanceLedger_idempotencyKey_key"
  ON "NexusFinanceLedger"("idempotencyKey");

CREATE INDEX "NexusFinanceLedger_userId_currency_bucket_createdAt_idx"
  ON "NexusFinanceLedger"("userId", "currency", "bucket", "createdAt");

CREATE INDEX "NexusFinanceLedger_nexusEarningId_createdAt_idx"
  ON "NexusFinanceLedger"("nexusEarningId", "createdAt");

CREATE INDEX "NexusFinanceLedger_nexusConversionId_createdAt_idx"
  ON "NexusFinanceLedger"("nexusConversionId", "createdAt");

CREATE INDEX "NexusFinanceLedger_payoutId_createdAt_idx"
  ON "NexusFinanceLedger"("payoutId", "createdAt");

CREATE INDEX "NexusPayout_userId_status_createdAt_idx"
  ON "NexusPayout"("userId", "status", "createdAt");

CREATE INDEX "NexusPayout_status_createdAt_idx"
  ON "NexusPayout"("status", "createdAt");

CREATE INDEX "NexusPayout_walletId_idx"
  ON "NexusPayout"("walletId");

CREATE INDEX "NexusPayout_reviewedById_createdAt_idx"
  ON "NexusPayout"("reviewedById", "createdAt");