# Railway Environment Variables - Quick Fix

## Add NODE_ENV to Railway

The database SSL fix requires `NODE_ENV=production` to be set on Railway.

### Steps:

1. **Go to Railway Dashboard**
   - Open your backend service

2. **Go to Variables tab**

3. **Add this variable:**
   ```
   NODE_ENV=production
   ```

4. **Railway will auto-redeploy**
   - Wait about 1-2 minutes

### After Deployment

Watch the Railway logs. You should see:
```
✅ Database connected successfully
🚀 Server running on http://localhost:5001
🔌 WebSocket server ready
📊 Database connected
```

**NO MORE** database SSL errors!

### Test Messages

1. Go to your Vercel site
2. Open browser console (F12)
3. Navigate to a community
4. Send a message
5. Check Railway logs for:
   ```
   📨 Received new-message event: { ... }
   💾 Attempting to save message to database...
   ✅ Message saved successfully
   📤 Message broadcasted to community
   ```

### Current Railway Environment Variables Should Be:

```
DATABASE_URL=postgresql://postgres.maliveusaqzbohvitvxt:[password]@aws-1-us-east-2.pooler.supabase.com:5432/postgres
FRONTEND_URL=https://solchan-frontend.vercel.app
NODE_ENV=production
PORT=5001
RUN_MIGRATIONS=true
SUPABASE_URL=https://maliveusaqzbohvitvxt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
```

Make sure `FRONTEND_URL` matches your Vercel URL exactly!

