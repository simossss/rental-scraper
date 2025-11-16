#!/bin/bash
set -e

# Wait for DATABASE_URL to be available
echo "Waiting for DATABASE_URL..."
while [ -z "$DATABASE_URL" ]; do
  sleep 1
done

echo "DATABASE_URL found, running migrations..."
npx prisma migrate deploy

echo "Starting server..."
npm run start

