#!/bin/bash

# Test script to trigger scraper on Railway
# Usage: ./test-railway-scrape.sh [railway-url] [auth-token]

RAILWAY_URL="${1:-http://localhost:3001}"
AUTH_TOKEN="${2:-${SCRAPE_AUTH_TOKEN}}"

echo "🚀 Testing Railway scraper..."
echo "📍 URL: $RAILWAY_URL"
echo ""

# Check if we have auth token
if [ -z "$AUTH_TOKEN" ]; then
  echo "⚠️  Warning: No auth token provided. Request may fail if SCRAPE_AUTH_TOKEN is set on Railway."
  echo "   You can set it as: SCRAPE_AUTH_TOKEN=your_token ./test-railway-scrape.sh $RAILWAY_URL"
  echo ""
fi

# Trigger scrape
echo "📡 Triggering scrape endpoint..."
if [ -z "$AUTH_TOKEN" ]; then
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    "$RAILWAY_URL/scrape")
else
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -H "x-auth-token: $AUTH_TOKEN" \
    "$RAILWAY_URL/scrape")
fi

# Extract status code (last line)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "📊 Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""
echo "📈 HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Scrape started successfully!"
  echo ""
  echo "💡 Check Railway logs to see the scraping progress:"
  echo "   railway logs --service your-service-name"
else
  echo "❌ Failed to start scrape"
  exit 1
fi

