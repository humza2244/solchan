# Solchan - Uncensored Memecoin Community Platform

An uncensored, 4chan-style community platform specifically designed for memecoin holders and traders. Search for any cryptocurrency by contract address to join or create communities. Chat in real-time, share alpha, and engage in unfiltered discussions.

## Features

- 🔍 **Search by Ticker or Contract Address** - Find communities for any cryptocurrency
- 💬 **Real-time Chat** - Live messaging with Socket.IO
- 🎨 **4chan-Inspired UI** - Authentic board aesthetics
- 🏷️ **Multiple Communities per Coin** - Create competing communities for the same token
- 📊 **Popularity Rankings** - Communities ranked by activity and engagement
- 🖼️ **Image Uploads** - Community images stored in Supabase
- 🔐 **User Authentication** - Powered by Supabase Auth (currently bypassed for testing)
- 📈 **Real-time Stats** - Message counts, unique users, and activity tracking

## Tech Stack

### Frontend
- React 18 with Vite
- React Router for navigation
- Socket.IO client for real-time messaging
- Axios for HTTP requests
- Supabase for authentication
- 4chan-inspired CSS

### Backend
- Node.js + Express
- Socket.IO for WebSocket connections
- PostgreSQL (Supabase)
- Supabase Storage for images
- JWT authentication (currently bypassed)

## Local Development

### Prerequisites
- Node.js 18+
- npm or yarn
- PostgreSQL database (or Supabase account)

### Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd chan-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Backend (`backend/.env`):
   ```bash
   DATABASE_URL=postgresql://postgres:password@host:5432/database
   FRONTEND_URL=http://localhost:3000
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   PORT=5001
   RUN_MIGRATIONS=true
   ```

   Frontend (`frontend/.env`):
   ```bash
   VITE_API_URL=http://localhost:5001/api
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Run database migrations**
   ```bash
   cd backend
   npm run migrate
   ```

5. **Start development servers**
   ```bash
   # From root directory
   npm run dev
   ```

   This starts both frontend (port 3000) and backend (port 5001).

6. **Visit the app**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5001/api

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions to Railway and Vercel.

**Quick Deploy:**
- **Backend**: Railway (recommended for Socket.IO)
- **Frontend**: Vercel
- **Database**: Supabase (already hosted)
- **Storage**: Supabase Storage

## Project Structure

```
chan-app/
├── backend/
│   ├── src/
│   │   ├── config/          # Database, migrations, Supabase
│   │   ├── controllers/     # API request handlers
│   │   ├── middleware/      # Auth middleware
│   │   ├── models/          # Data models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Caching utilities
│   │   └── server.js        # Express + Socket.IO server
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── context/         # Auth context
│   │   ├── pages/           # Page components
│   │   ├── services/        # API client, Socket.IO
│   │   ├── styles/          # CSS
│   │   └── App.jsx
│   └── package.json
└── package.json             # Root workspace config
```

## API Endpoints

### Communities
- `GET /api/communities` - Get all/popular communities
- `GET /api/communities/search?q=ticker` - Search communities
- `GET /api/communities/:id` - Get community with messages
- `POST /api/communities` - Create community (auth required*)
- `POST /api/communities/:id/image` - Upload image (auth required*)

### Messages
- `POST /api/communities/:id/messages` - Post message (auth required*)

*Currently bypassed for testing

## WebSocket Events

### Client → Server
- `authenticate` - Authenticate socket connection
- `join-community` - Join a community room
- `leave-community` - Leave a community room
- `new-message` - Send a new message

### Server → Client
- `authenticated` - Authentication successful
- `messages` - Initial messages when joining
- `message` - New message broadcast
- `error` - Error occurred

## Database Schema

### Communities Table
- `id` - UUID primary key
- `ticker` - Token symbol
- `coin_name` - Full token name
- `contract_address` - Blockchain address
- `description` - Community description
- `image_url` - Community image URL
- `created_at` - Creation timestamp
- `message_count` - Total messages
- `unique_users_count` - Unique user count
- `last_message_at` - Last activity timestamp

### Messages Table
- `id` - Bigint primary key
- `post_number` - Sequential post number
- `community_id` - Foreign key to communities
- `content` - Message content
- `user_id` - Foreign key to users
- `author` - Display name
- `created_at` - Creation timestamp

## Development Notes

### Authentication Bypass
Authentication is currently bypassed for testing. All API calls use a mock user ID. Search for `TEMPORARY` comments in the code to find bypassed sections.

To re-enable auth:
1. Uncomment auth code in `backend/src/middleware/auth.js`
2. Uncomment auth code in `backend/src/server.js`
3. Uncomment auth code in `frontend/src/context/AuthContext.jsx`
4. Uncomment protected route logic in `frontend/src/App.jsx`

### Database Migrations
Migrations run automatically on server start if `RUN_MIGRATIONS=true`. To run manually:
```bash
cd backend
npm run migrate
```

### Caching
Popular communities are cached for 5 minutes to improve performance. Cache is automatically invalidated when new messages are posted.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - feel free to use this project however you want!

## Support

For issues and questions:
- Open a GitHub issue
- Check [DEPLOYMENT.md](DEPLOYMENT.md) for deployment help
- Check [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) for technical details

## Acknowledgments

- Inspired by 4chan's board system
- Built for the memecoin trading community
- No moderation, pure chaos 🚀
