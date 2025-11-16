#!/bin/bash
# Check if tables exist in Railway database

export DATABASE_URL="postgresql://postgres:YxpUfTQQckgGelrGWEYgOzJnBJYtNWWa@trolley.proxy.rlwy.net:16640/railway"

echo "=== Checking Database Tables ==="
echo ""

# Use Prisma to check tables
npx prisma db execute --stdin <<'EOF'
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
EOF

echo ""
echo "=== Checking Migration Status ==="
npx prisma migrate status

