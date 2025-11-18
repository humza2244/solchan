# Deployment Guide for Solchan

## Quick Deploy

### 1. Deploy Backend to Railway (Recommended for Socket.IO)

Railway is better than Vercel for WebSocket/Socket.IO applications.

1. Go to [Railway.app](https://railway.app/)
2. Sign in with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select this repository
5. Railway will auto-detect the backend
6. Add environment variables in Railway dashboard:
   ```
   DATABASE_URL=postgresql://postgres:Kirkland%402244@db.maliveusaqzbohvitvxt.supabase.co:5432/postgres
   FRONTEND_URL=https://your-frontend-url.vercel.app
   SUPABASE_URL=https://maliveusaqzbohvitvxt.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hbGl2ZXVzYXF6Ym9odml0dnh0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjk5NjA4MSwiZXhwIjoyMDc4NTcyMDgxfQ.091KuP5ZDb6xL03sdSsbfvUgGTOLLrOgDR2LB3VVA7k
   PORT=5001
   RUN_MIGRATIONS=true
   NODE_ENV=production
   ```
7. Set root directory to `backend`
8. Railway will deploy automatically
9. Copy the Railway URL (e.g., `https://your-app.up.railway.app`)

### 2. Deploy Frontend to Vercel

1. Go to [Vercel.com](https://vercel.com/)
2. Click "New Project"
3. Import from GitHub
4. Select this repository
5. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. Add environment variables:
   ```
   VITE_API_URL=https://your-backend.up.railway.app/api
   VITE_SUPABASE_URL=https://maliveusaqzbohvitvxt.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hbGl2ZXVzYXF6Ym9odml0dnh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5OTYwODEsImV4cCI6MjA3ODU3MjA4MX0.PZHI7JVwIqaVkG23TpIemtYfHF1fLsCNEJE_d6Tj2W8
   ```
7. Click "Deploy"
8. After deployment, copy the Vercel URL
9. Go back to Railway and update `FRONTEND_URL` to your Vercel URL

### 3. Update Supabase Storage CORS (Important!)

In your Supabase dashboard:
1. Go to Storage → Settings
2. Add CORS policy:
   ```json
   {
     "allowedOrigins": [
       "https://your-frontend.vercel.app",
       "http://localhost:3000"
     ],
     "allowedMethods": ["GET", "POST", "PUT", "DELETE"],
     "allowedHeaders": ["*"],
     "exposedHeaders": ["ETag"],
     "maxAgeSeconds": 3600
   }
   ```

## Alternative: Deploy Backend to Render

If you prefer Render over Railway:

1. Go to [Render.com](https://render.com/)
2. New → Web Service
3. Connect GitHub repository
4. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js`
5. Add environment variables (same as Railway)
6. Deploy

## Alternative: Deploy Backend to Vercel (Not Recommended for Socket.IO)

**Note**: Vercel serverless functions have limitations with WebSocket/Socket.IO. Railway or Render are better choices.

If you still want to try Vercel for backend:
1. The `backend/vercel.json` is already configured
2. Deploy from Vercel dashboard
3. WebSocket features may not work properly

## Post-Deployment

1. Test the deployment:
   - Visit your frontend URL
   - Create a community
   - Post messages
   - Check real-time updates work

2. Monitor logs:
   - **Railway**: Dashboard → Deployments → Logs
   - **Vercel**: Dashboard → Deployments → Function Logs
   - **Render**: Dashboard → Logs

3. Update CORS if needed:
   - If you get CORS errors, update `FRONTEND_URL` in backend env vars

## Troubleshooting

### Backend not connecting
- Check environment variables are set correctly
- Check database URL is accessible
- Check Railway/Render logs for errors

### Frontend can't reach API
- Check `VITE_API_URL` points to correct backend URL
- Check CORS settings in backend
- Check browser console for errors

### WebSocket not working
- Use Railway or Render (not Vercel) for backend
- Check if backend supports WebSocket connections
- Check browser console for Socket.IO errors

### Database migration fails
- Run migration manually: `npm run migrate` in backend
- Check database URL is correct
- Check database has proper permissions

## Re-enable Authentication (When Ready)

Currently, authentication is bypassed for testing. To re-enable:

### Backend
1. **`backend/src/middleware/auth.js`**: Uncomment the original auth code
2. **`backend/src/server.js`**: Uncomment WebSocket auth code

### Frontend
1. **`frontend/src/context/AuthContext.jsx`**: Uncomment original Supabase auth
2. **`frontend/src/App.jsx`**: Uncomment ProtectedRoute logic
3. **`frontend/src/pages/CreateCommunity.jsx`**: Uncomment user checks
4. **`frontend/src/pages/Community.jsx`**: Uncomment auth requirements

Search for `TEMPORARY` comments in the codebase to find all bypassed auth sections.

## Environment Variables Summary

### Backend (Railway/Render)
```
DATABASE_URL=postgresql://...
FRONTEND_URL=https://your-app.vercel.app
SUPABASE_URL=https://...supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
PORT=5001
RUN_MIGRATIONS=true
NODE_ENV=production
```

### Frontend (Vercel)
```
VITE_API_URL=https://your-backend.up.railway.app/api
VITE_SUPABASE_URL=https://...supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## Custom Domain (Optional)

### Frontend (Vercel)
1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

### Backend (Railway)
1. Go to Settings → Domains
2. Add custom domain
3. Update DNS records
4. Update `FRONTEND_URL` in backend env vars
5. Update `VITE_API_URL` in frontend env vars

## Success!

Your app should now be live! 🚀

- Frontend: https://your-app.vercel.app
- Backend: https://your-backend.up.railway.app
- Database: Supabase (already configured)
- Storage: Supabase (already configured)

