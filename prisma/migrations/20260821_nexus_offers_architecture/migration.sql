-- CreateEnum
CREATE TYPE "public"."PartnerStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "public"."BrandStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."CatalogVisibility" AS ENUM ('VISIBLE', 'HIDDEN', 'PRIVATE');

-- CreateEnum
CREATE TYPE "public"."MarketStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "public"."FlowStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."FlowAccessMode" AS ENUM ('OPEN', 'APPROVAL_REQUIRED', 'PRIVATE');

-- CreateEnum
CREATE TYPE "public"."FlowAccessStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED');

-- CreateTable
CREATE TABLE "public"."Partner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "public"."PartnerStatus" NOT NULL DEFAULT 'ACTIVE',
    "vertical" VARCHAR(191),
    "contactName" VARCHAR(191),
    "contactEmail" VARCHAR(191),
    "contactTelegram" VARCHAR(191),
    "paymentTerms" VARCHAR(191),
    "settlementCurrency" VARCHAR(12) NOT NULL DEFAULT 'USD',
    "integrationType" VARCHAR(64),
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "vertical" VARCHAR(191) NOT NULL,
    "status" "public"."BrandStatus" NOT NULL DEFAULT 'ACTIVE',
    "catalogVisibility" "public"."CatalogVisibility" NOT NULL DEFAULT 'VISIBLE',
    "defaultPartnerId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Market" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "geo" VARCHAR(12) NOT NULL,
    "name" VARCHAR(191),
    "status" "public"."MarketStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Flow" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "partnerId" TEXT,
    "name" VARCHAR(191) NOT NULL,
    "trafficSource" VARCHAR(191) NOT NULL,
    "approach" VARCHAR(191),
    "tier" INTEGER NOT NULL DEFAULT 3,
    "status" "public"."FlowStatus" NOT NULL DEFAULT 'ACTIVE',
    "accessMode" "public"."FlowAccessMode" NOT NULL DEFAULT 'APPROVAL_REQUIRED',
    "trackingTemplate" TEXT,
    "targetUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Flow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FlowTermsVersion" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "advertiserCpa" DECIMAL(12,2),
    "affiliateCpa" DECIMAL(12,2),
    "currency" VARCHAR(12) NOT NULL DEFAULT 'USD',
    "capFtd" INTEGER,
    "minDeposit" DECIMAL(12,2),
    "baselineValue" DECIMAL(12,2),
    "baselineDescription" TEXT,
    "uniqueRdRequirement" DECIMAL(8,2),
    "wagerRequirement" DECIMAL(12,2),
    "validationTiming" VARCHAR(191),
    "fraudHoldDays" INTEGER,
    "kpiFallback" TEXT,
    "notes" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlowTermsVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FlowAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "termsVersionId" TEXT,
    "status" "public"."FlowAccessStatus" NOT NULL DEFAULT 'PENDING',
    "customAffiliateCpa" DECIMAL(12,2),
    "customCapFtd" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlowAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FlowAccessRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "status" "public"."RequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlowAccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Partner_name_key" ON "public"."Partner"("name");

-- CreateIndex
CREATE INDEX "Partner_status_idx" ON "public"."Partner"("status");

-- CreateIndex
CREATE INDEX "Partner_vertical_idx" ON "public"."Partner"("vertical");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "public"."Brand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "public"."Brand"("slug");

-- CreateIndex
CREATE INDEX "Brand_vertical_idx" ON "public"."Brand"("vertical");

-- CreateIndex
CREATE INDEX "Brand_status_idx" ON "public"."Brand"("status");

-- CreateIndex
CREATE INDEX "Brand_catalogVisibility_idx" ON "public"."Brand"("catalogVisibility");

-- CreateIndex
CREATE INDEX "Brand_defaultPartnerId_idx" ON "public"."Brand"("defaultPartnerId");

-- CreateIndex
CREATE INDEX "Market_geo_idx" ON "public"."Market"("geo");

-- CreateIndex
CREATE INDEX "Market_status_idx" ON "public"."Market"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Market_brandId_geo_key" ON "public"."Market"("brandId", "geo");

-- CreateIndex
CREATE INDEX "Flow_marketId_status_idx" ON "public"."Flow"("marketId", "status");

-- CreateIndex
CREATE INDEX "Flow_partnerId_idx" ON "public"."Flow"("partnerId");

-- CreateIndex
CREATE INDEX "Flow_tier_idx" ON "public"."Flow"("tier");

-- CreateIndex
CREATE INDEX "Flow_accessMode_idx" ON "public"."Flow"("accessMode");

-- CreateIndex
CREATE UNIQUE INDEX "Flow_marketId_name_key" ON "public"."Flow"("marketId", "name");

-- CreateIndex
CREATE INDEX "FlowTermsVersion_flowId_effectiveFrom_idx" ON "public"."FlowTermsVersion"("flowId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "FlowTermsVersion_flowId_version_key" ON "public"."FlowTermsVersion"("flowId", "version");

-- CreateIndex
CREATE INDEX "FlowAccess_flowId_status_idx" ON "public"."FlowAccess"("flowId", "status");

-- CreateIndex
CREATE INDEX "FlowAccess_termsVersionId_idx" ON "public"."FlowAccess"("termsVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "FlowAccess_userId_flowId_key" ON "public"."FlowAccess"("userId", "flowId");

-- CreateIndex
CREATE INDEX "FlowAccessRequest_status_createdAt_idx" ON "public"."FlowAccessRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "FlowAccessRequest_flowId_idx" ON "public"."FlowAccessRequest"("flowId");

-- CreateIndex
CREATE UNIQUE INDEX "FlowAccessRequest_userId_flowId_key" ON "public"."FlowAccessRequest"("userId", "flowId");

-- AddForeignKey
ALTER TABLE "public"."Brand" ADD CONSTRAINT "Brand_defaultPartnerId_fkey" FOREIGN KEY ("defaultPartnerId") REFERENCES "public"."Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Market" ADD CONSTRAINT "Market_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "public"."Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Flow" ADD CONSTRAINT "Flow_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "public"."Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Flow" ADD CONSTRAINT "Flow_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "public"."Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FlowTermsVersion" ADD CONSTRAINT "FlowTermsVersion_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "public"."Flow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FlowAccess" ADD CONSTRAINT "FlowAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FlowAccess" ADD CONSTRAINT "FlowAccess_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "public"."Flow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FlowAccess" ADD CONSTRAINT "FlowAccess_termsVersionId_fkey" FOREIGN KEY ("termsVersionId") REFERENCES "public"."FlowTermsVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FlowAccessRequest" ADD CONSTRAINT "FlowAccessRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FlowAccessRequest" ADD CONSTRAINT "FlowAccessRequest_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "public"."Flow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
