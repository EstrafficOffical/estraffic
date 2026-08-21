-- CreateTable
CREATE TABLE "public"."NexusTrackingLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NexusTrackingLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NexusClick" (
    "id" TEXT NOT NULL,
    "clickId" TEXT NOT NULL,
    "trackingLinkId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "termsVersionId" TEXT,
    "sub1" VARCHAR(191),
    "sub2" VARCHAR(191),
    "sub3" VARCHAR(191),
    "sub4" VARCHAR(191),
    "sub5" VARCHAR(191),
    "source" VARCHAR(191),
    "campaign" VARCHAR(191),
    "adset" VARCHAR(191),
    "creative" VARCHAR(191),
    "ip" VARCHAR(191),
    "userAgent" TEXT,
    "referer" TEXT,
    "destinationUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NexusClick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NexusTrackingLink_token_key" ON "public"."NexusTrackingLink"("token");

-- CreateIndex
CREATE INDEX "NexusTrackingLink_flowId_idx" ON "public"."NexusTrackingLink"("flowId");

-- CreateIndex
CREATE INDEX "NexusTrackingLink_userId_createdAt_idx" ON "public"."NexusTrackingLink"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NexusTrackingLink_userId_flowId_key" ON "public"."NexusTrackingLink"("userId", "flowId");

-- CreateIndex
CREATE UNIQUE INDEX "NexusClick_clickId_key" ON "public"."NexusClick"("clickId");

-- CreateIndex
CREATE INDEX "NexusClick_trackingLinkId_createdAt_idx" ON "public"."NexusClick"("trackingLinkId", "createdAt");

-- CreateIndex
CREATE INDEX "NexusClick_userId_createdAt_idx" ON "public"."NexusClick"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "NexusClick_flowId_createdAt_idx" ON "public"."NexusClick"("flowId", "createdAt");

-- CreateIndex
CREATE INDEX "NexusClick_termsVersionId_createdAt_idx" ON "public"."NexusClick"("termsVersionId", "createdAt");
