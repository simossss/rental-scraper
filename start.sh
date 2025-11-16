#!/bin/bash
set -e

echo "=== Starting Railway Service ==="

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set!"
  echo "Please make sure you have:"
  echo "1. Added a PostgreSQL database service in Railway"
  echo "2. Connected the database to this service"
  echo ""
  echo "Railway should automatically inject DATABASE_URL when the database is connected."
  exit 1
fi

echo "✓ DATABASE_URL is set"
echo "Running database migrations..."

# Run migrations
# If migrations are marked as applied but tables don't exist, 
# we'll need to manually reset (see FIX_EMPTY_DATABASE.md)
npx prisma migrate deploy || {
  echo "ERROR: Migration failed!"
  echo "Attempting to check migration status..."
  npx prisma migrate status
  echo ""
  echo "If tables don't exist, you may need to run: npx prisma migrate reset --force"
  exit 1
}

echo "✓ Migrations completed"
echo "Starting server..."

# Start the server
exec npm run start
