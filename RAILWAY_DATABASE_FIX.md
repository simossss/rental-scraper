# Fix DATABASE_URL in Railway

If you see `DATABASE_URL` with value `${Postgres.DATABASE_URL}`, the reference isn't resolving correctly.

## Solution:

1. **Delete the current DATABASE_URL variable:**
   - In your backend service, go to "Variables" tab
   - Find `DATABASE_URL` with value `${Postgres.DATABASE_URL}`
   - Click the delete/trash icon to remove it

2. **Reconnect the database service:**
   - In your backend service, go to "Variables" tab
   - Click "Add Reference" or "Connect Service"
   - Select your PostgreSQL service
   - Railway will automatically add `DATABASE_URL` with the actual connection string (not a template)

3. **Verify:**
   - After reconnecting, `DATABASE_URL` should show the actual PostgreSQL connection string
   - It should look like: `postgresql://postgres:password@host:port/database`
   - It should NOT show as `${Postgres.DATABASE_URL}`

## Alternative (if reference doesn't work):

If Railway's auto-injection isn't working:

1. Go to your PostgreSQL service
2. Click on "Variables" tab
3. Find the actual `DATABASE_URL` value
4. Copy it
5. Go back to your backend service
6. Add a new variable:
   - Key: `DATABASE_URL`
   - Value: Paste the connection string directly

