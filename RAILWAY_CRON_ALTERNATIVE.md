# Setting Up Scraper as Scheduled Service in Railway

Since Railway doesn't have a direct "Cron Job" option, we'll create a worker service that runs on a schedule.

## Option 1: Create Worker Service from GitHub Repo (Recommended)

### Step 1: Create New Service

1. In your Railway project, click **"+ New"**
2. Select **"GitHub Repo"**
3. Select your `rental-scraper` repository (same one as your backend)
4. Railway will create a new service

### Step 2: Configure as Worker (Not Web Service)

1. Click on the newly created service
2. Go to **"Settings"** tab
3. Find **"Deploy"** section
4. Configure:
   - **Start Command**: `npm run scrape`
   - **Restart Policy**: Set to **"Never"** or **"On Failure"** (since it runs and exits)
   - **No PORT needed** (it's not a web service)

### Step 3: Set Up Cron Schedule

Railway might have cron scheduling in:
- **Settings** → **Cron** or **Schedule** section
- Or you might need to use Railway CLI

If you see a "Cron Schedule" field:
- Enter: `0 * * * *` (every hour)

### Step 4: Connect Environment Variables

1. Go to **"Variables"** tab
2. Make sure these are set (or add them):
   - `DATABASE_URL` - Click "Add Reference" and select your PostgreSQL service
   - `TELEGRAM_BOT_TOKEN` (if you want notifications)
   - `TELEGRAM_CHAT_ID` (if you want notifications)

### Step 5: Test

1. Go to **"Deployments"** tab
2. Click **"Redeploy"** or trigger a manual run
3. Check logs to see scraping progress

## Option 2: Use Railway CLI for Cron

If the UI doesn't support cron scheduling:

1. Install Railway CLI:
   ```bash
   npm i -g @railway/cli
   ```

2. Login and link:
   ```bash
   railway login
   railway link
   ```

3. Create cron job:
   ```bash
   railway cron create --schedule "0 * * * *" --command "npm run scrape"
   ```

## Option 3: External Cron Service (Easiest)

Use an external service to trigger your scraper:

1. **Use cron-job.org or EasyCron:**
   - Create account
   - Add new cron job
   - **URL**: `https://your-railway-service.up.railway.app/scrape` (you'd need to add this endpoint)
   - **Schedule**: Every hour
   - **Method**: POST

2. **Or add a scrape endpoint to your API** (for external triggering):
   - Add to `src/api/server.ts`:
   ```typescript
   app.post('/scrape', async (req, res) => {
     // Optional: Add auth token check
     const authToken = req.headers['x-auth-token'];
     if (authToken !== process.env.SCRAPE_AUTH_TOKEN) {
       return res.status(401).json({ error: 'Unauthorized' });
     }
     
     // Run scraper in background
     import('./scrapers/cim-full-v2-cron').then(() => {
       res.json({ message: 'Scrape started' });
     });
   });
   ```

## Recommended: Option 1 (Worker Service)

Create a separate service that runs the scraper. It will:
- Use the same codebase
- Have access to environment variables
- Run on schedule (if Railway supports it) or you can trigger manually
- Show logs for each run

## Manual Trigger (For Testing)

Even without automatic scheduling, you can:
1. Go to the service
2. Click "Deployments"
3. Click "Redeploy" to trigger a run
4. Or use Railway CLI: `railway run npm run scrape`

