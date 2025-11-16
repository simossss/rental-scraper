// src/maintenance/reset-parking-cellars.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  console.log("Resetting parkingSpaces and cellars to NULL for all listings...");
  const result = await prisma.listing.updateMany({
    data: {
      parkingSpaces: null,
      cellars: null,
    },
  });
  console.log(`Updated ${result.count} rows.`);
  await prisma.$disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
