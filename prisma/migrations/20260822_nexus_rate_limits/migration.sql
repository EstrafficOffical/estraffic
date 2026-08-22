CREATE TABLE "NexusRateLimit" (
    "key" VARCHAR(64) NOT NULL,
    "scope" VARCHAR(80) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NexusRateLimit_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "NexusRateLimit_scope_resetAt_idx"
ON "NexusRateLimit"("scope", "resetAt");

CREATE INDEX "NexusRateLimit_resetAt_idx"
ON "NexusRateLimit"("resetAt");