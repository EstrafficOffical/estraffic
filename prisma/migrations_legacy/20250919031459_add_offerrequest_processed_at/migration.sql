-- Add processedAt to OfferRequest if missing (safe)
ALTER TABLE "OfferRequest" ADD COLUMN IF NOT EXISTS "processedAt" TIMESTAMPTZ;
