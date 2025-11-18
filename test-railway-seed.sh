#!/bin/bash

# Test script to seed database on Railway
# Usage: ./test-railway-seed.sh [railway-url] [auth-token]

RAILWAY_URL="${1:-http://localhost:3001}"
AUTH_TOKEN="${2:-${SCRAPE_AUTH_TOKEN}}"

echo "🌱 Testing Railway seed endpoint..."
echo "📍 URL: $RAILWAY_URL"
echo ""

# Check if we have auth token
if [ -z "$AUTH_TOKEN" ]; then
  echo "⚠️  Warning: No auth token provided. Request may fail if SCRAPE_AUTH_TOKEN is set on Railway."
  echo ""
fi

# Trigger seed
echo "📡 Triggering seed endpoint..."
if [ -z "$AUTH_TOKEN" ]; then
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    "$RAILWAY_URL/seed")
else
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -H "x-auth-token: $AUTH_TOKEN" \
    "$RAILWAY_URL/seed")
fi

# Extract status code (last line)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "📊 Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""
echo "📈 HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Database seeded successfully!"
else
  echo "❌ Failed to seed database"
  exit 1
fi

