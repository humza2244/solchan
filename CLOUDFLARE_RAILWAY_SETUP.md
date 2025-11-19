# Cloudflare Pages (Frontend) + Railway (Backend) Setup

## Architecture
- **Frontend**: Cloudflare Pages (free, fast CDN, global)
- **Backend**: Railway (WebSocket/Socket.IO support)

## Step 1: Deploy Backend to Railway

1. Go to **[railway.app](https://railway.app/)**
2. **New Project** → **Deploy from GitHub repo**
3. Select your `solchan` repo
4. Railway auto-detects it! But check:
   - **Root Directory**: `backend` (if needed)
   - **Start Command**: `node src/server.js`
5. **Add Environment Variables**:
   ```
   DATABASE_URL=postgresql://postgres.maliveusaqzbohvitvxt:Kirkland%402244@aws-1-us-east-2.pooler.supabase.com:5432/postgres
   SUPABASE_URL=https://maliveusaqzbohvitvxt.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hbGl2ZXVzYXF6Ym9odml0dnh0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjk5NjA4MSwiZXhwIjoyMDc4NTcyMDgxfQ.091KuP5ZDb6xL03sdSsbfvUgGTOLLrOgDR2LB3VVA7k
   FRONTEND_URL=https://your-app.pages.dev
   PORT=5001
   RUN_MIGRATIONS=true
   NODE_ENV=production
   ```
6. **Deploy** → Copy your Railway URL (e.g., `https://solchan-production.up.railway.app`)

## Step 2: Deploy Frontend to Cloudflare Pages

1. Go to **[dash.cloudflare.com](https://dash.cloudflare.com/)**
2. **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. Select your GitHub account → Select `solchan` repo
4. **Configure build**:
   - **Framework preset**: Vite
   - **Root directory**: `frontend`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. **Environment variables** (click "Add variable" in Settings after first deploy):
   ```
   VITE_API_URL=https://YOUR-RAILWAY-URL.up.railway.app/api
   VITE_SUPABASE_URL=https://maliveusaqzbohvitvxt.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hbGl2ZXVzYXF6Ym9odml0dnh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5OTYwODEsImV4cCI6MjA3ODU3MjA4MX0.PZHI7JVwIqaVkG23TpIemtYfHF1fLsCNEJE_d6Tj2W8
   ```
6. **Save and Deploy**
7. Copy your Cloudflare Pages URL (e.g., `https://solchan.pages.dev`)

## Step 3: Update CORS in Railway

1. Go back to **Railway** → Your backend service
2. **Variables** → Update `FRONTEND_URL`:
   ```
   FRONTEND_URL=https://YOUR-CLOUDFLARE-PAGES-URL.pages.dev
   ```
3. Railway auto-redeploys

## Step 4: Update Frontend Environment Variables

1. **Cloudflare Pages** → Your project → **Settings** → **Environment variables**
2. Update `VITE_API_URL` if needed:
   ```
   VITE_API_URL=https://YOUR-RAILWAY-URL.up.railway.app/api
   ```
3. **Save** → Triggers auto-redeploy

## Benefits

✅ **Railway**: Reliable WebSocket support, simple deployment
✅ **Cloudflare Pages**: Global CDN, fast, free, automatic HTTPS
✅ **Supabase**: Database + storage (already configured)

## Custom Domain (Optional)

### Cloudflare Pages:
1. **Custom domains** → Add domain
2. Follow DNS setup (uses Cloudflare DNS)

### Railway:
1. **Settings** → **Generate Domain**
2. Or add custom domain in **Networking**

## Test Everything

1. Visit your Cloudflare Pages URL
2. Create a community
3. Post messages
4. Open in another tab → messages sync in real-time! ⚡

Done! 🚀

