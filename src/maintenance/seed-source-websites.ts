/**
 * Seed the SourceWebsite table with CIM and MCRE website info
 * This needs to be run once before scraping can work
 */

import { prisma } from '../db/client';

export async function seedSourceWebsites() {
  console.log('Seeding SourceWebsite table...');

  const cimWebsite = await prisma.sourceWebsite.upsert({
    where: { code: 'CIM' },
    update: {
      name: 'Chambre Immobilière de Monaco',
      baseUrl: 'https://www.chambre-immobiliere-monaco.mc',
    },
    create: {
      code: 'CIM',
      name: 'Chambre Immobilière de Monaco',
      baseUrl: 'https://www.chambre-immobiliere-monaco.mc',
    },
  });

  console.log('✅ CIM SourceWebsite seeded:', cimWebsite);

  const mcreWebsite = await prisma.sourceWebsite.upsert({
    where: { code: 'MCRE' },
    update: {
      name: 'Monte Carlo Real Estate',
      baseUrl: 'https://www.montecarlo-realestate.com',
    },
    create: {
      code: 'MCRE',
      name: 'Monte Carlo Real Estate',
      baseUrl: 'https://www.montecarlo-realestate.com',
    },
  });

  console.log('✅ MCRE SourceWebsite seeded:', mcreWebsite);
}

async function run() {
  try {
    await seedSourceWebsites();
    console.log('✅ Seeding complete!');
  } catch (err) {
    console.error('❌ Error seeding:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();

