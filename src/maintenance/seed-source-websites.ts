/**
 * Seed the SourceWebsite table with CIM website info
 * This needs to be run once before scraping can work
 */

import { prisma } from '../db/client';

async function seedSourceWebsites() {
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

  console.log('✅ SourceWebsite seeded:', cimWebsite);
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

