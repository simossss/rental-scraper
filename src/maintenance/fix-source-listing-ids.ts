// src/maintenance/fix-source-listing-ids.ts
import { prisma } from "../db/client";

async function fixSourceListingIds() {
  console.log("Fixing sourceListingIds to use URL IDs instead of RIF codes...");

  // Get all CIM listing sources
  const sources = await prisma.listingSource.findMany({
    where: { sourceWebsite: { code: "CIM" } },
    select: {
      id: true,
      sourceListingId: true,
      url: true,
    },
  });

  console.log(`Found ${sources.length} CIM listing sources`);

  let updated = 0;
  let errors = 0;

  for (const source of sources) {
    // Extract numeric URL ID from URL
    const urlMatch = source.url.match(/\/property\/(\d+)/);
    if (urlMatch) {
      const urlId = urlMatch[1];
      
      // Only update if sourceListingId is not already the URL ID
      if (source.sourceListingId !== urlId) {
        try {
          // Get the actual CIM source website ID
          const cimSource = await prisma.sourceWebsite.findUnique({
            where: { code: "CIM" },
          });
          
          if (!cimSource) {
            throw new Error("CIM source website not found");
          }

          // Check if this URL ID already exists for another source
          const existing = await prisma.listingSource.findUnique({
            where: {
              sourceWebsiteId_sourceListingId: {
                sourceWebsiteId: cimSource.id,
                sourceListingId: urlId,
              },
            },
          });

          if (existing && existing.id !== source.id) {
            console.log(
              `⚠️  URL ID ${urlId} already exists for source ${existing.id}, skipping ${source.id}`
            );
            errors++;
            continue;
          }

          await prisma.listingSource.update({
            where: { id: source.id },
            data: { sourceListingId: urlId },
          });

          updated++;
        } catch (err: any) {
          // Handle unique constraint violation
          if (err.code === "P2002") {
            console.log(
              `⚠️  Unique constraint violation for URL ID ${urlId} on source ${source.id}`
            );
            errors++;
          } else {
            console.error(`Error updating source ${source.id}:`, err.message);
            errors++;
          }
        }
      }
    } else {
      console.log(`⚠️  Could not extract URL ID from: ${source.url}`);
      errors++;
    }
  }

  console.log(`\n✅ Fix complete!`);
  console.log(`Updated: ${updated}`);
  console.log(`Errors/Skipped: ${errors}`);
}

async function run() {
  try {
    await fixSourceListingIds();
  } catch (err: any) {
    console.error("Fatal error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();

