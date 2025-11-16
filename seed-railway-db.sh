#!/bin/bash
# Seed SourceWebsite table on Railway

export DATABASE_URL="postgresql://postgres:YxpUfTQQckgGelrGWEYgOzJnBJYtNWWa@trolley.proxy.rlwy.net:16640/railway"

echo "=== Seeding SourceWebsite Table ==="
echo ""

npx prisma db execute --stdin <<'EOF'
INSERT INTO "SourceWebsite" (code, name, "baseUrl", "createdAt", "updatedAt")
VALUES ('CIM', 'Chambre Immobilière de Monaco', 'https://www.chambre-immobiliere-monaco.mc', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  "baseUrl" = EXCLUDED."baseUrl",
  "updatedAt" = NOW();
EOF

echo ""
echo "✅ SourceWebsite seeded!"
echo ""
echo "You can now run the scraper again."

