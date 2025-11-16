# Setting Up Cron Job in Railway - Step by Step

## Important: Don't Use Templates!

You don't need to select a template. You're adding a cron job to your **existing project**.

## Step-by-Step Instructions

### Step 1: Go to Your Existing Project

1. In Railway dashboard, find your **existing project** (the one with your backend service and PostgreSQL)
2. Click on that project to open it
3. You should see your services: backend service, PostgreSQL, etc.

### Step 2: Add Cron Job to Existing Project

1. **Inside your existing project**, click **"+ New"** (top right or in the services list)
2. You'll see options like:
   - "GitHub Repo"
   - "Database"
   - **"Cron Job"** ← Click this one
   - "Empty Service"
   - etc.

3. Click **"Cron Job"**

### Step 3: Configure the Cron Job

After clicking "Cron Job", you'll see a configuration form:

1. **Schedule**: Enter `0 * * * *` (every hour)
   - Or use the schedule builder if available

2. **Command**: Enter `npm run scrape`

3. **Service/Repository**: 
   - Select your **existing backend service** from the dropdown
   - OR select your GitHub repository (same one as your backend)
   - This ensures it uses the same codebase

4. **Environment Variables**:
   - The cron job will inherit variables from the service it's attached to
   - Make sure your backend service has:
     - `DATABASE_URL` (auto-injected from PostgreSQL)
     - `TELEGRAM_BOT_TOKEN` (if you want notifications)
     - `TELEGRAM_CHAT_ID` (if you want notifications)

5. Click **"Deploy"** or **"Create"**

### Step 4: Test It

1. After the cron job is created, you should see it in your services list
2. Click on the cron job service
3. Look for a **"Run Now"** or **"Trigger"** button
4. Click it to test immediately
5. Check the logs to see scraping progress

## Visual Guide

```
Railway Dashboard
└── Your Project (rental-scraper)
    ├── Backend Service (API)
    ├── PostgreSQL Database
    └── Cron Job (NEW) ← Add this here
```

## Alternative: If You Don't See "Cron Job" Option

If Railway doesn't show "Cron Job" as an option:

1. Click **"+ New"** → **"Empty Service"**
2. Connect it to your GitHub repository (same repo as backend)
3. In the service settings:
   - Set **Start Command**: `npm run scrape`
   - Add a **Cron Schedule**: `0 * * * *`
   - Or use Railway's cron job feature if available in settings

## Troubleshooting

### Cron Job Not Showing Up

- Make sure you're in your **existing project**, not creating a new one
- Look for "Cron Job" in the "+ New" menu
- If it's not there, Railway might call it something else - look for "Scheduled Task" or similar

### Can't Attach to Backend Service

- Make sure both services are in the same project
- The cron job needs access to the same environment variables
- You can manually copy environment variables if needed

## What Happens Next

Once set up:
- The cron job will run `npm run scrape` every hour
- It will use the same codebase as your backend
- It will have access to `DATABASE_URL` and other env vars
- You'll see logs showing scraping progress
- Listings will be added to your database
- You'll get Telegram notifications (if configured)

