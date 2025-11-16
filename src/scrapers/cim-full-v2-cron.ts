/**
 * Cron job entry point for scraping CIM listings
 * This script runs the scraper and sends Telegram notifications
 */

import { collectAllListingUrls, scrapeSingleListing } from './cim-full-v2';
import { initTelegram, sendScrapeSummary, sendErrorNotification } from '../notifications/telegram';
import { prisma } from '../db/client';

// Initialize Telegram if credentials are provided
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const telegramChatId = process.env.TELEGRAM_CHAT_ID;

if (telegramBotToken && telegramChatId) {
  initTelegram(telegramBotToken, telegramChatId);
  console.log('Telegram notifications enabled');
} else {
  console.log('Telegram notifications disabled (missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID)');
}

async function runScrape() {
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
        }
      } catch (err: any) {
        errors++;
        console.error(`❌ Error processing ${url}:`, err?.message || err);
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

    process.exit(0);
  } catch (error: any) {
    console.error('Fatal error during scrape:', error);
    
    // Send error notification
    if (telegramBotToken && telegramChatId) {
      await sendErrorNotification(`Fatal error: ${error.message || error}`);
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the scrape
runScrape();

