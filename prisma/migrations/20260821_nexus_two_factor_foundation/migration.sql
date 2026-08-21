CREATE TABLE "NexusTwoFactor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "secretEnc" TEXT,
    "pendingSecretEnc" TEXT,
    "setupExpiresAt" TIMESTAMP(3),
    "recoveryHashes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "confirmedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NexusTwoFactor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NexusTwoFactor_userId_key"
ON "NexusTwoFactor"("userId");

ALTER TABLE "NexusTwoFactor"
ADD CONSTRAINT "NexusTwoFactor_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
