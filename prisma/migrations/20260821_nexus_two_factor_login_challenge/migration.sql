CREATE TABLE "NexusLoginChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NexusLoginChallenge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NexusLoginChallenge_tokenHash_key"
ON "NexusLoginChallenge"("tokenHash");

CREATE INDEX "NexusLoginChallenge_userId_expiresAt_idx"
ON "NexusLoginChallenge"("userId", "expiresAt");

CREATE INDEX "NexusLoginChallenge_expiresAt_idx"
ON "NexusLoginChallenge"("expiresAt");

ALTER TABLE "NexusLoginChallenge"
ADD CONSTRAINT "NexusLoginChallenge_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
