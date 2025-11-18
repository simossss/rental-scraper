import { ContractType, PropertyType, Condition, InteriorCondition } from "@prisma/client";
import { prisma } from "../db/client";
import { normalizeReference, buildFingerprint } from "../lib/normalize";
import { scoreListing } from "../scoring/monacoScoring";

export type ParsedListingInput = {
  sourceWebsiteCode: string;
  sourceListingId: string;
  url: string;
  referenceRaw?: string | null;

  title: string;
  city: string;
  district?: string | null;
  buildingName?: string | null;
  address?: string | null;

  contractType: ContractType;
  propertyType: PropertyType;

  priceMonthlyCents: number;
  serviceChargesMonthlyCents?: number | null;
  serviceChargesIncluded?: boolean | null;

  rooms?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  totalAreaSqm?: number | null;
  livingAreaSqm?: number | null;
  terraceAreaSqm?: number | null;
  floor?: number | null;

  parkingSpaces?: number | null;
  cellars?: number | null;
  isMixedUse?: boolean | null;

  hasRooftop?: boolean | null;
  hasTerrace?: boolean | null;
  hasSeaView?: boolean | null;
  hasElevator?: boolean | null;
  hasConcierge?: boolean | null;
  hasAC?: boolean | null;
  condition?: Condition | null;
  interiorCondition?: InteriorCondition | null;

  featuresTags?: string[];
  description?: string | null;
  descriptionLang?: string | null;

  agencyName?: string | null;
  agencyAddress?: string | null;
  agencyPhone?: string | null;
  agencyEmail?: string | null;
  agencyWebsite?: string | null;

  imageUrls?: string[];
  rawPayload?: any;
};

export type UpsertResult = {
  listingId: string;
  listingSourceId: string;
  createdNewListing: boolean;
  score: number | null;
  priceMonthlyCents: number;
};

export async function upsertParsedListing(input: ParsedListingInput): Promise<UpsertResult> {
  const sourceWebsite = await prisma.sourceWebsite.findUnique({
    where: { code: input.sourceWebsiteCode },
  });

  if (!sourceWebsite) {
    throw new Error(`SourceWebsite with code ${input.sourceWebsiteCode} not found`);
  }

  const normalizedRef = normalizeReference(input.referenceRaw);
  let shouldUseRifCode = true; // Track if we can safely use the RIF code
  const fingerprint = buildFingerprint({
    city: input.city,
    district: input.district,
    buildingName: input.buildingName,
    livingAreaSqm: input.livingAreaSqm,
    terraceAreaSqm: input.terraceAreaSqm,
    bedrooms: input.bedrooms,
    rooms: input.rooms,
    priceMonthlyCents: input.priceMonthlyCents,
  });

  let listing = null;

  // For single-source scraping, prioritize finding by sourceListingId (URL ID)
  // This is the most reliable method since each URL has a unique ID
  const existingSource = await prisma.listingSource.findUnique({
    where: {
      sourceWebsiteId_sourceListingId: {
        sourceWebsiteId: sourceWebsite.id,
        sourceListingId: input.sourceListingId,
      },
    },
    include: {
      listing: true,
    },
  });

  if (existingSource) {
    listing = existingSource.listing;
    console.log(`Found existing ListingSource for URL ID ${input.sourceListingId}, listingId=${listing.id}`);
  }

  // Fallback 1: Try by normalized reference code (RIF)
  // This can match listings from OTHER websites (cross-website deduplication)
  if (!listing && normalizedRef) {
    const listingByRif = await prisma.listing.findUnique({
      where: { referenceCodeNormalized: normalizedRef },
      include: {
        listingSources: true,
      },
    });
    
    if (listingByRif) {
      // Check if this listing already has a source from this website with this URL ID
      const hasThisUrlId = listingByRif.listingSources.some(
        (s) => s.sourceWebsiteId === sourceWebsite.id && s.sourceListingId === input.sourceListingId
      );
      
      if (hasThisUrlId) {
        // Already have this exact source, use it
        listing = listingByRif;
      } else {
        // Cross-website match: verify it's the same listing by price and size
        // Price tolerance: within 100 EUR (10000 cents)
        const priceDiff = Math.abs(listingByRif.priceMonthlyCents - input.priceMonthlyCents);
        const priceMatches = priceDiff <= 10000;
        
        // Size tolerance: within 5 sqm
        const existingTotalArea = listingByRif.totalAreaSqm;
        const incomingTotalArea = input.totalAreaSqm;
        const existingTerraceArea = listingByRif.terraceAreaSqm;
        const incomingTerraceArea = input.terraceAreaSqm;

        const totalAreaMatches =
          existingTotalArea == null || incomingTotalArea == null
            ? existingTotalArea == null && incomingTotalArea == null
            : Math.abs(existingTotalArea - incomingTotalArea) <= 5;
        
        const livableArea1 =
          existingTotalArea == null
            ? null
            : existingTotalArea - (existingTerraceArea ?? 0);
        const livableArea2 =
          incomingTotalArea == null
            ? null
            : incomingTotalArea - (incomingTerraceArea ?? 0);
        const livableAreaMatches =
          livableArea1 === null || livableArea2 === null
            ? livableArea1 === livableArea2
            : Math.abs(livableArea1 - livableArea2) <= 5;
        
        if (priceMatches && (totalAreaMatches || livableAreaMatches)) {
          // It's the same listing from a different website - merge the sources
          console.log(`Cross-website match found by reference code: ${normalizedRef}, price and size match`);
          listing = listingByRif;
        } else {
          // Different listing with same reference code (rare but possible)
          // Don't merge, and don't use this RIF code (would violate unique constraint)
          shouldUseRifCode = false;
        }
      }
    }
  }

  // Fallback 2: Try by fingerprint (for listings without reference codes)
  // BUT be very careful - only match if we can verify it's the same listing by URL ID
  // This prevents incorrect merges of different listings with similar characteristics
  let shouldUseFingerprint = true;
  if (!listing) {
    const listingByFingerprint = await prisma.listing.findUnique({
      where: { fingerprint },
      include: {
        listingSources: {
          where: { sourceWebsiteId: sourceWebsite.id },
          select: { sourceListingId: true },
        },
      },
    });
    
    // Only use fingerprint match if the listing already has this URL ID
    // This ensures we're not merging different listings that happen to have similar fingerprints
    if (listingByFingerprint) {
      const hasThisUrlId = listingByFingerprint.listingSources.some(
        (s) => s.sourceListingId === input.sourceListingId
      );
      if (hasThisUrlId) {
        listing = listingByFingerprint;
      } else {
        // If listing exists but doesn't have this URL ID, don't merge
        // AND don't use this fingerprint (it would violate unique constraint)
        // (they might be different listings with similar characteristics)
        shouldUseFingerprint = false;
      }
    }
  }

  const now = new Date();
  const mergedUrls = Array.from(
    new Set([...(listing?.allUrls as string[] | null | undefined || []), input.url])
  );
  const mergedImages = Array.from(
    new Set([...(listing?.imageUrls as string[] | null | undefined || []), ...(input.imageUrls || [])])
  );

  let createdNewListing = false;

  if (!listing) {
    // Generate a unique fingerprint if the original would conflict
    let finalFingerprint = fingerprint;
    if (!shouldUseFingerprint) {
      // Append URL ID to make fingerprint unique
      finalFingerprint = `${fingerprint}|url:${input.sourceListingId}`;
    }
    
    try {
      listing = await prisma.listing.create({
        data: {
          fingerprint: finalFingerprint,
        referenceCode: input.referenceRaw || null,
        // Only set referenceCodeNormalized if it's safe (won't conflict with existing listing)
        referenceCodeNormalized: (shouldUseRifCode && normalizedRef) || null,

        title: input.title,
        city: input.city,
        district: input.district || null,
        buildingName: input.buildingName || null,
        address: input.address || null,

        contractType: input.contractType,
        propertyType: input.propertyType,

        priceMonthlyCents: input.priceMonthlyCents,
        currency: "EUR",
        serviceChargesMonthlyCents: input.serviceChargesMonthlyCents ?? null,
        serviceChargesIncluded: input.serviceChargesIncluded ?? null,

        rooms: input.rooms ?? null,
        bedrooms: input.bedrooms ?? null,
        bathrooms: input.bathrooms ?? null,
        totalAreaSqm: input.totalAreaSqm ?? null,
        livingAreaSqm: input.livingAreaSqm ?? null,
        terraceAreaSqm: input.terraceAreaSqm ?? null,
        floor: input.floor ?? null,

        parkingSpaces: input.parkingSpaces ?? null,
        cellars: input.cellars ?? null,
        isMixedUse: input.isMixedUse ?? null,

        hasRooftop: input.hasRooftop ?? null,
        hasTerrace: input.hasTerrace ?? null,
        hasSeaView: input.hasSeaView ?? null,
        hasElevator: input.hasElevator ?? null,
        hasConcierge: input.hasConcierge ?? null,
        hasAC: input.hasAC ?? null,
        condition: input.condition ?? Condition.UNKNOWN,
        interiorCondition: input.interiorCondition ?? null,
        featuresTags: input.featuresTags || [],

        description: input.description || null,
        descriptionLang: input.descriptionLang || null,

        agencyName: input.agencyName || null,
        agencyAddress: input.agencyAddress || null,
        agencyPhone: input.agencyPhone || null,
        agencyEmail: input.agencyEmail || null,
        agencyWebsite: input.agencyWebsite || null,

        primaryUrl: input.url,
        allUrls: mergedUrls,
        imageUrls: mergedImages,

        firstSeenAt: now,
        lastSeenAt: now,
        isActive: true,
        score: null, // Will be computed after creation
      },
    });
    } catch (error: any) {
      // Handle race condition: if fingerprint already exists, look it up
      if (error.code === 'P2002' && error.meta?.target?.includes('fingerprint')) {
        console.log(`⚠️  Fingerprint conflict detected: ${finalFingerprint}, looking up existing listing...`);
        listing = await prisma.listing.findUnique({
          where: { fingerprint: finalFingerprint },
        });
        if (!listing) {
          // If still not found, try with URL ID appended
          const fallbackFingerprint = `${fingerprint}|url:${input.sourceListingId}`;
          listing = await prisma.listing.findUnique({
            where: { fingerprint: fallbackFingerprint },
          });
          if (listing) {
            console.log(`✅ Found existing listing with fallback fingerprint: ${fallbackFingerprint}`);
          }
        }
        if (!listing) {
          // If still not found, throw the original error
          throw error;
        }
        console.log(`✅ Found existing listing by fingerprint: ${listing.id}`);
        // Don't set createdNewListing = true since we found an existing listing
        createdNewListing = false;
      } else {
        throw error;
      }
    }

    // Compute and update score (only if we just created it, not if we found it)
    if (listing && !listing.score) {
      const computedScore = scoreListing(listing);
      listing = await prisma.listing.update({
        where: { id: listing.id },
        data: { score: computedScore },
      });
    }

    // Only mark as new if we actually created it (not if we found it via error handling)
    if (createdNewListing === undefined) {
      createdNewListing = true;
    }
  } else {
    listing = await prisma.listing.update({
      where: { id: listing.id },
      data: {
        title: input.title || listing.title,
        district: input.district ?? listing.district,
        buildingName: input.buildingName ?? listing.buildingName,
        address: input.address ?? listing.address,

        priceMonthlyCents: input.priceMonthlyCents,
        serviceChargesMonthlyCents:
          input.serviceChargesMonthlyCents ?? listing.serviceChargesMonthlyCents,
        serviceChargesIncluded:
          input.serviceChargesIncluded ?? listing.serviceChargesIncluded,

        rooms: input.rooms ?? listing.rooms,
        bedrooms: input.bedrooms ?? listing.bedrooms,
        bathrooms: input.bathrooms ?? listing.bathrooms,
        totalAreaSqm: input.totalAreaSqm ?? listing.totalAreaSqm,
        livingAreaSqm: input.livingAreaSqm ?? listing.livingAreaSqm,
        terraceAreaSqm: input.terraceAreaSqm ?? listing.terraceAreaSqm,
        floor: input.floor ?? listing.floor,

        parkingSpaces: input.parkingSpaces ?? listing.parkingSpaces,
        cellars: input.cellars ?? listing.cellars,
        isMixedUse: input.isMixedUse ?? listing.isMixedUse,

        hasRooftop: input.hasRooftop ?? listing.hasRooftop,
        hasTerrace: input.hasTerrace ?? listing.hasTerrace,
        hasSeaView: input.hasSeaView ?? listing.hasSeaView,
        hasElevator: input.hasElevator ?? listing.hasElevator,
        hasConcierge: input.hasConcierge ?? listing.hasConcierge,
        hasAC: input.hasAC ?? listing.hasAC,
        condition: input.condition ?? listing.condition,
        interiorCondition: input.interiorCondition ?? listing.interiorCondition,
        featuresTags: (input.featuresTags ?? listing.featuresTags) as any,

        description: input.description ?? listing.description,
        descriptionLang: input.descriptionLang ?? listing.descriptionLang,

        agencyName: input.agencyName ?? listing.agencyName,
        agencyAddress: input.agencyAddress ?? listing.agencyAddress,
        agencyPhone: input.agencyPhone ?? listing.agencyPhone,
        agencyEmail: input.agencyEmail ?? listing.agencyEmail,
        agencyWebsite: input.agencyWebsite ?? listing.agencyWebsite,

        primaryUrl: listing.primaryUrl || input.url,
        allUrls: mergedUrls,
        imageUrls: mergedImages,

        lastSeenAt: now,
        isActive: true,
        score: null, // Will be computed after update
      },
    });

    // Compute and update score
    const computedScore = scoreListing(listing);
    listing = await prisma.listing.update({
      where: { id: listing.id },
      data: { score: computedScore },
    });
  }

  const listingSource = await prisma.listingSource.upsert({
    where: {
      sourceWebsiteId_sourceListingId: {
        sourceWebsiteId: sourceWebsite.id,
        sourceListingId: input.sourceListingId,
      },
    },
    create: {
      listingId: listing.id,
      sourceWebsiteId: sourceWebsite.id,
      sourceListingId: input.sourceListingId,
      url: input.url,
      sourceReferenceCode: input.referenceRaw || null,
      sourceReferenceCodeNormalized: normalizedRef || null,
      sourceTitle: input.title,
      rawPayload: input.rawPayload ?? {},
      firstSeenAt: now,
      lastSeenAt: now,
      isActiveOnSource: true,
    },
    update: {
      listingId: listing.id,
      url: input.url,
      sourceReferenceCode: input.referenceRaw || null,
      sourceReferenceCodeNormalized: normalizedRef || null,
      sourceTitle: input.title,
      rawPayload: input.rawPayload ?? {},
      lastSeenAt: now,
      isActiveOnSource: true,
    },
  });

  return {
    listingId: listing.id,
    listingSourceId: listingSource.id,
    createdNewListing,
    score: listing.score,
    priceMonthlyCents: listing.priceMonthlyCents,
  };
}
