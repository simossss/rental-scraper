-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('RENT', 'SALE');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('APARTMENT', 'STUDIO', 'PENTHOUSE_APARTMENT', 'VILLA', 'OTHER');

-- CreateEnum
CREATE TYPE "Condition" AS ENUM ('NEW', 'RENOVATED', 'GOOD', 'NEEDS_WORK', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ScrapeStatus" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILED');

-- CreateTable
CREATE TABLE "SourceWebsite" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceWebsite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "referenceCode" TEXT,
    "title" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT,
    "buildingName" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "contractType" "ContractType" NOT NULL,
    "propertyType" "PropertyType" NOT NULL,
    "priceMonthlyCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "serviceChargesMonthlyCents" INTEGER,
    "serviceChargesIncluded" BOOLEAN,
    "rooms" INTEGER,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "totalAreaSqm" INTEGER,
    "livingAreaSqm" INTEGER,
    "terraceAreaSqm" INTEGER,
    "floor" INTEGER,
    "parkingSpaces" INTEGER,
    "cellars" INTEGER,
    "isMixedUse" BOOLEAN,
    "hasRooftop" BOOLEAN,
    "hasTerrace" BOOLEAN,
    "hasSeaView" BOOLEAN,
    "hasElevator" BOOLEAN,
    "condition" "Condition" NOT NULL DEFAULT 'UNKNOWN',
    "featuresTags" JSONB,
    "description" TEXT,
    "descriptionLang" TEXT,
    "agencyName" TEXT,
    "agencyAddress" TEXT,
    "agencyPhone" TEXT,
    "agencyEmail" TEXT,
    "agencyWebsite" TEXT,
    "primaryUrl" TEXT,
    "allUrls" JSONB,
    "imageUrls" JSONB,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "score" DECIMAL(6,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingSource" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "sourceWebsiteId" INTEGER NOT NULL,
    "sourceListingId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sourceReferenceCode" TEXT,
    "sourceTitle" TEXT,
    "rawPayload" JSONB,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActiveOnSource" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapeRun" (
    "id" TEXT NOT NULL,
    "sourceWebsiteId" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" "ScrapeStatus" NOT NULL DEFAULT 'SUCCESS',
    "rawCount" INTEGER NOT NULL DEFAULT 0,
    "upsertedListingSources" INTEGER NOT NULL DEFAULT 0,
    "newListings" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,

    CONSTRAINT "ScrapeRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SourceWebsite_code_key" ON "SourceWebsite"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_fingerprint_key" ON "Listing"("fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "ListingSource_sourceWebsiteId_sourceListingId_key" ON "ListingSource"("sourceWebsiteId", "sourceListingId");

-- AddForeignKey
ALTER TABLE "ListingSource" ADD CONSTRAINT "ListingSource_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingSource" ADD CONSTRAINT "ListingSource_sourceWebsiteId_fkey" FOREIGN KEY ("sourceWebsiteId") REFERENCES "SourceWebsite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrapeRun" ADD CONSTRAINT "ScrapeRun_sourceWebsiteId_fkey" FOREIGN KEY ("sourceWebsiteId") REFERENCES "SourceWebsite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
