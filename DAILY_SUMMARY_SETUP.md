# Daily Summary Setup

The daily summary sends a Telegram notification at 7:30 PM Central European Time (CET/CEST) with all new listings found that day, grouped by room number.

## API Endpoint

**POST** `/daily-summary`

- **Authentication**: Optional (uses `SCRAPE_AUTH_TOKEN` if set)
- **Headers**: 
  - `x-auth-token`: (optional) Your `SCRAPE_AUTH_TOKEN` value

## Setting Up the Cron Job

You can use any external cron service to call this endpoint daily at 7:30 PM CET.

### Option 1: cron-job.org (Recommended)

1. Go to [cron-job.org](https://cron-job.org) and create a free account
2. Create a new cron job:
   - **Title**: "Monaco Rental Daily Summary"
   - **URL**: `https://your-railway-app.up.railway.app/daily-summary`
   - **Schedule**: `30 19 * * *` (7:30 PM every day)
   - **Time Zone**: `Europe/Paris` (CET/CEST)
   - **Request Method**: `POST`
   - **Request Headers**: 
     - `Content-Type: application/json`
     - `x-auth-token: YOUR_SCRAPE_AUTH_TOKEN` (if you set `SCRAPE_AUTH_TOKEN`)
3. Save the cron job

### Option 2: EasyCron

1. Go to [EasyCron](https://www.easycron.com) and create an account
2. Create a new cron job:
   - **Cron Job Name**: "Monaco Rental Daily Summary"
   - **URL**: `https://your-railway-app.up.railway.app/daily-summary`
   - **Cron Expression**: `30 19 * * *` (7:30 PM every day)
   - **Timezone**: `Europe/Paris`
   - **HTTP Method**: `POST`
   - **HTTP Headers**: 
     ```
     Content-Type: application/json
     x-auth-token: YOUR_SCRAPE_AUTH_TOKEN
     ```
3. Save and activate the cron job

### Option 3: GitHub Actions (if your repo is on GitHub)

Create `.github/workflows/daily-summary.yml`:

```yaml
name: Daily Summary

on:
  schedule:
    # Run at 7:30 PM CET every day (19:30 UTC+1, or 18:30 UTC in winter)
    # Note: Adjust for DST - CEST is UTC+2, CET is UTC+1
    - cron: '30 18 * * *'  # 6:30 PM UTC = 7:30 PM CET (winter) or 8:30 PM CEST (summer)
  workflow_dispatch:  # Allow manual trigger

jobs:
  send-summary:
    runs-on: ubuntu-latest
    steps:
      - name: Call Daily Summary API
        run: |
          curl -X POST \
            -H "Content-Type: application/json" \
            -H "x-auth-token: ${{ secrets.SCRAPE_AUTH_TOKEN }}" \
            https://your-railway-app.up.railway.app/daily-summary
```

**Note**: GitHub Actions runs in UTC, so you'll need to adjust the time. For 7:30 PM CET:
- Winter (CET = UTC+1): `30 18 * * *` (6:30 PM UTC)
- Summer (CEST = UTC+2): `30 17 * * *` (5:30 PM UTC)

You may want to use two schedules or manually adjust during DST transitions.

## Testing

You can manually trigger the daily summary by calling the endpoint:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-auth-token: YOUR_SCRAPE_AUTH_TOKEN" \
  https://your-railway-app.up.railway.app/daily-summary
```

Or use the test script:

```bash
./test-daily-summary.sh
```

## Notification Format

The daily summary notification will look like this:

```
📅 Daily Summary

📆 16/11/2025

📊 Total new listings: 12

   • 2 rooms: 5
   • 3 rooms: 4
   • 4 rooms: 2
   • 5+ rooms: 1
```

If no new listings were found today:

```
📅 Daily Summary

📆 16/11/2025

No new listings today.
```

