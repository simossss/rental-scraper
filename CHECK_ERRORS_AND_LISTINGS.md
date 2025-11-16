# Checking Errors and Understanding "New Listings"

## Where to See Errors

### Option 1: Railway Logs (Best)

1. Go to Railway dashboard
2. Click on your **backend service** (the one running the API)
3. Go to **"Deployments"** tab
4. Click on the **latest deployment**
5. Click **"View Logs"** or **"HTTP Logs"**
6. Look for error messages like:
   - `❌ Error processing https://...`
   - The error message will show what went wrong

### Option 2: Railway CLI

```bash
railway logs --service your-backend-service-name
```

### Option 3: Check Database

The errors are logged but not stored. You can check:
- Railway database UI → Check if listings exist
- If listings exist but "new listings: 0", they were found as existing

## Why "New Listings: 0" on First Run?

This is strange if it's truly the first run. Possible reasons:

### 1. Listings Already Exist

The deduplication logic finds existing listings by:
- `sourceListingId` (URL ID) - most reliable
- `referenceCodeNormalized` (RIF code)
- `fingerprint` (characteristics match)

If any of these match, it updates the existing listing instead of creating new.

**Check if listings exist:**
```sql
SELECT COUNT(*) FROM "Listing";
SELECT COUNT(*) FROM "ListingSource";
```

### 2. The Scraper Ran Before

If you ran the scraper multiple times (even with errors), some listings might have been created in previous attempts.

### 3. Deduplication Logic Issue

The logic might be incorrectly matching listings. Check Railway logs for:
- "UPSERT RESULT: listingId=..., createdNew=false"
- This means it found an existing listing

## How to Verify

### Check Database Counts

1. Go to Railway → PostgreSQL → Database → Data
2. Click on `Listing` table
3. Count how many rows exist
4. Click on `ListingSource` table  
5. Count how many rows exist

If you see ~276 listings, they were created but marked as "existing" (maybe from a previous partial run).

### Check Logs for Details

In Railway logs, look for:
- `✅ New listing created: listingId=...` (should appear 276 times if all are new)
- `UPSERT RESULT: ... createdNew=true` (new listings)
- `UPSERT RESULT: ... createdNew=false` (existing listings)

## Understanding the Logic

The scraper considers a listing "new" only if:
- No existing `ListingSource` with the same `sourceListingId` (URL ID) exists
- AND no existing `Listing` with matching `referenceCodeNormalized` (RIF) exists
- AND no existing `Listing` with matching `fingerprint` exists

If any match is found, it updates the existing listing and `createdNewListing = false`.

## Next Steps

1. **Check Railway logs** to see the actual error message
2. **Check database** to see if listings were actually created
3. **Run scraper again** - if listings exist, it should show 0 new (which is correct)
4. **If you want to force "new" listings**, you'd need to clear the database first

