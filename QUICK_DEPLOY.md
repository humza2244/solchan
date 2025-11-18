# Quick Deploy Guide - Get Live in 10 Minutes! 🚀

## Step 1: Push to GitHub (2 minutes)

```bash
cd /Users/humzabaig/chan-app

# Initialize git (if not done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Solchan memecoin platform"

# Create GitHub repo at https://github.com/new
# Name it: solchan or chan-app

# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/solchan.git

# Push
git branch -M main
git push -u origin main
```

## Step 2: Deploy Backend to Railway (3 minutes)

1. Go to **[Railway.app](https://railway.app/)**
2. Click **"Login"** → Sign in with GitHub
3. Click **"New Project"**
4. Click **"Deploy from GitHub repo"**
5. Select your **solchan** repository
6. Click **"Add variables"** and paste these:

```
DATABASE_URL=postgresql://postgres:Kirkland%402244@db.maliveusaqzbohvitvxt.supabase.co:5432/postgres
SUPABASE_URL=https://maliveusaqzbohvitvxt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hbGl2ZXVzYXF6Ym9odml0dnh0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjk5NjA4MSwiZXhwIjoyMDc4NTcyMDgxfQ.091KuP5ZDb6xL03sdSsbfvUgGTOLLrOgDR2LB3VVA7k
PORT=5001
RUN_MIGRATIONS=true
NODE_ENV=production
FRONTEND_URL=https://temporary-url.vercel.app
```

7. Click **Settings** → Set **Root Directory** to `backend`
8. Click **Settings** → Set **Start Command** to `node src/server.js`
9. Wait for deployment (1-2 min)
10. **Copy your Railway URL** (e.g., `https://solchan-production.up.railway.app`)

## Step 3: Deploy Frontend to Vercel (3 minutes)

1. Go to **[Vercel.com](https://vercel.com/)**
2. Click **"Add New..."** → **"Project"**
3. Click **"Import Git Repository"**
4. Select your **solchan** repository
5. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - Leave build/output settings as default
6. Click **"Environment Variables"** and add:

```
VITE_API_URL=https://YOUR-RAILWAY-URL.up.railway.app/api
VITE_SUPABASE_URL=https://maliveusaqzbohvitvxt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hbGl2ZXVzYXF6Ym9odml0dnh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5OTYwODEsImV4cCI6MjA3ODU3MjA4MX0.PZHI7JVwIqaVkG23TpIemtYfHF1fLsCNEJE_d6Tj2W8
```

**Important**: Replace `YOUR-RAILWAY-URL` with your actual Railway URL from Step 2!

7. Click **"Deploy"**
8. Wait for deployment (2-3 min)
9. **Copy your Vercel URL** (e.g., `https://solchan.vercel.app`)

## Step 4: Update Backend CORS (1 minute)

1. Go back to **Railway dashboard**
2. Click your backend project
3. Click **"Variables"**
4. Update `FRONTEND_URL` to your Vercel URL:
   ```
   FRONTEND_URL=https://YOUR-VERCEL-URL.vercel.app
   ```
5. Click **"Redeploy"** (or it will auto-redeploy)

## Step 5: Test! (1 minute)

1. Visit your Vercel URL: `https://YOUR-APP.vercel.app`
2. Click **[Create a Community]**
3. Fill in:
   - Ticker: TEST
   - Coin Name: Test Coin
   - Contract Address: `FnztNpf8DFKjd4DCiPK1Ne7bn6ZCPjyUPhsc7Amhpump`
   - Description: Testing deployment!
4. Click **"Create Community"**
5. Post a message!
6. Open in another browser/tab → messages should sync in real-time ⚡

## ✅ You're Live!

- **Frontend**: https://YOUR-APP.vercel.app
- **Backend**: https://YOUR-BACKEND.up.railway.app
- **Database**: Supabase (already configured)

## Troubleshooting

### "Network Error" when creating community
- Check `VITE_API_URL` in Vercel environment variables
- Make sure it points to your Railway URL with `/api` at the end
- Redeploy frontend after fixing

### "CORS Error"
- Check `FRONTEND_URL` in Railway environment variables
- Make sure it matches your Vercel URL exactly (no trailing slash)
- Redeploy backend after fixing

### Backend not starting
- Check Railway logs: Dashboard → Deployments → Logs
- Verify all environment variables are set
- Check `DATABASE_URL` is correct

### Can't see new communities
- Wait 5 minutes (cache TTL)
- Refresh the page
- Check browser console for errors

## Next Steps

1. **Custom Domain** (optional)
   - Vercel: Settings → Domains
   - Railway: Settings → Domains

2. **Enable Real Auth** (when ready)
   - See [DEPLOYMENT.md](DEPLOYMENT.md) for instructions
   - Search codebase for `TEMPORARY` comments

3. **Monitor Performance**
   - Railway: Dashboard → Metrics
   - Vercel: Analytics tab

4. **Add More Features**
   - Reply threading
   - Image uploads in messages
   - User profiles
   - Community moderators

## Cost Estimate

- **Railway**: Free tier ($5 credit/month)
- **Vercel**: Free tier (generous limits)
- **Supabase**: Free tier (500MB database, 1GB storage)
- **Total**: $0/month for low traffic 💰

Enjoy your deployed app! 🎉

