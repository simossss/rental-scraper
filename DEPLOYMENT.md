# Deployment Guide

This guide covers deploying the Monaco Rental Scraper to production.

## Architecture

- **Frontend**: Vercel (React/Vite)
- **Backend API**: Railway (Node.js/Express)
- **Database**: Railway PostgreSQL
- **Cron Jobs**: Railway Cron Jobs
- **Notifications**: Telegram Bot

## Prerequisites

1. Railway account: https://railway.app
2. Vercel account: https://vercel.com
3. Telegram Bot Token (see below)

## Step 1: Create Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` and follow instructions
3. Save the bot token (e.g., `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
4. Get your chat ID:
   - Send a message to your bot
   - Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Find `"chat":{"id":123456789}` in the response

## Step 2: Deploy Backend to Railway

### 2.1 Create New Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project"
3. Select "Deploy from GitHub repo" (or "Empty Project" if not using GitHub)

### 2.2 Add PostgreSQL Database

1. In your Railway project, click "+ New"
2. Select "Database" → "Add PostgreSQL"
3. Railway will automatically create a `DATABASE_URL` environment variable
4. **IMPORTANT**: Make sure the PostgreSQL service is connected to your backend service. Railway should do this automatically, but verify by:
   - Clicking on your backend service
   - Going to "Variables" tab
   - Checking that `DATABASE_URL` is listed (it should be auto-injected from the PostgreSQL service)
   - If `DATABASE_URL` is missing, click "Add Reference" and select your PostgreSQL service

### 2.3 Deploy Backend Service

1. Click "+ New" → "GitHub Repo" (or "Empty Service")
2. Connect your repository
3. Railway will auto-detect Node.js

### 2.4 Configure Environment Variables

In Railway, add these environment variables:

```bash
# Database (auto-created by Railway PostgreSQL)
DATABASE_URL=postgresql://...

# API Port (Railway will set PORT automatically)
PORT=3001

# Telegram Notifications
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here

# CORS (for frontend) - Add your Vercel domain(s), comma-separated for multiple
CORS_ORIGIN=https://rental-scraper-git-main-digital7402-pmmes-projects.vercel.app
```

### 2.5 Configure Build & Start Commands

Railway should auto-detect, but verify:

- **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy`
- **Start Command**: `npm run start`

### 2.6 Get Your API URL

After deployment, Railway will provide a URL like:
- `https://your-app-name.up.railway.app`

Save this URL for the frontend configuration.

## Step 3: Deploy Frontend to Vercel

### 3.1 Create Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Select the `frontend` folder as the root directory

### 3.2 Configure Build Settings

Vercel should auto-detect Vite, but verify:

- **Framework Preset**: Vite
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### 3.3 Add Environment Variables

In Vercel project settings → Environment Variables:

```bash
VITE_API_URL=https://your-railway-api.up.railway.app
```

**Important**: Remove `/api` from the end - the frontend will add it.

### 3.4 Update vercel.json

Edit `frontend/vercel.json` and replace `YOUR_RAILWAY_API_URL` with your actual Railway API URL:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-railway-api.up.railway.app/:path*"
    }
  ]
}
```

### 3.5 Deploy

Click "Deploy" and wait for the build to complete.

## Step 4: Set Up Cron Job on Railway

### Option A: Railway Cron Jobs (Recommended)

Railway supports cron jobs through their CLI or dashboard:

1. **Via Dashboard**:
   - In your Railway project, click "+ New"
   - Select "Cron Job"
   - Configure:
     - **Schedule**: `0 * * * *` (every hour) or `0 */6 * * *` (every 6 hours)
     - **Command**: `npm run scrape`
     - **Service**: Select your backend service
     - **Environment Variables**: Make sure `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set

2. **Via Railway CLI** (Alternative):
   ```bash
   railway cron create --schedule "0 * * * *" --command "npm run scrape"
   ```

**Common Cron Schedules**:
- `0 * * * *` - Every hour at minute 0
- `0 */6 * * *` - Every 6 hours
- `0 9,15,21 * * *` - At 9 AM, 3 PM, and 9 PM daily
- `0 9 * * *` - Once daily at 9 AM

### Option B: External Cron Service

Use a service like [cron-job.org](https://cron-job.org) or [EasyCron](https://www.easycron.com):

1. Create a new cron job
2. **URL**: `https://your-railway-api.up.railway.app/scrape` (you'll need to add this endpoint)
3. **Schedule**: Every hour
4. **Method**: POST (optional, for security)

### Option C: Add Scrape Endpoint (Alternative)

If using external cron, add this to `src/api/server.ts`:

```typescript
app.post('/scrape', async (req, res) => {
  // Optional: Add authentication
  const authToken = req.headers['x-auth-token'];
  if (authToken !== process.env.SCRAPE_AUTH_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Run scrape in background
  import('./scrapers/cim-full-v2-cron').then(() => {
    res.json({ message: 'Scrape started' });
  });
});
```

## Step 5: Update CORS Settings

In `src/api/server.ts`, update CORS to allow your Vercel domain:

```typescript
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://your-frontend.vercel.app',
  credentials: true,
}));
```

## Step 6: Test Everything

1. **Test API**: Visit `https://your-railway-api.up.railway.app/health`
2. **Test Frontend**: Visit your Vercel URL
3. **Test Scrape**: Manually trigger the cron job or run:
   ```bash
   npm run scrape
   ```
4. **Test Telegram**: Check if you receive notifications

## Troubleshooting

### Database Connection Issues

- Verify `DATABASE_URL` is set correctly in Railway
- Run migrations: `npx prisma migrate deploy` in Railway console

### API Not Accessible

- Check Railway service is running
- Verify PORT environment variable
- Check Railway logs for errors

### Frontend Can't Connect to API

- Verify `VITE_API_URL` is set in Vercel
- Check CORS settings in backend
- Verify `vercel.json` rewrite rules

### Telegram Not Working

- Verify bot token and chat ID
- Test bot manually: `https://api.telegram.org/bot<TOKEN>/getMe`
- Check Railway logs for Telegram errors

### Cron Job Not Running

- Check Railway cron job status
- Verify command: `npm run scrape`
- Check logs for errors

## Environment Variables Summary

### Backend (Railway)

```bash
DATABASE_URL=postgresql://...
PORT=3001
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
CORS_ORIGIN=https://your-frontend.vercel.app
```

### Frontend (Vercel)

```bash
VITE_API_URL=https://your-railway-api.up.railway.app
```

## Monitoring

- **Railway Logs**: View in Railway dashboard
- **Vercel Logs**: View in Vercel dashboard
- **Telegram**: Check for notification delivery
- **Database**: Use Railway's PostgreSQL dashboard or Prisma Studio

## Next Steps

- Set up error monitoring (Sentry, etc.)
- Add rate limiting to API
- Set up database backups
- Add authentication if needed
- Monitor scrape performance

