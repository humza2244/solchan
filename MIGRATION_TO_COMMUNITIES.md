# Migration to Communities System

## What Changed

### Major Changes
1. **Multiple communities per CA**: Users can now create competing communities for the same contract address
2. **User authentication**: Supabase Auth required to create communities and send messages
3. **Image uploads**: Communities can have images stored in Supabase Storage
4. **Search by ticker or CA**: Search returns multiple communities ranked by popularity
5. **Popularity algorithm**: Communities ranked by total messages + 24h messages + unique users

### Database Schema
- `coins` table → `communities` table
- Added fields: ticker, coin_name, description, image_url, creator_id, unique_users_count
- `messages` table now references `community_id` instead of `contract_address`
- Added `user_id` to messages table

## Backend Implementation (✅ Complete)

### New Files Created:
- `backend/src/config/supabase.js` - Supabase client configuration
- `backend/src/config/schema_v2.sql` - New database schema
- `backend/src/middleware/auth.js` - JWT authentication middleware
- `backend/src/models/Community.js` - Community model
- `backend/src/services/communityService.js` - Community business logic
- `backend/src/controllers/communityController.js` - API endpoints
- `backend/src/routes/communityRoutes.js` - Route definitions

### API Endpoints:
- `POST /api/communities` - Create community (auth required)
- `GET /api/communities/search?q=ticker_or_ca` - Search communities
- `GET /api/communities/:id` - Get community with messages
- `GET /api/communities/:id/messages` - Get community messages
- `POST /api/communities/:id/messages` - Send message (auth required)
- `POST /api/communities/:id/image` - Upload image (auth required)
- `GET /api/communities?popular=true` - Get popular communities

### WebSocket Events (Updated):
- `authenticate` - Authenticate socket connection with JWT
- `join-community` - Join a community room (by ID not CA)
- `leave-community` - Leave a community room
- `new-message` - Send message (requires authentication)

## Frontend Implementation (🚧 In Progress)

### Completed:
- ✅ Supabase Auth integration
- ✅ AuthContext for global auth state
- ✅ Sign In page
- ✅ Sign Up page
- ✅ Create Community form with image upload
- ✅ Package dependencies updated

### TODO:
- ❌ Update App.jsx with new routes and AuthProvider
- ❌ Update Home page with "Create Community" button and search
- ❌ Create CommunityList component to show search results
- ❌ Update Community page (replaces Coin page) to use community ID
- ❌ Update WebSocket connection with authentication
- ❌ Add auth styling to index.css
- ❌ Update Layout component with sign in/out buttons

## Environment Variables Needed

### Backend (.env):
```env
DATABASE_URL=postgresql://postgres:Kirkland%402244@db.maliveusaqzbohvitvxt.supabase.co:5432/postgres
FRONTEND_URL=http://localhost:3000
PORT=5001
RUN_MIGRATIONS=true

# Supabase (get from Supabase dashboard)
SUPABASE_URL=https://maliveusaqzbohvitvxt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Frontend (.env):
```env
VITE_API_URL=http://localhost:5001/api
VITE_SOCKET_URL=http://localhost:5001
VITE_SUPABASE_URL=https://maliveusaqzbohvitvxt.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Setup Instructions

### 1. Install Dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

### 2. Get Supabase Keys
1. Go to Supabase Dashboard
2. Select your project
3. Go to Settings > API
4. Copy:
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Create Supabase Storage Bucket
1. Go to Supabase Dashboard → Storage
2. Create new bucket: `community-images`
3. Make it public
4. Set file size limit: 5MB

### 4. Run Database Migration
The new schema will automatically run on server startup, but this will **DROP ALL EXISTING DATA**.

To migrate:
```bash
cd backend
npm run migrate
```

OR manually run `schema_v2.sql` in Supabase SQL Editor.

### 5. Start Development Servers
```bash
# From project root
npm run dev
```

## User Flow

### Creating a Community:
1. User signs up / signs in
2. Clicks "Create a Community" button
3. Fills form: ticker, name, CA, description, image
4. Community is created and user is redirected to it

### Searching for Communities:
1. User enters ticker or CA in search box
2. All matching communities are displayed
3. Sorted by popularity score
4. Click to join any community

### Sending Messages:
1. User must be signed in
2. WebSocket authenticates with JWT token
3. Messages include user_id
4. Real-time broadcasting to all users in room

## Breaking Changes

⚠️ **This is a breaking change!** Old data will be lost when running the new migration.

### What's Incompatible:
- Old `coins` table structure
- Old WebSocket events (join-coin → join-community)
- Old API endpoints (`/api/coins/:contractAddress` → `/api/communities/:id`)

### Migration Path:
If you need to preserve old data, you'll need to:
1. Export old coins and messages
2. Transform to new schema
3. Import into communities table

## Next Steps

1. **Finish frontend components** (see TODO list above)
2. **Add environment variables** to both backend and frontend
3. **Create Supabase Storage bucket**
4. **Test authentication flow**
5. **Test community creation**
6. **Test search functionality**
7. **Test real-time messaging**

## Notes

- Communities are now identified by UUID, not contract address
- Multiple communities can exist for the same CA
- Authentication is required for all write operations
- Images are stored in Supabase Storage (not database)
- Popularity algorithm: `(messages * 1) + (24h_messages * 5) + (unique_users * 10)`

