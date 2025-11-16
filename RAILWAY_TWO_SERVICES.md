# Railway: Two Services Needed

## The Problem

You currently have **one service configured as a Cron Job**. This won't work because:
- Cron jobs only run on schedule, then stop
- They don't run continuously
- The API server needs to run 24/7
- Migrations need to run when the service starts

## The Solution: Create TWO Services

### Service 1: Web Service (API Server) - RUNS CONTINUOUSLY

1. In Railway, click "+ New" → "GitHub Repo"
2. Select your `rental-scraper` repository
3. Railway will auto-detect it
4. **IMPORTANT**: Make sure it's created as a **Web Service** (not a cron job)
5. This service will:
   - Run continuously
   - Run migrations on startup (creates tables)
   - Serve the API at `rental-scraper-production.up.railway.app`

**Configuration for Web Service:**
- Start Command: `./start.sh`
- Restart Policy: "ON_FAILURE" (not "never")
- No cron schedule (it runs continuously)

### Service 2: Cron Job (Scraper) - RUNS PERIODICALLY

1. In Railway, click "+ New" → "Cron Job"
2. Configure:
   - **Schedule**: `0 * * * *` (every hour)
   - **Command**: `npm run scrape`
   - **Service**: Select your **Web Service** (the one above)
   - This will use the same codebase but run the scraper

**Configuration for Cron Job:**
- Schedule: `0 * * * *` (or your preferred schedule)
- Command: `npm run scrape`
- Restart Policy: "never" (it's a cron job)

## Current Setup Issue

Your current service is configured as:
- **Cron schedule**: `0 * * * 1-5` ❌ (This makes it a cron job, not a web service)
- **Restart policy**: "never" ❌ (Web services should restart on failure)

## How to Fix

### Option A: Convert Current Service to Web Service

1. Go to your current service settings
2. Remove the cron schedule (set it to empty/none)
3. Change restart policy to "ON_FAILURE"
4. Make sure start command is `./start.sh`
5. Redeploy

### Option B: Create New Web Service (Recommended)

1. Keep your current service as the cron job (for scraping)
2. Create a NEW service for the API:
   - "+ New" → "GitHub Repo"
   - Select same repository
   - Make sure it's a **Web Service** (no cron schedule)
   - Set start command: `./start.sh`
   - Connect to the same PostgreSQL database

## Verify

After creating the Web Service:
1. Check deploy logs - should see migrations running
2. Check database - tables should be created
3. Visit the API URL - should respond to `/health` endpoint
4. The service should show as "Active" and stay running

