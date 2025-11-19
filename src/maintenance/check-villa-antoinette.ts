// Check Villa Antoinette listings in the database
import { prisma } from '../db/client';
import { normalizeReference } from '../lib/normalize';

async function checkVillaAntoinette() {
  console.log('🔍 Checking Villa Antoinette listings...\n');

  // Find all listings with "Villa Antoinette" in the title
  const listings = await prisma.listing.findMany({
    where: {
      title: {
        contains: 'Villa Antoinette',
        mode: 'insensitive',
      },
    },
    include: {
      listingSources: {
        include: {
          sourceWebsite: true,
        },
      },
    },
  });

  console.log(`Found ${listings.length} listing(s) with "Villa Antoinette" in title:\n`);

  for (const listing of listings) {
    console.log(`📋 Listing ID: ${listing.id}`);
    console.log(`   Title: ${listing.title}`);
    console.log(`   Reference Code (raw): ${listing.referenceCode || 'null'}`);
    console.log(`   Reference Code (normalized): ${listing.referenceCodeNormalized || 'null'}`);
    console.log(`   Price: ${listing.priceMonthlyCents / 100} EUR`);
    console.log(`   Total Area: ${listing.totalAreaSqm} sqm`);
    console.log(`   Terrace Area: ${listing.terraceAreaSqm} sqm`);
    console.log(`   Rooms: ${listing.rooms}`);
    console.log(`   District: ${listing.district}`);
    console.log(`   Building: ${listing.buildingName}`);
    console.log(`   Sources (${listing.listingSources.length}):`);
    for (const source of listing.listingSources) {
      console.log(`     - ${source.sourceWebsite.code}: ${source.sourceListingId}`);
      console.log(`       URL: ${source.url}`);
    }
    console.log('');
  }

  // Check what the normalized reference should be
  const cimRef = 'rif WL Villa Antoinette';
  const mcreRef = 'WL Villa Antoinette';
  
  console.log('🧪 Testing normalization:');
  console.log(`   CIM: "${cimRef}" -> "${normalizeReference(cimRef)}"`);
  console.log(`   MCRE: "${mcreRef}" -> "${normalizeReference(mcreRef)}"`);
  console.log(`   Match: ${normalizeReference(cimRef) === normalizeReference(mcreRef)}`);

  await prisma.$disconnect();
}

checkVillaAntoinette().catch(console.error);

