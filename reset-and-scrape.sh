#!/bin/bash

# Script to reset database, seed, and optionally trigger scrape
# Usage: ./reset-and-scrape.sh [railway-url] [auth-token]

set -e

echo "🔄 Resetting database and re-scraping..."
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL environment variable is not set"
  echo "Please set it first:"
  echo "  export DATABASE_URL='postgresql://postgres:YxpUfTQQckgGelrGWEYgOzJnBJYtNWWa@trolley.proxy.rlwy.net:16640/railway'"
  exit 1
fi

echo "📊 Step 1: Resetting database (this will delete all data)..."
echo "⚠️  This will drop all tables and recreate the schema"
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Cancelled"
  exit 1
fi

npm run prisma:reset

echo ""
echo "✅ Database reset complete"
echo ""

echo "🌱 Step 2: Seeding SourceWebsite table..."
npm run seed:websites

echo ""
echo "✅ Seeding complete"
echo ""

# Check if Railway URL and auth token are provided
if [ -n "$1" ] && [ -n "$2" ]; then
  RAILWAY_URL="$1"
  AUTH_TOKEN="$2"
  
  echo "🚀 Step 3: Triggering scrape on Railway..."
  echo "URL: $RAILWAY_URL"
  
  # Seed via API (in case migrations didn't run)
  echo "Seeding via API..."
  curl -X POST "$RAILWAY_URL/seed" \
    -H "x-auth-token: $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -w "\nHTTP Status: %{http_code}\n" \
    -s || echo "⚠️  Seed API call failed (might be OK if already seeded)"
  
  echo ""
  echo "Triggering scrape..."
  curl -X POST "$RAILWAY_URL/scrape" \
    -H "x-auth-token: $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -w "\nHTTP Status: %{http_code}\n" \
    -s
  
  echo ""
  echo "✅ Scrape triggered on Railway"
  echo "Check Railway logs to see progress"
else
  echo "ℹ️  To trigger scrape on Railway, run:"
  echo "  ./reset-and-scrape.sh https://YOUR_RAILWAY_URL.up.railway.app YOUR_AUTH_TOKEN"
  echo ""
  echo "Or trigger scrape manually via Railway dashboard or API"
fi

echo ""
echo "✅ All done!"

