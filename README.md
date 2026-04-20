# solchan

An anonymous imageboard for memecoin communities. Every coin gets its own board — no sign-up required, just find your coin and start posting.

**Live → [solchan.fun](https://solchan.fun)**

---

## What it is

Solchan is a 4chan-style forum built specifically for Solana memecoin communities. Each community is organized around a coin's contract address. Anyone can browse and post anonymously. Registered users get extra features like moderation, bookmarks, and account linking.

**Core features**

- Anonymous posting — no account needed
- Real-time threads and replies via WebSocket
- Community live chat with spam protection
- Image uploads on thread creation and replies
- Thread pinning, locking, quoting, and formatting
- Catalog view (grid) and list view
- Dark mode
- King of the Hill — most active community gets crowned

**Community features**

- Create a community without a CA — add the contract address later once the token launches
- One CA per coin enforced globally
- Join communities, bookmark boards, watch threads
- Community rules set by the creator
- Live user count per community

**Moderation**

- Creator + mod system with role management
- Delete threads, replies, and live chat messages
- Ban and unban users with optional duration
- Warn users with a log in the mod panel
- Report system with dismiss/resolve
- CTO (Community Takeover) — if a team goes inactive, the community can vote to install a new creator

**Auth (optional)**

- Email/password accounts
- X (Twitter) login and account linking
- Logged-in users can post with their username or stay anonymous

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Database | Firebase Firestore |
| Auth | Firebase Auth |
| Realtime | Socket.IO |
| Storage | Cloudflare R2 (or base64 in Firestore) |
| Hosting | Render |

---

## Running locally

**Requirements:** Node.js 18+, a Firebase project

```bash
# Clone
git clone https://github.com/realdoomsman/solchan
cd solchan

# Install all workspaces
npm install

# Backend env
cp backend/.env.example backend/.env
# Fill in your Firebase service account key path and other env vars

# Start both frontend + backend
npm run dev
```

Frontend runs on `http://localhost:3000`  
Backend runs on `http://localhost:5001`

---

## Environment variables

**Backend (`backend/.env`)**

```
PORT=5001
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
CLOUDFLARE_R2_ACCESS_KEY=
CLOUDFLARE_R2_SECRET_KEY=
CLOUDFLARE_R2_BUCKET=
CLOUDFLARE_R2_ENDPOINT=
```

**Frontend (`frontend/.env`)**

```
VITE_API_URL=http://localhost:5001/api
```

> The Firebase client config in `frontend/src/config/firebase.js` is intentionally public — Firebase security is enforced by Firestore rules, not by keeping this key hidden.

---

## Project structure

```
solchan/
├── frontend/          React + Vite app
│   └── src/
│       ├── components/   Layout, ModPanel, CTOPanel, ...
│       ├── context/      AuthContext
│       ├── pages/        Thread, CommunityThreadList, ...
│       └── services/     API, socket
│
└── backend/           Express API + WebSocket server
    └── src/
        ├── controllers/
        ├── models/
        ├── routes/
        └── services/
```

---

## License

MIT
