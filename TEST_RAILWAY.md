# Testing on Railway

This guide shows you how to test the scraper and seed the database on Railway from your local machine.

## Prerequisites

1. Get your Railway app URL (e.g., `https://your-app.up.railway.app`)
2. Get your `SCRAPE_AUTH_TOKEN` (if you set one in Railway environment variables)

## Step 1: Seed the Database

First, you need to seed the database with the source website information (CIM and MCRE).

### Option A: Using the API endpoint (Recommended)

```bash
# Set your Railway URL and auth token
export RAILWAY_URL="https://your-app.up.railway.app"
export SCRAPE_AUTH_TOKEN="your-token-here"  # Optional, only if you set it

# Run the seed script
./test-railway-seed.sh $RAILWAY_URL $SCRAPE_AUTH_TOKEN
```

Or manually with curl:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-auth-token: your-token-here" \
  https://your-app.up.railway.app/seed
```

### Option B: Using Railway CLI

If you have Railway CLI installed and connected:

```bash
railway run npm run seed:websites
```

## Step 2: Test the Scraper

Once the database is seeded, you can trigger the scraper:

```bash
# Set your Railway URL and auth token
export RAILWAY_URL="https://your-app.up.railway.app"
export SCRAPE_AUTH_TOKEN="your-token-here"  # Optional, only if you set it

# Run the scrape test script
./test-railway-scrape.sh $RAILWAY_URL $SCRAPE_AUTH_TOKEN
```

Or manually with curl:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-auth-token: your-token-here" \
  https://your-app.up.railway.app/scrape
```

## Step 3: Monitor Progress

Watch the Railway logs to see the scraping progress:

```bash
railway logs --service your-service-name
```

Or view logs in the Railway dashboard.

## Expected Output

### Seed Endpoint Response:
```json
{
  "message": "Database seeded successfully"
}
```

### Scrape Endpoint Response:
```json
{
  "message": "Scrape started",
  "status": "running"
}
```

The scraper will:
1. Scrape CIM website first
2. Then scrape MCRE website
3. Match duplicate listings across websites by reference code, price, and size
4. Send Telegram notifications for new listings with score > 50

## Troubleshooting

### 401 Unauthorized
- Make sure you're sending the correct `x-auth-token` header
- Or remove `SCRAPE_AUTH_TOKEN` from Railway environment variables if you don't want auth

### 500 Internal Server Error
- Check Railway logs for detailed error messages
- Make sure the database is properly connected
- Verify that migrations have been applied

### No listings found
- Check if the seed script ran successfully
- Verify that `SourceWebsite` records exist in the database
- Check Railway logs for scraping errors

## Quick Test Commands

```bash
# 1. Seed database
./test-railway-seed.sh https://your-app.up.railway.app your-token

# 2. Trigger scrape
./test-railway-scrape.sh https://your-app.up.railway.app your-token

# 3. Check logs
railway logs --service your-service-name --tail
```

