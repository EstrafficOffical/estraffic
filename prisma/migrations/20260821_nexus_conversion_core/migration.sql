-- CreateEnum
CREATE TYPE "public"."NexusConversionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVERSED');

-- AlterTable
ALTER TABLE "public"."NexusClick" ADD COLUMN     "advertiserCpaSnapshot" DECIMAL(12,2),
ADD COLUMN     "affiliateCpaSnapshot" DECIMAL(12,2),
ADD COLUMN     "capFtdSnapshot" INTEGER,
ADD COLUMN     "currencySnapshot" VARCHAR(12);

-- CreateTable
CREATE TABLE "public"."NexusConversion" (
    "id" TEXT NOT NULL,
    "nexusClickId" TEXT NOT NULL,
    "clickId" VARCHAR(191) NOT NULL,
    "userId" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "termsVersionId" TEXT,
    "type" "public"."ConversionType" NOT NULL,
    "status" "public"."NexusConversionStatus" NOT NULL DEFAULT 'APPROVED',
    "source" VARCHAR(64) NOT NULL,
    "txId" VARCHAR(191) NOT NULL,
    "externalId" VARCHAR(191),
    "advertiserAmount" DECIMAL(12,2),
    "affiliatePayout" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(12) NOT NULL DEFAULT 'USD',
    "raw" JSONB,
    "eventAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NexusConversion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NexusConversion_clickId_idx" ON "public"."NexusConversion"("clickId");

-- CreateIndex
CREATE INDEX "NexusConversion_nexusClickId_idx" ON "public"."NexusConversion"("nexusClickId");

-- CreateIndex
CREATE INDEX "NexusConversion_userId_createdAt_idx" ON "public"."NexusConversion"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "NexusConversion_flowId_createdAt_idx" ON "public"."NexusConversion"("flowId", "createdAt");

-- CreateIndex
CREATE INDEX "NexusConversion_termsVersionId_createdAt_idx" ON "public"."NexusConversion"("termsVersionId", "createdAt");

-- CreateIndex
CREATE INDEX "NexusConversion_type_status_createdAt_idx" ON "public"."NexusConversion"("type", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NexusConversion_source_txId_key" ON "public"."NexusConversion"("source", "txId");
