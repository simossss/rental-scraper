#!/bin/bash
# Script to fix migration issues when tables don't exist

echo "=== Checking Migration Status ==="
npx prisma migrate status

echo ""
echo "=== Checking if _prisma_migrations table exists ==="
npx prisma db execute --stdin <<EOF
SELECT COUNT(*) as migration_count FROM "_prisma_migrations";
EOF

echo ""
echo "=== Checking if tables exist ==="
npx prisma db execute --stdin <<EOF
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name NOT LIKE '_prisma%'
ORDER BY table_name;
EOF

echo ""
echo "=== Attempting to resolve... ==="
echo "If tables don't exist but migrations are marked as applied,"
echo "we need to reset the migration state."

read -p "Do you want to reset migrations and re-run them? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "Resetting migrations..."
  npx prisma migrate resolve --applied 20251115160557_init || true
  npx prisma migrate resolve --applied 20251115161615_add_reference_normalized || true
  npx prisma migrate resolve --applied 20251116134322_add_scoring_fields || true
  
  echo "Re-running migrations..."
  npx prisma migrate deploy
else
  echo "Skipping reset. You can manually run: npx prisma migrate deploy --force"
fi

