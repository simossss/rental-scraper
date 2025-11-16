#!/bin/bash
# Test the remote /scrape endpoint on Railway

RAILWAY_URL="https://rental-scraper-production.up.railway.app"
ENDPOINT="${RAILWAY_URL}/scrape"

echo "=== Testing Remote Scrape Endpoint ==="
echo "URL: ${ENDPOINT}"
echo ""

# Test without auth token first
echo "1. Testing without auth token..."
RESPONSE=$(curl -X POST "${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -w "\nHTTP_CODE:%{http_code}" \
  -s)

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')

echo "Response:"
echo "$BODY"
echo ""
echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo "✅ Endpoint responded successfully!"
  echo ""
  echo "Check your Railway logs to see if scraping started:"
  echo "1. Go to Railway dashboard"
  echo "2. Click on your backend service"
  echo "3. Go to 'Deployments' → latest → 'View Logs'"
  echo "4. Look for: 'Starting CIM scrape...'"
else
  echo "❌ Endpoint returned error code: $HTTP_CODE"
  echo ""
  if [ "$HTTP_CODE" = "401" ]; then
    echo "Note: If you set SCRAPE_AUTH_TOKEN in Railway, you need to include it:"
    echo "curl -X POST ${ENDPOINT} -H 'X-Auth-Token: your-token'"
  fi
fi

echo ""
echo "=== Test Complete ==="

