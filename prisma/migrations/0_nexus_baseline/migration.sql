-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('USER', 'MANAGER', 'ADMIN', 'OWNER');

-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "public"."ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."OfferMode" AS ENUM ('Auto', 'Manual');

-- CreateEnum
CREATE TYPE "public"."OfferStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'PAUSED');

-- CreateEnum
CREATE TYPE "public"."PayoutType" AS ENUM ('CPA', 'CPL', 'CPS', 'REVSHARE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."ConversionType" AS ENUM ('REG', 'DEP', 'REBILL', 'SALE', 'LEAD');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "image" TEXT,
    "role" "public"."Role" NOT NULL DEFAULT 'USER',
    "status" "public"."UserStatus" NOT NULL DEFAULT 'PENDING',
    "tier" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "telegram" VARCHAR(191),
    "assignedManagerId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AffiliateApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "public"."ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "company" VARCHAR(191),
    "trafficSources" TEXT[],
    "mainGeos" TEXT[],
    "verticalInterests" TEXT[],
    "experience" TEXT,
    "estimatedMonthlyVolume" VARCHAR(191),
    "about" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Account" (
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

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "public"."Offer" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tag" TEXT,
    "cpa" DECIMAL(12,2),
    "geo" TEXT NOT NULL,
    "vertical" TEXT NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 3,
    "kpi1" DOUBLE PRECISION,
    "kpi2" DOUBLE PRECISION,
    "kpi1Text" TEXT,
    "kpi2Text" TEXT,
    "mode" "public"."OfferMode" NOT NULL DEFAULT 'Auto',
    "status" "public"."OfferStatus" NOT NULL DEFAULT 'ACTIVE',
    "targetUrl" TEXT,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "trackingTemplate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cap" INTEGER,
    "minDeposit" DECIMAL(12,2),
    "holdDays" INTEGER,
    "rules" TEXT,
    "notes" TEXT,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OfferAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OfferRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "message" TEXT,
    "status" "public"."RequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "OfferRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Click" (
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

-- CreateTable
CREATE TABLE "public"."Conversion" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "offerId" TEXT NOT NULL,
    "subId" TEXT,
    "type" "public"."ConversionType" NOT NULL,
    "amount" DECIMAL(12,2),
    "currency" TEXT,
    "txId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "externalId" TEXT,
    "status" TEXT,
    "source" TEXT,
    "clickId" TEXT,
    "data" JSONB,

    CONSTRAINT "Conversion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Wallet" (
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

-- CreateTable
CREATE TABLE "public"."Payout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'Paid',
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "public"."User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "public"."User"("status");

-- CreateIndex
CREATE INDEX "User_tier_idx" ON "public"."User"("tier");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "public"."User"("createdAt");

-- CreateIndex
CREATE INDEX "User_telegram_idx" ON "public"."User"("telegram");

-- CreateIndex
CREATE INDEX "User_assignedManagerId_idx" ON "public"."User"("assignedManagerId");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateApplication_userId_key" ON "public"."AffiliateApplication"("userId");

-- CreateIndex
CREATE INDEX "AffiliateApplication_status_createdAt_idx" ON "public"."AffiliateApplication"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AffiliateApplication_reviewedById_idx" ON "public"."AffiliateApplication"("reviewedById");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "public"."Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "public"."VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "public"."VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Offer_title_idx" ON "public"."Offer"("title");

-- CreateIndex
CREATE INDEX "Offer_geo_idx" ON "public"."Offer"("geo");

-- CreateIndex
CREATE INDEX "Offer_vertical_idx" ON "public"."Offer"("vertical");

-- CreateIndex
CREATE INDEX "Offer_tier_idx" ON "public"."Offer"("tier");

-- CreateIndex
CREATE INDEX "Offer_status_idx" ON "public"."Offer"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OfferAccess_userId_offerId_key" ON "public"."OfferAccess"("userId", "offerId");

-- CreateIndex
CREATE INDEX "OfferRequest_status_createdAt_idx" ON "public"."OfferRequest"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OfferRequest_userId_offerId_key" ON "public"."OfferRequest"("userId", "offerId");

-- CreateIndex
CREATE INDEX "Click_userId_createdAt_idx" ON "public"."Click"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Click_offerId_createdAt_idx" ON "public"."Click"("offerId", "createdAt");

-- CreateIndex
CREATE INDEX "Click_subId_createdAt_idx" ON "public"."Click"("subId", "createdAt");

-- CreateIndex
CREATE INDEX "Click_clickId_idx" ON "public"."Click"("clickId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversion_externalId_key" ON "public"."Conversion"("externalId");

-- CreateIndex
CREATE INDEX "Conversion_userId_createdAt_idx" ON "public"."Conversion"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Conversion_offerId_createdAt_idx" ON "public"."Conversion"("offerId", "createdAt");

-- CreateIndex
CREATE INDEX "Conversion_subId_createdAt_idx" ON "public"."Conversion"("subId", "createdAt");

-- CreateIndex
CREATE INDEX "Conversion_source_status_idx" ON "public"."Conversion"("source", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Conversion_offerId_txId_key" ON "public"."Conversion"("offerId", "txId");

-- CreateIndex
CREATE INDEX "Wallet_userId_isPrimary_idx" ON "public"."Wallet"("userId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_address_key" ON "public"."Wallet"("userId", "address");

-- CreateIndex
CREATE INDEX "Payout_userId_createdAt_idx" ON "public"."Payout"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_assignedManagerId_fkey" FOREIGN KEY ("assignedManagerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AffiliateApplication" ADD CONSTRAINT "AffiliateApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AffiliateApplication" ADD CONSTRAINT "AffiliateApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OfferAccess" ADD CONSTRAINT "OfferAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OfferAccess" ADD CONSTRAINT "OfferAccess_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "public"."Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OfferRequest" ADD CONSTRAINT "OfferRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OfferRequest" ADD CONSTRAINT "OfferRequest_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "public"."Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Click" ADD CONSTRAINT "Click_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Click" ADD CONSTRAINT "Click_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "public"."Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Conversion" ADD CONSTRAINT "Conversion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Conversion" ADD CONSTRAINT "Conversion_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "public"."Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payout" ADD CONSTRAINT "Payout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
