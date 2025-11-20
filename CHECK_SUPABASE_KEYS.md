# Check Your Supabase Keys Are Correct

## The Problem
Railway shows: `Token verification failed: { error: 'Invalid API key' }`

This means either:
1. `SUPABASE_URL` is wrong
2. `SUPABASE_SERVICE_ROLE_KEY` is wrong

## How to Fix - Check Both Keys

### 1. Check SUPABASE_URL

**In Railway, should be EXACTLY:**
```
https://maliveusaqzbohvitvxt.supabase.co
```

**Common mistakes:**
- ❌ `https://solchan-frontend.vercel.app` (this is your frontend!)
- ❌ Missing `https://`
- ❌ Extra `/` at the end

### 2. Check SUPABASE_SERVICE_ROLE_KEY

Go to Supabase: https://supabase.com/dashboard/project/maliveusaqzbohvitvxt/settings/api

The **service_role** key should:
- Start with: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`
- Be very long (500+ characters)
- Contain: `"role":"service_role"` (if you decode it)

**The key I see in your screenshots:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hbGl2ZXVzYXF6Ym9odml0dnh0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjk5NjA4MSwiZXhwIjoyMDc4NTcyMDgxfQ.091KuP5ZDb6xL03sdSsbfvUgGTOLLrOgDR2LB3VVA7k
```

This looks correct! But there might be a typo. Let me check...

**ACTION: Copy it again from Supabase**

1. Go to: https://supabase.com/dashboard/project/maliveusaqzbohvitvxt/settings/api
2. Find **"service_role"** (NOT anon)
3. Click the eye icon to reveal
4. Click copy button (don't type it!)
5. Go to Railway → Variables
6. Delete the old `SUPABASE_SERVICE_ROLE_KEY`
7. Add new one with the freshly copied key
8. Save

## Quick Test After Fixing

After Railway redeploys, check the logs:
- ✅ Should see: `✅ Supabase configuration loaded`
- ❌ Should NOT see: `Token verification failed`

Then try posting a message on Vercel frontend!

## If Still Not Working

The frontend might be sending the wrong token. Let me check...

Actually, your **frontend** is using the **ANON key**, not the service role key. That's correct!

**Frontend (.env or Vercel):**
```
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hbGl2ZXVzYXF6Ym9odml0dnh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5OTYwODEsImV4cCI6MjA3ODU3MjA4MX0.PZHI7JVwIqaVkG23TpIemtYfHF1fLsCNEJE_d6Tj2W8
```

Make sure Railway has the **SERVICE_ROLE** key and Vercel has the **ANON** key!

