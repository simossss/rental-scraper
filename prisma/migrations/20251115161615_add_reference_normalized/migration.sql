/*
  Warnings:

  - A unique constraint covering the columns `[referenceCodeNormalized]` on the table `Listing` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "referenceCodeNormalized" TEXT;

-- AlterTable
ALTER TABLE "ListingSource" ADD COLUMN     "sourceReferenceCodeNormalized" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Listing_referenceCodeNormalized_key" ON "Listing"("referenceCodeNormalized");
