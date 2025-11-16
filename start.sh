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
npx prisma migrate deploy || {
  echo "ERROR: Migration failed!"
  echo "Attempting to check migration status..."
  npx prisma migrate status
  exit 1
}

echo "✓ Migrations completed"
echo "Starting server..."

# Start the server
exec npm run start
