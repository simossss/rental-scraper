// Script to find potential duplicate listings
// Helps identify listings that should be merged but aren't

import { prisma } from '../db/client';

interface DuplicateCandidate {
  listing1: {
    id: string;
    title: string;
    priceMonthlyCents: number;
    totalAreaSqm: number | null;
    terraceAreaSqm: number | null;
    rooms: number | null;
    district: string | null;
    buildingName: string | null;
    referenceCodeNormalized: string | null;
    primaryUrl: string | null;
    sources: Array<{ sourceWebsiteCode: string; sourceListingId: string }>;
  };
  listing2: {
    id: string;
    title: string;
    priceMonthlyCents: number;
    totalAreaSqm: number | null;
    terraceAreaSqm: number | null;
    rooms: number | null;
    district: string | null;
    buildingName: string | null;
    referenceCodeNormalized: string | null;
    primaryUrl: string | null;
    sources: Array<{ sourceWebsiteCode: string; sourceListingId: string }>;
  };
  matchReason: string;
  priceDiff: number;
  areaDiff: number | null;
}

async function findDuplicates() {
  console.log('🔍 Searching for potential duplicate listings...\n');

  // Get all listings with their sources
  const allListings = await prisma.listing.findMany({
    include: {
      listingSources: {
        include: {
          sourceWebsite: {
            select: {
              code: true,
            },
          },
        },
      },
    },
    orderBy: {
      priceMonthlyCents: 'asc',
    },
  });

  console.log(`Total listings: ${allListings.length}\n`);

  const duplicates: DuplicateCandidate[] = [];

  // Compare each listing with every other listing
  for (let i = 0; i < allListings.length; i++) {
    const listing1 = allListings[i];
    
    for (let j = i + 1; j < allListings.length; j++) {
      const listing2 = allListings[j];

      // Skip if they're the same listing
      if (listing1.id === listing2.id) continue;

      // Check 1: Same reference code (normalized)
      if (
        listing1.referenceCodeNormalized &&
        listing2.referenceCodeNormalized &&
        listing1.referenceCodeNormalized === listing2.referenceCodeNormalized
      ) {
        duplicates.push({
          listing1: {
            id: listing1.id,
            title: listing1.title,
            priceMonthlyCents: listing1.priceMonthlyCents,
            totalAreaSqm: listing1.totalAreaSqm,
            terraceAreaSqm: listing1.terraceAreaSqm,
            rooms: listing1.rooms,
            district: listing1.district,
            buildingName: listing1.buildingName,
            referenceCodeNormalized: listing1.referenceCodeNormalized,
            primaryUrl: listing1.primaryUrl,
            sources: listing1.listingSources.map((ls) => ({
              sourceWebsiteCode: ls.sourceWebsite.code,
              sourceListingId: ls.sourceListingId,
            })),
          },
          listing2: {
            id: listing2.id,
            title: listing2.title,
            priceMonthlyCents: listing2.priceMonthlyCents,
            totalAreaSqm: listing2.totalAreaSqm,
            terraceAreaSqm: listing2.terraceAreaSqm,
            rooms: listing2.rooms,
            district: listing2.district,
            buildingName: listing2.buildingName,
            referenceCodeNormalized: listing2.referenceCodeNormalized,
            primaryUrl: listing2.primaryUrl,
            sources: listing2.listingSources.map((ls) => ({
              sourceWebsiteCode: ls.sourceWebsite.code,
              sourceListingId: ls.sourceListingId,
            })),
          },
          matchReason: 'Same reference code',
          priceDiff: Math.abs(listing1.priceMonthlyCents - listing2.priceMonthlyCents),
          areaDiff:
            listing1.totalAreaSqm && listing2.totalAreaSqm
              ? Math.abs(listing1.totalAreaSqm - listing2.totalAreaSqm)
              : null,
        });
        continue;
      }

      // Check 2: Similar reference codes (fuzzy match)
      if (
        listing1.referenceCodeNormalized &&
        listing2.referenceCodeNormalized
      ) {
        const base1 = listing1.referenceCodeNormalized.replace(/_[0-9]+$/, '').replace(/_+$/, '');
        const base2 = listing2.referenceCodeNormalized.replace(/_[0-9]+$/, '').replace(/_+$/, '');
        
        if (base1 === base2 && base1.length > 5) {
          // Same base prefix, check price and size
          const priceDiff = Math.abs(listing1.priceMonthlyCents - listing2.priceMonthlyCents);
          const areaDiff =
            listing1.totalAreaSqm && listing2.totalAreaSqm
              ? Math.abs(listing1.totalAreaSqm - listing2.totalAreaSqm)
              : null;

          if (priceDiff <= 10000 && (areaDiff === null || areaDiff <= 5)) {
            duplicates.push({
              listing1: {
                id: listing1.id,
                title: listing1.title,
                priceMonthlyCents: listing1.priceMonthlyCents,
                totalAreaSqm: listing1.totalAreaSqm,
                terraceAreaSqm: listing1.terraceAreaSqm,
                rooms: listing1.rooms,
                district: listing1.district,
                buildingName: listing1.buildingName,
                referenceCodeNormalized: listing1.referenceCodeNormalized,
                primaryUrl: listing1.primaryUrl,
                sources: listing1.listingSources.map((ls) => ({
                  sourceWebsiteCode: ls.sourceWebsite.code,
                  sourceListingId: ls.sourceListingId,
                })),
              },
              listing2: {
                id: listing2.id,
                title: listing2.title,
                priceMonthlyCents: listing2.priceMonthlyCents,
                totalAreaSqm: listing2.totalAreaSqm,
                terraceAreaSqm: listing2.terraceAreaSqm,
                rooms: listing2.rooms,
                district: listing2.district,
                buildingName: listing2.buildingName,
                referenceCodeNormalized: listing2.referenceCodeNormalized,
                primaryUrl: listing2.primaryUrl,
                sources: listing2.listingSources.map((ls) => ({
                  sourceWebsiteCode: ls.sourceWebsite.code,
                  sourceListingId: ls.sourceListingId,
                })),
              },
              matchReason: `Similar reference code (${base1})`,
              priceDiff,
              areaDiff,
            });
            continue;
          }
        }
      }

      // Check 3: Same price, area, rooms, district, building (no reference code)
      const priceDiff = Math.abs(listing1.priceMonthlyCents - listing2.priceMonthlyCents);
      const areaDiff =
        listing1.totalAreaSqm && listing2.totalAreaSqm
          ? Math.abs(listing1.totalAreaSqm - listing2.totalAreaSqm)
          : null;

      if (
        priceDiff <= 100 && // Very close price (within 1 EUR)
        areaDiff !== null &&
        areaDiff <= 2 && // Very close area (within 2 sqm)
        listing1.rooms === listing2.rooms &&
        listing1.rooms !== null &&
        listing1.district === listing2.district &&
        listing1.district !== null &&
        listing1.buildingName === listing2.buildingName &&
        listing1.buildingName !== null &&
        (!listing1.referenceCodeNormalized || !listing2.referenceCodeNormalized) // At least one missing reference
      ) {
        duplicates.push({
          listing1: {
            id: listing1.id,
            title: listing1.title,
            priceMonthlyCents: listing1.priceMonthlyCents,
            totalAreaSqm: listing1.totalAreaSqm,
            terraceAreaSqm: listing1.terraceAreaSqm,
            rooms: listing1.rooms,
            district: listing1.district,
            buildingName: listing1.buildingName,
            referenceCodeNormalized: listing1.referenceCodeNormalized,
            primaryUrl: listing1.primaryUrl,
            sources: listing1.listingSources.map((ls) => ({
              sourceWebsiteCode: ls.sourceWebsite.code,
              sourceListingId: ls.sourceListingId,
            })),
          },
          listing2: {
            id: listing2.id,
            title: listing2.title,
            priceMonthlyCents: listing2.priceMonthlyCents,
            totalAreaSqm: listing2.totalAreaSqm,
            terraceAreaSqm: listing2.terraceAreaSqm,
            rooms: listing2.rooms,
            district: listing2.district,
            buildingName: listing2.buildingName,
            referenceCodeNormalized: listing2.referenceCodeNormalized,
            primaryUrl: listing2.primaryUrl,
            sources: listing2.listingSources.map((ls) => ({
              sourceWebsiteCode: ls.sourceWebsite.code,
              sourceListingId: ls.sourceListingId,
            })),
          },
          matchReason: 'Same price, area, rooms, district, building (no ref code)',
          priceDiff,
          areaDiff,
        });
      }
    }
  }

  console.log(`\n📊 Found ${duplicates.length} potential duplicate pairs:\n`);

  // Group by match reason
  const byReason = new Map<string, DuplicateCandidate[]>();
  for (const dup of duplicates) {
    const existing = byReason.get(dup.matchReason) || [];
    existing.push(dup);
    byReason.set(dup.matchReason, existing);
  }

  for (const [reason, dups] of byReason.entries()) {
    console.log(`\n${reason}: ${dups.length} pairs`);
    console.log('─'.repeat(80));
    
    for (const dup of dups.slice(0, 5)) { // Show first 5 of each type
      console.log(`\nListing 1 (${dup.listing1.id.substring(0, 8)}...):`);
      console.log(`  Title: ${dup.listing1.title.substring(0, 60)}`);
      console.log(`  Price: ${dup.listing1.priceMonthlyCents / 100} EUR`);
      console.log(`  Area: ${dup.listing1.totalAreaSqm} sqm (terrace: ${dup.listing1.terraceAreaSqm || 0})`);
      console.log(`  Rooms: ${dup.listing1.rooms}`);
      console.log(`  Location: ${dup.listing1.district} - ${dup.listing1.buildingName}`);
      console.log(`  Ref: ${dup.listing1.referenceCodeNormalized || 'N/A'}`);
      console.log(`  Sources: ${dup.listing1.sources.map((s) => `${s.sourceWebsiteCode}:${s.sourceListingId}`).join(', ')}`);
      console.log(`  URL: ${dup.listing1.primaryUrl}`);
      
      console.log(`\nListing 2 (${dup.listing2.id.substring(0, 8)}...):`);
      console.log(`  Title: ${dup.listing2.title.substring(0, 60)}`);
      console.log(`  Price: ${dup.listing2.priceMonthlyCents / 100} EUR`);
      console.log(`  Area: ${dup.listing2.totalAreaSqm} sqm (terrace: ${dup.listing2.terraceAreaSqm || 0})`);
      console.log(`  Rooms: ${dup.listing2.rooms}`);
      console.log(`  Location: ${dup.listing2.district} - ${dup.listing2.buildingName}`);
      console.log(`  Ref: ${dup.listing2.referenceCodeNormalized || 'N/A'}`);
      console.log(`  Sources: ${dup.listing2.sources.map((s) => `${s.sourceWebsiteCode}:${s.sourceListingId}`).join(', ')}`);
      console.log(`  URL: ${dup.listing2.primaryUrl}`);
      
      console.log(`\n  Price diff: ${dup.priceDiff / 100} EUR, Area diff: ${dup.areaDiff || 'N/A'} sqm`);
      console.log('─'.repeat(80));
    }
    
    if (dups.length > 5) {
      console.log(`\n... and ${dups.length - 5} more pairs of this type\n`);
    }
  }

  // Summary
  console.log(`\n\n📈 Summary:`);
  console.log(`Total potential duplicates: ${duplicates.length}`);
  console.log(`Unique listings involved: ${new Set([...duplicates.map((d) => d.listing1.id), ...duplicates.map((d) => d.listing2.id)]).size}`);
  
  // Check if duplicates are from different sources
  const crossSource = duplicates.filter(
    (d) =>
      !d.listing1.sources.some((s1) =>
        d.listing2.sources.some((s2) => s1.sourceWebsiteCode === s2.sourceWebsiteCode)
      )
  );
  console.log(`Cross-source duplicates: ${crossSource.length}`);
}

async function main() {
  try {
    await findDuplicates();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

