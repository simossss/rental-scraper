# Verify Database Tables

## The Issue

Your service is running, but Railway's database UI shows "no tables". This could mean:
1. Tables exist but Railway UI isn't showing them (common issue)
2. Migrations didn't actually create tables (less likely)

## Verify Tables Exist

### Option 1: Use Railway's Database Query Tool

1. Go to your PostgreSQL service in Railway
2. Click on "Database" tab
3. Look for a "Query" or "SQL" button/editor
4. Run this SQL query:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

This will show all tables in the `public` schema.

### Option 2: Check Migration Status

The logs show "No pending migrations to apply" which means Prisma thinks migrations are applied. But let's verify:

1. In Railway, go to your backend service
2. Click "Deployments" → latest deployment
3. Click "View Logs" or use Railway CLI:

```bash
railway run npx prisma migrate status
```

### Option 3: Check _prisma_migrations Table

The `_prisma_migrations` table tracks which migrations have been applied:

```sql
SELECT * FROM _prisma_migrations;
```

If this table exists and has 3 rows, migrations ran successfully.

## Expected Tables

After migrations, you should have these tables:
- `SourceWebsite`
- `Listing`
- `ListingSource`
- `ScrapeRun`
- `_prisma_migrations` (Prisma's internal tracking table)

## If Tables Don't Exist

If the SQL query returns no tables, migrations didn't actually run. Try:

1. **Force re-run migrations:**
   ```bash
   railway run npx prisma migrate deploy
   ```

2. **Or reset and re-migrate** (⚠️ This deletes all data):
   ```bash
   railway run npx prisma migrate reset
   ```

## Railway UI Issue

Railway's database UI sometimes doesn't show tables immediately or shows them in a different view. The SQL query is the most reliable way to verify.

