# Reset Database and Re-scrape

## Quick Commands

### Option 1: Using the script (recommended)

```bash
# Set your database URL
export DATABASE_URL='postgresql://postgres:YxpUfTQQckgGelrGWEYgOzJnBJYtNWWa@trolley.proxy.rlwy.net:16640/railway'

# Run the reset script
./reset-and-scrape.sh

# Or with Railway URL and auth token to auto-trigger scrape:
./reset-and-scrape.sh https://YOUR_RAILWAY_URL.up.railway.app YOUR_AUTH_TOKEN
```

### Option 2: Manual commands

```bash
# 1. Set database URL
export DATABASE_URL='postgresql://postgres:YxpUfTQQckgGelrGWEYgOzJnBJYtNWWa@trolley.proxy.rlwy.net:16640/railway'

# 2. Reset database (drops all data, recreates schema)
npm run prisma:reset

# 3. Seed SourceWebsite table
npm run seed:websites

# 4. Trigger scrape on Railway (replace with your values)
curl -X POST https://YOUR_RAILWAY_URL.up.railway.app/scrape \
  -H "x-auth-token: YOUR_SCRAPE_AUTH_TOKEN"
```

## What happens

1. **Database Reset**: Drops all tables and recreates the schema from migrations
2. **Seed**: Creates CIM and MCRE entries in the SourceWebsite table
3. **Scrape**: Imports all listings from both websites with improved deduplication

## After reset

- All existing listings will be deleted
- New scrape will import fresh data
- Improved deduplication logic will merge cross-website duplicates automatically
- You should see fewer duplicates in the results

## Verify results

After scraping, check for duplicates:
```bash
npm run find-duplicates
```

This should show significantly fewer duplicates than before.

