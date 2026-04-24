# CoinTalk

**The anonymous imageboard for memecoin communities.**

**Live → [cointalk.fun](https://cointalk.fun)**

---

## What is CoinTalk?

CoinTalk is a 4chan-style forum built specifically for memecoin communities. Each community is organized around a coin's ticker or contract address. Anyone can browse and post anonymously. Registered users get extra features like moderation, bookmarks, and watched threads.

## Features

- **Anonymous posting** — no sign-up required
- **Community boards** — one board per coin, organized by ticker/CA
- **King of the Hill** — most active community highlighted
- **Real-time chat** — live Socket.IO community chat
- **Moderation tools** — ban, delete, pin, lock, reports
- **Google login** — optional account with username
- **Image uploads** — Cloudflare R2 storage
- **Search** — by ticker or contract address

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite, deployed on Vercel |
| Backend | Node.js + Express, deployed on Render |
| Database | Firestore (Firebase) |
| Auth | Firebase Auth (Google + email) |
| Storage | Cloudflare R2 |
| Real-time | Socket.IO |

## Local Development

### Requirements
- Node.js 18+
- Firebase project with Firestore enabled
- (Optional) Cloudflare R2 bucket for image uploads

### Setup

```bash
git clone https://github.com/realdoomsman/cointalk
cd cointalk

# Install backend deps
cd backend && npm install

# Install frontend deps
cd ../frontend && npm install
```

### Environment Variables

**backend/.env**
```
PORT=5001
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...
R2_ENDPOINT_URL=https://...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=cointalk-images
R2_PUBLIC_URL=https://...
```

**frontend/.env**
```
VITE_API_URL=http://localhost:5001/api
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### Run

```bash
# Backend
cd backend && npm run dev

# Frontend (separate terminal)
cd frontend && npm run dev
```

## Project Structure

```
cointalk/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middleware/
│   │   └── server.js
│   └── scripts/
└── frontend/
    └── src/
        ├── pages/
        ├── components/
        ├── context/
        └── styles/
```

## Deployment

- **Frontend**: Vercel — auto-deploys on push to `main`
- **Backend**: Render — auto-deploys on push to `main`
- **Domain**: cointalk.fun → Vercel

## License

MIT
