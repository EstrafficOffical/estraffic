/*
  Warnings:

  - You are about to drop the column `description` on the `Offer` table. All the data in the column will be lost.
  - You are about to drop the column `isPublic` on the `Offer` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Offer` table. All the data in the column will be lost.
  - You are about to drop the column `payoutType` on the `Offer` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Offer` table. All the data in the column will be lost.
  - You are about to drop the column `targetUrl` on the `Offer` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[offerId,txId]` on the table `Conversion` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `title` to the `Offer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vertical` to the `Offer` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."OfferMode" AS ENUM ('Auto', 'Manual');

-- AlterTable
ALTER TABLE "public"."Offer" DROP COLUMN "description",
DROP COLUMN "isPublic",
DROP COLUMN "name",
DROP COLUMN "payoutType",
DROP COLUMN "status",
DROP COLUMN "targetUrl",
ADD COLUMN     "cpa" DECIMAL(12,2),
ADD COLUMN     "kpi1" DOUBLE PRECISION,
ADD COLUMN     "kpi2" DOUBLE PRECISION,
ADD COLUMN     "mode" "public"."OfferMode" NOT NULL DEFAULT 'Auto',
ADD COLUMN     "tag" TEXT,
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "vertical" TEXT NOT NULL,
ALTER COLUMN "geo" SET NOT NULL,
ALTER COLUMN "geo" SET DATA TYPE TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Conversion_offerId_txId_key" ON "public"."Conversion"("offerId", "txId");

-- CreateIndex
CREATE INDEX "Offer_title_idx" ON "public"."Offer"("title");

-- CreateIndex
CREATE INDEX "Offer_geo_idx" ON "public"."Offer"("geo");

-- CreateIndex
CREATE INDEX "Offer_vertical_idx" ON "public"."Offer"("vertical");
