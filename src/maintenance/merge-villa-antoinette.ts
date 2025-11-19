// Merge the two Villa Antoinette listings
import { prisma } from '../db/client';

async function mergeVillaAntoinette() {
  console.log('🔀 Merging Villa Antoinette duplicate listings...\n');

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

  if (listings.length !== 2) {
    console.log(`Expected 2 listings, found ${listings.length}. Aborting.`);
    await prisma.$disconnect();
    return;
  }

  // The MCRE listing has the correct reference code
  const mcreListing = listings.find(l => 
    l.listingSources.some(s => s.sourceWebsite.code === 'MCRE')
  );
  const cimListing = listings.find(l => 
    l.listingSources.some(s => s.sourceWebsite.code === 'CIM')
  );

  if (!mcreListing || !cimListing) {
    console.log('Could not find both MCRE and CIM listings. Aborting.');
    await prisma.$disconnect();
    return;
  }

  console.log(`MCRE Listing ID: ${mcreListing.id} (keeping this one)`);
  console.log(`CIM Listing ID: ${cimListing.id} (merging into MCRE)`);
  console.log('');

  // Get the CIM source
  const cimSource = cimListing.listingSources.find(s => s.sourceWebsite.code === 'CIM');
  if (!cimSource) {
    console.log('Could not find CIM source. Aborting.');
    await prisma.$disconnect();
    return;
  }

  // Check if MCRE listing already has this source
  const hasCimSource = mcreListing.listingSources.some(s => 
    s.sourceWebsite.code === 'CIM' && s.sourceListingId === cimSource.sourceListingId
  );

  if (hasCimSource) {
    console.log('MCRE listing already has the CIM source. Nothing to merge.');
    await prisma.$disconnect();
    return;
  }

  // Update the CIM source to point to the MCRE listing
  console.log('Updating CIM source to point to MCRE listing...');
  await prisma.listingSource.update({
    where: { id: cimSource.id },
    data: {
      listingId: mcreListing.id,
    },
  });

  // Update MCRE listing to include CIM URL if not already present
  const mcreUrls = new Set<string>((mcreListing.allUrls as string[]) || []);
  const cimUrls = (cimListing.allUrls as string[]) || [];
  cimUrls.forEach((url: string) => mcreUrls.add(url));

  const mergedUrls = Array.from(mcreUrls);

  // Merge images
  const mcreImages = new Set<string>((mcreListing.imageUrls as string[]) || []);
  const cimImages = (cimListing.imageUrls as string[]) || [];
  cimImages.forEach((img: string) => mcreImages.add(img));
  const mergedImages = Array.from(mcreImages);

  // Update MCRE listing with merged URLs and images
  await prisma.listing.update({
    where: { id: mcreListing.id },
    data: {
      allUrls: mergedUrls,
      imageUrls: mergedImages,
      // Use the better title if available
      title: mcreListing.title || cimListing.title,
      // Use the reference code from MCRE (it's correct)
      referenceCode: mcreListing.referenceCode || cimListing.referenceCode,
      referenceCodeNormalized: mcreListing.referenceCodeNormalized || cimListing.referenceCodeNormalized,
    },
  });

  // Delete the CIM listing (now that its source points to MCRE listing)
  console.log('Deleting duplicate CIM listing...');
  await prisma.listing.delete({
    where: { id: cimListing.id },
  });

  console.log('✅ Successfully merged Villa Antoinette listings!');
  console.log(`   Kept listing: ${mcreListing.id}`);
  console.log(`   Merged CIM source into MCRE listing`);

  await prisma.$disconnect();
}

mergeVillaAntoinette().catch(console.error);

