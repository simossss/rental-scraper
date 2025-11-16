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
  const priceText = price > 0 ? `€${price.toLocaleString()}/mois` : 'Prix sur demande';
  const roomsText = listing.rooms ? `${listing.rooms} pièce${listing.rooms > 1 ? 's' : ''}` : '? pièces';
  const location = [listing.buildingName, listing.district].filter(Boolean).join(', ') || 'Monaco';
  
  const message = `
🏠 <b>Nouvelle annonce</b>

<b>${listing.title}</b>

📍 ${location}
🏘️ ${roomsText}
💰 ${priceText}
⭐ Score: <b>${listing.score ?? 'N/A'}</b>

<a href="${listing.url}">Voir l'annonce</a>
  `.trim();

  return sendTelegramMessage(message);
}

