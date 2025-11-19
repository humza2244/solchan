# Switch to Railway - 2 Minute Setup

## Why Railway > Render

- ✅ **Actually works** (no clone errors)
- ✅ **Auto-detects Node.js projects**
- ✅ **Simpler configuration**
- ✅ **Better free tier**
- ✅ **Socket.IO works perfectly**

## Quick Setup:

1. **Go to [railway.app](https://railway.app/)**

2. **New Project** → **Deploy from GitHub repo**

3. **Select your `solchan` repo**

4. **Railway auto-detects backend!** Just make sure:
   - **Root Directory**: `backend` (or leave blank if repo root is backend)
   - **Start Command**: `node src/server.js`

5. **Add Environment Variables**:
   ```
   DATABASE_URL=postgresql://postgres.maliveusaqzbohvitvxt:Kirkland%402244@aws-1-us-east-2.pooler.supabase.com:5432/postgres
   SUPABASE_URL=https://maliveusaqzbohvitvxt.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hbGl2ZXVzYXF6Ym9odml0dnh0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjk5NjA4MSwiZXhwIjoyMDc4NTcyMDgxfQ.091KuP5ZDb6xL03sdSsbfvUgGTOLLrOgDR2LB3VVA7k
   FRONTEND_URL=https://solchan-frontend.vercel.app
   PORT=5001
   RUN_MIGRATIONS=true
   NODE_ENV=production
   ```

6. **Deploy!** Railway does the rest.

7. **Copy your Railway URL** (e.g., `https://solchan-production.up.railway.app`)

8. **Update Vercel**:
   - Vercel → Your project → Environment Variables
   - Update `VITE_API_URL` to: `https://YOUR-RAILWAY-URL.up.railway.app/api`
   - Redeploy

**That's it!** Railway is way more reliable than Render.

