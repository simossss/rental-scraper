#!/bin/bash
# Test the /scrape endpoint locally

echo "=== Testing /scrape Endpoint ==="
echo ""

# Check if API is running
echo "1. Make sure your API server is running:"
echo "   Run: npm run api"
echo "   (in a separate terminal)"
echo ""
read -p "Press Enter when API is running..."

echo ""
echo "2. Testing /scrape endpoint..."
echo ""

# Test without auth token
echo "Testing without auth token:"
curl -X POST http://localhost:3001/scrape \
  -H "Content-Type: application/json" \
  -v

echo ""
echo ""
echo "=== Check your API server logs to see if scraper started ==="
echo "You should see: 'Starting CIM scrape...' in the logs"

