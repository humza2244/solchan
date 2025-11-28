# Fix Railway Database Connection Issues

## Problem:
Backend keeps crashing with `db_termination` and `XX000` errors
CORS errors in frontend because backend is down
Using Supabase connection pooler which is too aggressive

## Solution: Use Direct Database Connection

### In Railway Dashboard:

1. **Remove old DATABASE_URL variable:**
   - Go to Railway project → Variables
   - Delete the variable called `DATABASE_URL`

2. **Add new DATABASE_URL (Direct Connection):**
   
   Go to your Supabase Dashboard:
   - https://supabase.com/dashboard/project/maliveusaqzbohvitvxt/settings/database
   
   Look for **"Connection string"** section
   
   Find the **"Connection string (Session mode)"** - NOT the pooler one!
   
   It should look like:
   ```
   postgresql://postgres.maliveusaqzbohvitvxt:[YOUR-PASSWORD]@aws-1-us-east-2.connect.supabase.com:5432/postgres
   ```
   
   Notice: `connect.supabase.com` (NOT `pooler.supabase.com`)

3. **Add this as DATABASE_URL in Railway**
   - Replace `[YOUR-PASSWORD]` with your actual database password
   - Click "Add Variable"
   - Redeploy

### Why This Fixes It:

**Pooler (bad for Railway):**
- Very short timeouts (2 seconds)
- Aggressively kills idle connections
- Made for serverless functions (short-lived)

**Direct Connection (good for Railway):**
- Longer timeouts
- Stable for long-running servers
- Better for Railway's always-on containers

---

Once you update this, the backend should stay up and CORS will work!

