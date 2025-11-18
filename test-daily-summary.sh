#!/bin/bash

# Test script for daily summary endpoint
# Usage: ./test-daily-summary.sh [railway-url] [auth-token]

RAILWAY_URL="${1:-http://localhost:3001}"
AUTH_TOKEN="${2:-}"

echo "Testing daily summary endpoint at: $RAILWAY_URL/daily-summary"

if [ -z "$AUTH_TOKEN" ]; then
  echo "Warning: No auth token provided. Request may fail if SCRAPE_AUTH_TOKEN is set."
  curl -X POST \
    -H "Content-Type: application/json" \
    "$RAILWAY_URL/daily-summary"
else
  curl -X POST \
    -H "Content-Type: application/json" \
    -H "x-auth-token: $AUTH_TOKEN" \
    "$RAILWAY_URL/daily-summary"
fi

echo ""
echo "Done!"

