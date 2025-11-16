# Fix Empty Database Issue

## Problem

Migrations show "No pending migrations to apply" but tables don't exist in the database.

## Quick Fix

Run this command in Railway (via CLI or service console):

```bash
npx prisma migrate reset --force
```

This will:
1. Drop all tables
2. Re-run all migrations from scratch
3. Create all tables

⚠️ **Warning**: This deletes all data! But since your database is empty, this is safe.

## Alternative: Manual Fix

If you want to preserve the migration history:

1. **Check what's in _prisma_migrations:**
   ```sql
   SELECT * FROM "_prisma_migrations";
   ```

2. **If it has entries but tables don't exist, reset migration state:**
   ```bash
   npx prisma migrate resolve --rolled-back 20251115160557_init
   npx prisma migrate resolve --rolled-back 20251115161615_add_reference_normalized
   npx prisma migrate resolve --rolled-back 20251116134322_add_scoring_fields
   ```

3. **Then re-run migrations:**
   ```bash
   npx prisma migrate deploy
   ```

## Using Railway CLI

1. Install Railway CLI:
   ```bash
   npm i -g @railway/cli
   ```

2. Login and link:
   ```bash
   railway login
   railway link
   ```

3. Run the reset:
   ```bash
   railway run npx prisma migrate reset --force
   ```

## After Fix

After running the reset, you should see:
- All tables created in Railway's database UI
- `_prisma_migrations` table with 3 entries
- Tables: `SourceWebsite`, `Listing`, `ListingSource`, `ScrapeRun`

Then you can proceed with setting up the scraper cron job.

