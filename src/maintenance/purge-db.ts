// src/maintenance/purge-db.ts
import { prisma } from "../db/client";

async function purgeDatabase() {
  console.log("Starting database purge...");
  console.log("⚠️  WARNING: This will delete ALL listings and listing sources!");
  
  // Count before deletion
  const listingCount = await prisma.listing.count();
  const sourceCount = await prisma.listingSource.count();
  
  console.log(`\nCurrent counts:`);
  console.log(`  Listings: ${listingCount}`);
  console.log(`  Listing Sources: ${sourceCount}`);
  
  if (listingCount === 0 && sourceCount === 0) {
    console.log("\nDatabase is already empty. Nothing to purge.");
    await prisma.$disconnect();
    return;
  }
  
  // Delete in correct order (sources first due to foreign key)
  console.log("\nDeleting listing sources...");
  const deletedSources = await prisma.listingSource.deleteMany({});
  console.log(`  Deleted ${deletedSources.count} listing sources`);
  
  console.log("Deleting listings...");
  const deletedListings = await prisma.listing.deleteMany({});
  console.log(`  Deleted ${deletedListings.count} listings`);
  
  // Verify
  const remainingListings = await prisma.listing.count();
  const remainingSources = await prisma.listingSource.count();
  
  console.log("\n✅ Purge complete!");
  console.log(`\nRemaining counts:`);
  console.log(`  Listings: ${remainingListings}`);
  console.log(`  Listing Sources: ${remainingSources}`);
  
  if (remainingListings > 0 || remainingSources > 0) {
    console.log("\n⚠️  Warning: Some records remain. Check for foreign key constraints.");
  }
}

async function run() {
  try {
    await purgeDatabase();
  } catch (err: any) {
    console.error("Fatal error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();

