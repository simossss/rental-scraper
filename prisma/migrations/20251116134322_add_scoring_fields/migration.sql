/*
  Warnings:

  - You are about to alter the column `score` on the `Listing` table. The data in that column could be lost. The data in that column will be cast from `Decimal(6,2)` to `Integer`.

*/
-- CreateEnum
CREATE TYPE "InteriorCondition" AS ENUM ('LUXURY_RENOVATED', 'GOOD_MODERN', 'DATED_OK', 'VERY_DATED', 'POOR');

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "hasAC" BOOLEAN,
ADD COLUMN     "hasConcierge" BOOLEAN,
ADD COLUMN     "interiorCondition" "InteriorCondition",
ALTER COLUMN "score" SET DATA TYPE INTEGER;
