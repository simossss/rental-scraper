// src/maintenance/backfill-scores.ts
import { prisma } from "../db/client";
import { scoreListing } from "../scoring/monacoScoring";

async function backfillScores() {
  console.log("Starting score backfill for all listings...");

  // Get all listings (rentals only, as that's what we score)
  const listings = await prisma.listing.findMany({
    where: {
      contractType: "RENT",
    },
  });

  console.log(`Found ${listings.length} rental listings to score`);

  let updated = 0;
  let errors = 0;

  for (const listing of listings) {
    try {
      const computedScore = scoreListing(listing);
      
      await prisma.listing.update({
        where: { id: listing.id },
        data: { score: computedScore },
      });

      updated++;
      
      if (updated % 10 === 0) {
        console.log(`Progress: ${updated}/${listings.length} listings scored...`);
      }
    } catch (err: any) {
      errors++;
      console.error(
        `Error scoring listing ${listing.id} (${listing.title}):`,
        err?.message || err
      );
    }
  }

  console.log("\n=== Backfill Complete ===");
  console.log(`Total listings: ${listings.length}`);
  console.log(`Successfully scored: ${updated}`);
  console.log(`Errors: ${errors}`);

  // Show score distribution
  const scoreStats = await prisma.listing.groupBy({
    by: ["score"],
    where: {
      contractType: "RENT",
      score: { not: null },
    },
    _count: true,
  });

  console.log("\n=== Score Distribution ===");
  const sortedStats = scoreStats
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
    .slice(0, 20); // Show top 20 score buckets
  
  for (const stat of sortedStats) {
    console.log(`Score ${stat.score}: ${stat._count} listings`);
  }
}

async function run() {
  try {
    await backfillScores();
  } catch (err: any) {
    console.error("Fatal error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();

