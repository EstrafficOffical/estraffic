CREATE TABLE "NexusSecurityEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "userId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NexusSecurityEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NexusSecurityEvent_eventType_createdAt_idx"
ON "NexusSecurityEvent"("eventType", "createdAt");

CREATE INDEX "NexusSecurityEvent_userId_createdAt_idx"
ON "NexusSecurityEvent"("userId", "createdAt");
