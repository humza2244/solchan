# WebSocket Connection Fix for Vercel + Railway

## Problem
Messages aren't being saved because the WebSocket connection from Vercel (frontend) to Railway (backend) isn't working.

## Solution: Set Environment Variables on Vercel

### 1. Go to Vercel Dashboard
- Open your project: https://vercel.com/dashboard
- Click on your `solchan-frontend` project
- Go to **Settings** → **Environment Variables**

### 2. Add These Environment Variables

| Variable Name | Value | Notes |
|--------------|-------|-------|
| `VITE_API_URL` | `https://your-railway-backend.up.railway.app/api` | Replace with your Railway backend URL + `/api` |
| `VITE_SOCKET_URL` | `https://your-railway-backend.up.railway.app` | Same Railway URL, no `/api` suffix |
| `VITE_SUPABASE_URL` | `https://maliveusaqzbohvitvxt.supabase.co` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Your Supabase anon key |

### 3. Get Your Railway Backend URL

1. Go to Railway dashboard
2. Click on your `solchan-backend` service
3. Go to **Settings** → **Public Networking**
4. Copy the URL (it looks like: `your-app-name.up.railway.app`)

### 4. Example Values

If your Railway URL is `solchan-production.up.railway.app`:

```
VITE_API_URL=https://solchan-production.up.railway.app/api
VITE_SOCKET_URL=https://solchan-production.up.railway.app
```

### 5. Redeploy Vercel

After setting the environment variables:
1. Go to **Deployments** tab in Vercel
2. Find the latest deployment
3. Click the **...** menu → **Redeploy**

### 6. Test WebSocket Connection

After redeployment, open your Vercel site and:
1. Open browser console (F12)
2. Navigate to a community
3. You should see:
   ```
   🔌 Connecting to WebSocket...
   ✅ WebSocket connected! Socket ID: abc123
   ```
4. Try sending a message
5. You should see:
   ```
   📤 Sending message via WebSocket: { ... }
   ✅ Message emitted to server
   ```

### 7. Check Railway Logs

After sending a message, Railway logs should show:
```
🔌 User connected: abc123
📡 Event received: new-message with 1 arg(s)
📨 Received new-message event: { ... }
💾 Attempting to save message to database...
✅ Message saved successfully
```

## Common Issues

### Issue: "Connection error" alert
**Cause**: VITE_SOCKET_URL not set or incorrect
**Fix**: Set VITE_SOCKET_URL to your Railway backend URL

### Issue: WebSocket connects but messages don't send
**Cause**: CORS issue on Railway backend
**Fix**: Verify FRONTEND_URL on Railway matches your Vercel URL

### Issue: Messages send but don't save
**Cause**: Database connection issue
**Fix**: Check Railway logs for database errors

## Quick Check Commands

On Vercel (check if env vars are set):
```bash
# In browser console on your Vercel site:
console.log(import.meta.env.VITE_SOCKET_URL)
console.log(import.meta.env.VITE_API_URL)
```

Should output your Railway URLs, not localhost!

