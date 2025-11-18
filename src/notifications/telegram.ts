import axios from 'axios';

interface TelegramConfig {
  botToken: string;
  chatId: string;
}

let config: TelegramConfig | null = null;

export function initTelegram(botToken: string, chatId: string) {
  config = { botToken, chatId };
}

export async function sendTelegramMessage(message: string): Promise<boolean> {
  if (!config) {
    console.warn('Telegram not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID');
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
    const response = await axios.post(url, {
      chat_id: config.chatId,
      text: message,
      parse_mode: 'HTML',
    });

    return response.status === 200;
  } catch (error: any) {
    console.error('Failed to send Telegram message:', error.message);
    return false;
  }
}

export async function sendScrapeSummary(
  processed: number,
  newListings: number,
  errors: number = 0
): Promise<boolean> {
  const emoji = newListings > 0 ? '🎉' : '✅';
  const message = `
${emoji} <b>Scrape Complete</b>

📊 <b>Summary:</b>
• Processed: ${processed} listings
• New listings: ${newListings}
${errors > 0 ? `• Errors: ${errors}` : ''}

${newListings > 0 ? `\n🆕 Found ${newListings} new listing${newListings > 1 ? 's' : ''}!` : '\nNo new listings found.'}
  `.trim();

  return sendTelegramMessage(message);
}

export async function sendErrorNotification(error: string): Promise<boolean> {
  const message = `
❌ <b>Scrape Error</b>

${error}
  `.trim();

  return sendTelegramMessage(message);
}

export async function sendNewListingNotification(
  listing: {
    title: string;
    score: number | null;
    priceMonthlyCents: number;
    rooms: number | null;
    district: string | null;
    buildingName: string | null;
    url: string;
  }
): Promise<boolean> {
  const price = listing.priceMonthlyCents / 100;
  const priceText = price > 0 ? `€${price.toLocaleString()}/month` : 'Price on request';
  const roomsText = listing.rooms ? `${listing.rooms} room${listing.rooms > 1 ? 's' : ''}` : '? rooms';
  const location = [listing.buildingName, listing.district].filter(Boolean).join(', ') || 'Monaco';
  
  const message = `
🏠 <b>New Listing</b>

<b>${listing.title}</b>

📍 ${location}
🏘️ ${roomsText}
💰 ${priceText}
⭐ Score: <b>${listing.score ?? 'N/A'}</b>

<a href="${listing.url}">View listing</a>
  `.trim();

  return sendTelegramMessage(message);
}

export async function sendDailySummary(
  summary: {
    total: number;
    byRooms: Array<{ rooms: number | null; count: number }>;
    date: string;
  }
): Promise<boolean> {
  const { total, byRooms, date } = summary;
  
  if (total === 0) {
    const message = `
📅 <b>Daily Summary</b>

📆 ${date}

No new listings today.
    `.trim();
    return sendTelegramMessage(message);
  }
  
  // Format room groups nicely
  const roomGroups: string[] = [];
  for (const group of byRooms) {
    if (group.rooms === null) {
      roomGroups.push(`   • Not specified: <b>${group.count}</b>`);
    } else if (group.rooms >= 5) {
      roomGroups.push(`   • 5+ rooms: <b>${group.count}</b>`);
    } else {
      roomGroups.push(`   • ${group.rooms} room${group.rooms > 1 ? 's' : ''}: <b>${group.count}</b>`);
    }
  }
  
  const message = `
📅 <b>Daily Summary</b>

📆 ${date}

📊 <b>Total new listings: ${total}</b>

${roomGroups.join('\n')}
  `.trim();

  return sendTelegramMessage(message);
}

