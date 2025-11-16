# Railway Database Empty - Troubleshooting

If your Railway PostgreSQL database shows "no tables", here's how to fix it:

## Option 1: Check if migrations actually ran

The startup script should run migrations automatically, but sometimes they don't apply. Check Railway logs to see if migrations ran successfully.

## Option 2: Run migrations manually via Railway CLI

1. Install Railway CLI:
   ```bash
   npm i -g @railway/cli
   ```

2. Login:
   ```bash
   railway login
   ```

3. Link to your project:
   ```bash
   railway link
   ```

4. Run migrations:
   ```bash
   railway run npx prisma migrate deploy
   ```

## Option 3: Run migrations via Railway Console

1. Go to your backend service in Railway
2. Click on "Deployments" tab
3. Click on the latest deployment
4. Click "View Logs" or open a console
5. Run:
   ```bash
   npx prisma migrate deploy
   ```

## Option 4: Check if tables are in a different schema

Railway's database UI might be looking at the wrong schema. Prisma uses the `public` schema by default.

1. In Railway database UI, check if there's a schema selector
2. Make sure you're viewing the `public` schema

## Option 5: Force re-run migrations

If migrations say "no pending migrations" but tables don't exist:

1. Connect to your database via Railway's database UI or CLI
2. Check if `_prisma_migrations` table exists:
   ```sql
   SELECT * FROM _prisma_migrations;
   ```
3. If it exists but is empty, you can reset:
   ```sql
   DROP TABLE IF EXISTS "_prisma_migrations" CASCADE;
   ```
4. Then re-run migrations:
   ```bash
   railway run npx prisma migrate deploy
   ```

## Option 6: Check Railway logs

Look at your backend service logs to see if there were any migration errors that weren't obvious.

## Quick Fix: Reset and re-migrate

If nothing else works:

1. In Railway database UI, you can reset the database (⚠️ This deletes all data)
2. Or manually drop all tables
3. Then trigger a new deployment which will run migrations fresh

