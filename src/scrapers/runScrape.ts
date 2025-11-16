/**
 * Scraper function that can be called from API endpoint
 * (doesn't exit process, unlike cim-full-v2-cron.ts)
 */

import { collectAllListingUrls, scrapeSingleListing } from './cim-full-v2';
import { initTelegram, sendScrapeSummary, sendErrorNotification } from '../notifications/telegram';
import { prisma } from '../db/client';

// Initialize Telegram if credentials are provided
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const telegramChatId = process.env.TELEGRAM_CHAT_ID;

if (telegramBotToken && telegramChatId) {
  initTelegram(telegramBotToken, telegramChatId);
}

export async function runScrape(): Promise<{ processed: number; newListings: number; errors: number }> {
  let processed = 0;
  let newListings = 0;
  let errors = 0;

  try {
    console.log('Starting CIM scrape...');
    const urls = await collectAllListingUrls();
    console.log(`Found ${urls.length} listing URLs to process`);

    for (const url of urls) {
      processed++;
      console.log(`[${processed}/${urls.length}] Processing listing: ${url}`);
      
      try {
        const result = await scrapeSingleListing(url);
        if (result.createdNewListing) {
          newListings++;
          console.log(`✅ New listing created: ${result.listingId}`);
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

    console.log(`\n✅ Scrape complete! Processed: ${processed}, New: ${newListings}, Errors: ${errors}`);

    // Send summary notification
    if (telegramBotToken && telegramChatId) {
      await sendScrapeSummary(processed, newListings, errors);
    }

    return { processed, newListings, errors };
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

