# Populate Database with Listings

Now that your database is set up, you need to run the scraper to populate it with listings.

## Option 1: Set Up Cron Job (Recommended for Automatic Scraping)

### Step 1: Create Cron Job in Railway

1. Go to your Railway project dashboard
2. Click **"+ New"** → **"Cron Job"**
3. Configure:
   - **Schedule**: `0 * * * *` (every hour at minute 0)
     - Or `0 */6 * * *` for every 6 hours
     - Or `0 9,15,21 * * *` for 9 AM, 3 PM, 9 PM daily
   - **Command**: `npm run scrape`
   - **Service**: Select your **backend service** (the one running the API)
   - This will use the same codebase and environment variables

### Step 2: Verify Environment Variables

Make sure the cron job has access to:
- `DATABASE_URL` (should be auto-injected from PostgreSQL)
- `TELEGRAM_BOT_TOKEN` (if you want notifications)
- `TELEGRAM_CHAT_ID` (if you want notifications)

The cron job inherits variables from the service it's attached to.

### Step 3: Test the Cron Job

1. After creating, click **"Run Now"** to test immediately
2. Check the logs to see scraping progress
3. Check your database - listings should appear in the `Listing` table

## Option 2: Manual Run (For Testing)

### Using Railway CLI

1. Install Railway CLI (if not already):
   ```bash
   npm i -g @railway/cli
   ```

2. Login and link:
   ```bash
   railway login
   railway link
   ```

3. Run scraper manually:
   ```bash
   railway run npm run scrape
   ```

### Using Railway Dashboard

1. Go to your backend service
2. Click "Deployments" → latest deployment
3. Look for a "Run Command" or "Console" option
4. Run: `npm run scrape`

## What to Expect

When the scraper runs, you'll see:
- Progress logs: `[1/276] Processing listing: ...`
- New listings being created
- Summary: `Processed=276, new listings=X`
- Telegram notification (if configured)

## Verify Data

After scraping:

1. **Check Railway Database UI:**
   - Go to PostgreSQL service → "Database" → "Data"
   - Click on `Listing` table
   - You should see rows with listing data

2. **Check via API:**
   - Visit: `https://rental-scraper-production.up.railway.app/listings`
   - Should return JSON with listings

3. **Check Telegram:**
   - If configured, you'll receive a notification with summary

## Troubleshooting

### Scraper Not Running

- Check cron job logs for errors
- Verify `DATABASE_URL` is available
- Check network connectivity to CIM website

### No Listings Created

- Check scraper logs for errors
- Verify the scraper can access the CIM website
- Check if listings are being filtered out (e.g., price filters)

### Telegram Not Working

- Verify `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set
- Test bot manually: `https://api.telegram.org/bot<TOKEN>/getMe`

