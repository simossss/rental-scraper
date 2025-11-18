/**
 * Cron job entry point for scraping listings from both CIM and MCRE
 * This script uses the unified runScrape function that handles both websites
 */

import { runScrape } from './runScrape';
import { prisma } from '../db/client';

async function main() {
  console.log('🚀 Starting scraper cron job at', new Date().toISOString());
  
  try {
    const result = await runScrape();
    console.log('✅ Scrape cron job completed:', result);
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Fatal error in scrape cron job:', error);
    console.error('Error stack:', error?.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the scrape
main();

