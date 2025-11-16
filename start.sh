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

# Check if tables actually exist before running migrations
TABLES_EXIST=$(npx prisma db execute --stdin <<'EOF' 2>/dev/null | grep -c "Listing\|SourceWebsite" || echo "0")
EOF
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('Listing', 'SourceWebsite');
EOF

if [ "$TABLES_EXIST" = "0" ]; then
  echo "No tables found. Checking migration state..."
  # Check if _prisma_migrations exists but tables don't
  MIGRATIONS_TRACKED=$(npx prisma migrate status 2>&1 | grep -c "Database schema is up to date" || echo "0")
  
  if [ "$MIGRATIONS_TRACKED" != "0" ]; then
    echo "⚠️  Migrations marked as applied but tables don't exist!"
    echo "Resetting migration state and re-running migrations..."
    # Mark all migrations as rolled back, then re-apply
    npx prisma migrate resolve --rolled-back 20251115160557_init 2>/dev/null || true
    npx prisma migrate resolve --rolled-back 20251115161615_add_reference_normalized 2>/dev/null || true
    npx prisma migrate resolve --rolled-back 20251116134322_add_scoring_fields 2>/dev/null || true
  fi
fi

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
