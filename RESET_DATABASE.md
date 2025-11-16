# Reset Database on Railway

## Quick Reset Using Your Connection Details

You can reset the database using the script I created, or manually:

### Option 1: Use the Script

```bash
./reset-db-railway.sh
```

### Option 2: Manual Reset

1. **Set environment variables:**
   ```bash
   export PGHOST=trolley.proxy.rlwy.net
   export PGPORT=16640
   export PGDATABASE=railway
   export PGUSER=postgres
   export PGPASSWORD=YxpUfTQQckgGelrGWEYgOzJnBJYtNWWa
   export DATABASE_URL="postgresql://postgres:YxpUfTQQckgGelrGWEYgOzJnBJYtNWWa@trolley.proxy.rlwy.net:16640/railway"
   ```

2. **Test connection:**
   ```bash
   psql -c "SELECT version();"
   ```

3. **Reset Prisma migrations:**
   ```bash
   npx prisma migrate reset --force
   ```

4. **Re-run migrations:**
   ```bash
   npx prisma migrate deploy
   ```

### Option 3: Using Railway CLI

```bash
railway run npx prisma migrate reset --force
```

## After Reset

1. Check Railway's database UI - tables should now be visible
2. Verify tables exist:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public'
   ORDER BY table_name;
   ```

3. Expected tables:
   - `SourceWebsite`
   - `Listing`
   - `ListingSource`
   - `ScrapeRun`
   - `_prisma_migrations`

## Security Note

⚠️ **Important**: The password in the script is exposed. After resetting, consider:
- Rotating the database password in Railway
- Using Railway's environment variables instead of hardcoding
- Not committing this script to git (it's in .gitignore)

