# Fix Railway Authentication - Step by Step

## The Problem
Railway backend shows `Token verification failed: Invalid API key` because the SUPABASE_SERVICE_ROLE_KEY is wrong or missing.

## The Solution

### Step 1: Get the Correct Supabase Service Role Key

1. Go to https://supabase.com/dashboard/project/maliveusaqzbohvitvxt
2. Click **Settings** (gear icon in left sidebar)
3. Click **API** in the settings menu
4. Scroll down to "Project API keys"
5. Find the **`service_role`** key (NOT the `anon` key)
6. Click the **eye icon** to reveal it
7. Click **Copy** - should look like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...very-long...`

### Step 2: Update Railway Environment Variable

1. Go to https://railway.app/dashboard
2. Open your **solchan** project
3. Click on your backend service
4. Click **Variables** tab
5. Find `SUPABASE_SERVICE_ROLE_KEY`
6. Click the **three dots** → **Edit**
7. **Paste the correct service_role key** you copied
8. Click **Save** or press Enter
9. Railway will automatically redeploy (~1-2 minutes)

### Step 3: Verify It Works

After Railway redeploys, check the logs:
- Should see: `✅ Supabase configuration loaded`
- Should NOT see: `Token verification failed: Invalid API key`

Then test on Vercel frontend:
- Refresh the page
- Check browser console
- Should see NO 401 errors
- Should see your username (if you have one) or email in top-left

## Common Mistakes

❌ **Using the ANON key instead of SERVICE_ROLE key**
- ANON key: starts with `eyJhbGci...` and has `"role":"anon"`
- SERVICE_ROLE key: starts with `eyJhbGci...` and has `"role":"service_role"`
- You need the SERVICE_ROLE key!

❌ **Extra spaces or characters**
- Make sure you copy the ENTIRE key
- No spaces at beginning or end
- No quotes around it

❌ **Wrong Supabase project**
- Make sure you're in the correct project: `maliveusaqzbohvitvxt`

## Still Not Working?

If you still get errors after this:

1. Check Railway logs for the exact error message
2. Make sure `SUPABASE_URL` is: `https://maliveusaqzbohvitvxt.supabase.co`
3. Try regenerating the service_role key in Supabase (Settings → API → Reset)

