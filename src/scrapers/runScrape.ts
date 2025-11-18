/**
 * Scraper function that can be called from API endpoint
 * (doesn't exit process, unlike cim-full-v2-cron.ts)
 * Scrapes both CIM and MCRE websites
 */

import { collectAllListingUrls, scrapeSingleListing } from './cim-full-v2';
import { collectAllMcreListingUrls, scrapeSingleMcreListing } from './mcre-full';
import { initTelegram, sendNewListingNotification, sendErrorNotification } from '../notifications/telegram';
import { prisma } from '../db/client';

// Initialize Telegram if credentials are provided
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const telegramChatId = process.env.TELEGRAM_CHAT_ID;

if (telegramBotToken && telegramChatId) {
  initTelegram(telegramBotToken, telegramChatId);
}

async function scrapeWebsite(
  name: string,
  collectUrls: () => Promise<string[]>,
  scrapeSingle: (url: string) => Promise<any>
): Promise<{ processed: number; newListings: number; errors: number }> {
  let processed = 0;
  let newListings = 0;
  let errors = 0;

  console.log(`\n=== Starting ${name} scrape ===`);
  const urls = await collectUrls();
  console.log(`Found ${urls.length} listing URLs to process`);

  for (const url of urls) {
    processed++;
    console.log(`[${name} ${processed}/${urls.length}] Processing listing: ${url}`);
    
    try {
      const result = await scrapeSingle(url);
      if (result.createdNewListing) {
        newListings++;
        console.log(`✅ New listing created: ${result.listingId}, score: ${result.score}`);
        
        // Send notification only if score > 50 AND price > 0 (exclude "Price on request")
        if (result.score !== null && result.score > 50 && result.priceMonthlyCents > 0 && telegramBotToken && telegramChatId) {
          // Fetch full listing details for notification
          const listing = await prisma.listing.findUnique({
            where: { id: result.listingId },
            select: {
              title: true,
              score: true,
              priceMonthlyCents: true,
              rooms: true,
              district: true,
              buildingName: true,
              primaryUrl: true,
            },
          });
          
          if (listing && listing.primaryUrl) {
            await sendNewListingNotification({
              title: listing.title,
              score: listing.score,
              priceMonthlyCents: listing.priceMonthlyCents,
              rooms: listing.rooms,
              district: listing.district,
              buildingName: listing.buildingName,
              url: listing.primaryUrl,
            });
          }
        }
      } else {
        console.log(`ℹ️  Listing already exists: ${result.listingId} (updated)`);
      }
    } catch (err: any) {
      errors++;
      console.error(`❌ Error processing ${url}:`, err?.message || err);
      // Log full error for debugging
      if (err?.stack) {
        console.error('Error stack:', err.stack);
      }
    }

    // Small delay to be polite to the server
    if (processed < urls.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`\n✅ ${name} scrape complete! Processed: ${processed}, New: ${newListings}, Errors: ${errors}`);
  return { processed, newListings, errors };
}

export async function runScrape(): Promise<{ processed: number; newListings: number; errors: number }> {
  let totalProcessed = 0;
  let totalNewListings = 0;
  let totalErrors = 0;

  try {
    // Scrape CIM
    const cimResult = await scrapeWebsite(
      'CIM',
      collectAllListingUrls,
      scrapeSingleListing
    );
    totalProcessed += cimResult.processed;
    totalNewListings += cimResult.newListings;
    totalErrors += cimResult.errors;

    // Scrape MCRE
    const mcreResult = await scrapeWebsite(
      'MCRE',
      collectAllMcreListingUrls,
      scrapeSingleMcreListing
    );
    totalProcessed += mcreResult.processed;
    totalNewListings += mcreResult.newListings;
    totalErrors += mcreResult.errors;

    console.log(`\n=== Overall Scrape Summary ===`);
    console.log(`Total Processed: ${totalProcessed}`);
    console.log(`Total New Listings: ${totalNewListings}`);
    console.log(`Total Errors: ${totalErrors}`);

    return { processed: totalProcessed, newListings: totalNewListings, errors: totalErrors };
  } catch (error: any) {
    console.error('Fatal error during scrape:', error);
    
    // Send error notification
    if (telegramBotToken && telegramChatId) {
      await sendErrorNotification(`Fatal error: ${error.message || error}`);
    }

    throw error;
  } finally {
    // Don't disconnect Prisma - we're running in the same process as the API
    // await prisma.$disconnect();
  }
}

