# Railway Service Setup - Important!

## Two Separate Things:

1. **Backend Service** (API Server)
   - This should be running continuously
   - On startup, it runs migrations to create database tables
   - Then it starts the Express API server
   - **This is what creates the tables in your database**

2. **Cron Job** (Scraper)
   - This runs periodically (hourly, etc.)
   - It only scrapes data and populates existing tables
   - **This does NOT create tables**

## If Your Database is Empty:

The tables should be created when your **backend service** starts, not when the cron job runs.

### Check Your Backend Service:

1. Go to Railway dashboard
2. Find your **backend service** (the one running the API)
3. Check if it's running:
   - Status should be "Active" or "Running"
   - If it's stopped or crashed, that's why migrations didn't run

### Verify Service is Running:

1. Click on your backend service
2. Go to "Deployments" tab
3. Check the latest deployment:
   - Should show "Active" status
   - Click "View Logs" to see startup logs
   - Look for:
     - "✓ DATABASE_URL is set"
     - "Running database migrations..."
     - "✓ Migrations completed"
     - "Starting server..."
     - "API server listening on port XXXX"

### If Service Isn't Running:

1. **Check for errors in logs**
2. **Manually trigger a redeploy:**
   - Go to your backend service
   - Click "Deployments"
   - Click "Redeploy" on the latest deployment
   - Or push a new commit to trigger auto-deploy

3. **Check service configuration:**
   - Make sure the service is set to run the `start` command
   - In Railway service settings, verify:
     - Start Command: `npm run start:with-migrations` (or `./start.sh`)

### Manual Migration (If Needed):

If the service won't start, you can run migrations manually:

1. Install Railway CLI:
   ```bash
   npm i -g @railway/cli
   ```

2. Login and link:
   ```bash
   railway login
   railway link
   ```

3. Run migrations:
   ```bash
   railway run npx prisma migrate deploy
   ```

4. Then start the service normally

## Summary:

- **Backend Service** = Creates tables (via migrations on startup)
- **Cron Job** = Only scrapes data (requires tables to already exist)

If your database is empty, the backend service likely didn't start properly or migrations failed silently.

