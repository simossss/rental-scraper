# Setting Up Scraper Service - Workaround for railway.json

Since Railway uses `railway.json` to lock the start command, here's how to set up a separate scraper service:

## Solution: Create Service Without railway.json

### Step 1: Create New Service

1. In Railway, click **"+ New"** → **"GitHub Repo"**
2. Select your `rental-scraper` repository
3. Railway will create a new service

### Step 2: Temporarily Rename railway.json

Since Railway reads `railway.json` from the repo, we need to work around it:

**Option A: Use a different config file (if Railway supports it)**
- Check if Railway has an option to specify a different config file
- Or temporarily rename `railway.json` to `railway-api.json`

**Option B: Override in Service Settings**
- Some Railway services allow overriding the start command in UI
- Check Settings → Deploy → see if there's an "Override" option

**Option C: Use External Cron (Easiest)**

Since the start command is locked, use an external cron service instead:

1. **Go to [cron-job.org](https://cron-job.org)** (free)
2. Create account
3. Add new cron job:
   - **Title**: Monaco Rental Scraper
   - **URL**: `https://rental-scraper-production.up.railway.app/scrape`
   - **Method**: POST
   - **Schedule**: Every hour (`0 * * * *`)
   - **Headers** (optional for security):
     - Key: `X-Auth-Token`
     - Value: (set a secret token, then add `SCRAPE_AUTH_TOKEN` in Railway)

4. **Set auth token in Railway:**
   - Go to your backend service → Variables
   - Add: `SCRAPE_AUTH_TOKEN` = `your-secret-token-here`
   - Use the same token in cron-job.org headers

5. **Test:**
   - Click "Run Now" in cron-job.org
   - Check Railway logs to see scraping progress

## Recommended: External Cron Service

This is the **easiest solution** since:
- ✅ No need to create separate service
- ✅ No railway.json conflicts
- ✅ Works immediately
- ✅ Free and reliable
- ✅ Easy to adjust schedule

The `/scrape` endpoint I added will trigger the scraper when called.

## Alternative: Manual Trigger

For now, you can manually trigger scraping:

1. Go to your backend service
2. Click "Deployments"
3. Click "Redeploy" (this will restart and run migrations, but won't scrape)

Or use Railway CLI:
```bash
railway run npm run scrape
```

But for automatic hourly scraping, external cron service is best.

