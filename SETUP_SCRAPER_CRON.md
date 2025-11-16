# Setup Scraper Cron Job on Railway

## Current Status

✅ Your API service is running successfully
❌ No scraping is happening yet (need to set up cron job)

## Create Cron Job for Scraper

### Step 1: Create New Cron Job Service

1. In Railway dashboard, click "+ New"
2. Select "Cron Job" (NOT "GitHub Repo")
3. Configure:
   - **Schedule**: `0 * * * *` (every hour at minute 0)
     - Or `0 */6 * * *` for every 6 hours
     - Or `0 9,15,21 * * *` for 9 AM, 3 PM, 9 PM daily
   - **Command**: `npm run scrape`
   - **Service**: Select your **backend service** (the one running the API)
   - This will use the same codebase and environment variables

### Step 2: Set Environment Variables

Make sure the cron job has access to:
- `DATABASE_URL` (should be auto-injected from PostgreSQL)
- `TELEGRAM_BOT_TOKEN` (if you want notifications)
- `TELEGRAM_CHAT_ID` (if you want notifications)

The cron job will inherit variables from the service it's attached to.

### Step 3: Test the Cron Job

1. After creating the cron job, you can manually trigger it:
   - Go to the cron job service
   - Click "Run Now" or similar button
   - Check logs to see if it runs successfully

2. Or wait for the scheduled time and check logs

### Step 4: Verify Scraping Works

After the cron job runs, check:
1. **Database**: Should have listings in the `Listing` table
2. **Telegram**: Should receive notification (if configured)
3. **Logs**: Should show scrape progress and results

## Manual Test (Optional)

You can test the scraper manually without waiting for cron:

1. Go to your backend service
2. Use Railway CLI:
   ```bash
   railway run npm run scrape
   ```

Or create a temporary endpoint in your API to trigger scraping (for testing only).

## Troubleshooting

### Cron Job Not Running

- Check cron job logs
- Verify schedule syntax is correct
- Make sure the service it's attached to is running

### Scraper Errors

- Check that `DATABASE_URL` is available
- Verify database tables exist (migrations ran)
- Check network connectivity to CIM website

### No Data After Scraping

- Check scraper logs for errors
- Verify the scraper can access the CIM website
- Check if listings are being created but filtered out

