import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import helmet from 'helmet'
import path from 'path'
import { fileURLToPath } from 'url'
import { createServer } from 'http'
import { Server } from 'socket.io'
import rateLimit from 'express-rate-limit'
import compression from 'compression'
import communityRoutes from './routes/communityRoutes.js'
import userProfileRoutes from './routes/userProfileRoutes.js'
import threadRoutes from './routes/threadRoutes.js'
import authRoutes from './routes/authRoutes.js'
import moderationRoutes from './routes/moderationRoutes.js'
import { authenticateUser } from './middleware/auth.js'
import { getMessages, addMessage } from './services/communityService.js'
import { getRepliesByThread, addReply } from './services/threadService.js'
import { initializeFirebase, getDb } from './config/firebase.js'
import { invalidatePopularCoinsCache } from './utils/cache.js'
import { setSocketIO } from './services/socketService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const httpServer = createServer(app)

// CORS configuration — allow configured origins + all vercel.app previews
const configuredOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',').map(s => s.trim())

const corsOptions = {
  origin: (origin, callback) => {
    // Allow same-origin and server-to-server requests
    if (!origin) return callback(null, true)
    // Allow localhost in any form
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) return callback(null, true)
    // Allow any vercel.app deployment (covers preview deployments)
    if (origin.endsWith('.vercel.app')) return callback(null, true)
    // Allow solchan.fun
    if (origin === 'https://solchan.fun' || origin === 'https://www.solchan.fun') return callback(null, true)
    // Allow explicitly configured origins
    if (configuredOrigins.includes(origin)) return callback(null, true)
    // Block everything else
    console.warn('CORS blocked origin:', origin)
    callback(new Error('Not allowed by CORS'))
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      if (origin.startsWith('http://localhost')) return callback(null, true)
      if (origin.endsWith('.vercel.app')) return callback(null, true)
      if (origin === 'https://solchan.fun' || origin === 'https://www.solchan.fun') return callback(null, true)
      if (configuredOrigins.includes(origin)) return callback(null, true)
      callback(new Error('Not allowed'))
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  maxHttpBufferSize: 50_000, // 50KB max per WS message (prevents payload abuse)
  pingTimeout: 30_000,
  pingInterval: 25_000,
})

setSocketIO(io)

const PORT = process.env.PORT || 5001

// Trust proxy for Railway/production environments
if (process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT) {
  app.set('trust proxy', 1)
}

// Compression — gzip all responses
app.use(compression())

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}))

// Rate limiting — generous for reads, tighter for writes
const readLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 300, // 300 GETs/min per IP — plenty for homepage (fires 4 at once)
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})

const writeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30, // 30 POSTs/min per IP
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// Middleware
app.use(cors(corsOptions))
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))
app.use('/api/', (req, res, next) => {
  if (req.method === 'GET') return readLimiter(req, res, next)
  return writeLimiter(req, res, next)
})

// Serve uploaded images statically (for local dev without R2)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// Routes
app.use('/api/communities', authenticateUser, communityRoutes)
app.use('/api/profile', userProfileRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/mod', moderationRoutes)
app.use('/api', authenticateUser, threadRoutes)

// NOTE: Admin clear-data endpoint removed for production security.

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const db = getDb()
    res.json({
      status: 'ok',
      message: 'Server is running',
      database: 'firestore',
    })
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Server is running but Firestore connection failed',
    })
  }
})

// Stats endpoint (cached for 60 seconds)
let statsCache = null
let statsCacheTime = 0
const STATS_CACHE_TTL = 60000 // 60 seconds

app.get('/api/stats', async (req, res) => {
  try {
    const now = Date.now()
    if (statsCache && (now - statsCacheTime) < STATS_CACHE_TTL) {
      return res.json(statsCache)
    }

    const db = getDb()
    // Use count() aggregation if available, otherwise use select() for efficiency
    const [commSnap, threadSnap, replySnap] = await Promise.all([
      db.collection('communities').select().get(),
      db.collection('threads').select().get(),
      db.collection('replies').select().get(),
    ])
    
    statsCache = {
      communities: commSnap.size,
      threads: threadSnap.size,
      replies: replySnap.size,
    }
    statsCacheTime = now
    
    res.json(statsCache)
  } catch (error) {
    res.json(statsCache || { communities: 0, threads: 0, replies: 0 })
  }
})

// ===== Anti-spam helpers (in-memory, per-socket) =====
// Map: socketId -> { count, windowStart, recentContents: Map<content, timestamp> }
const socketMsgState = new Map()
const MSG_RATE_LIMIT = 5      // max messages per window
const MSG_WINDOW_MS = 10000   // 10 seconds
const DEDUP_WINDOW_MS = 30000 // 30 seconds — same content from same socket is rejected
const MIN_MSG_LENGTH = 2

// Periodic cleanup of orphaned socketMsgState entries (runs every 60s)
setInterval(() => {
  const now = Date.now()
  const connectedIds = new Set()
  for (const [id] of io.sockets.sockets) connectedIds.add(id)
  for (const [socketId, state] of socketMsgState) {
    if (!connectedIds.has(socketId)) socketMsgState.delete(socketId)
  }
  // Hard cap: if somehow still huge, prune oldest
  if (socketMsgState.size > 20000) {
    const entries = [...socketMsgState.entries()]
    entries.sort((a, b) => a[1].windowStart - b[1].windowStart)
    for (let i = 0; i < entries.length - 10000; i++) {
      socketMsgState.delete(entries[i][0])
    }
  }
}, 60_000)

const checkSpam = (socketId, content) => {
  const now = Date.now()
  let state = socketMsgState.get(socketId)
  if (!state) {
    state = { count: 0, windowStart: now, recentContents: new Map() }
    socketMsgState.set(socketId, state)
  }

  // Reset window
  if (now - state.windowStart > MSG_WINDOW_MS) {
    state.count = 0
    state.windowStart = now
  }

  // Rate limit
  if (state.count >= MSG_RATE_LIMIT) {
    return { spam: true, reason: 'Rate limit: slow down! Max 5 messages per 10 seconds.' }
  }

  // Duplicate content check
  const normalised = content.trim().toLowerCase()
  const lastSent = state.recentContents.get(normalised)
  if (lastSent && (now - lastSent) < DEDUP_WINDOW_MS) {
    return { spam: true, reason: 'Duplicate: same message sent recently.' }
  }

  // Passed — record
  state.count++
  state.recentContents.set(normalised, now)

  // Prune old entries
  for (const [k, t] of state.recentContents) {
    if (now - t > DEDUP_WINDOW_MS * 2) state.recentContents.delete(k)
  }

  return { spam: false }
}

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(' User connected:', socket.id)

  // Join a community room
  socket.on('join-community', async (communityId) => {
    try {
      socket.join(communityId)
      const messages = await getMessages(communityId, 50)
      socket.emit('messages', messages.map(m => m.toJSON()))
      // Broadcast user count
      const room = io.sockets.adapter.rooms.get(communityId)
      io.to(communityId).emit('user-count', room ? room.size : 1)
    } catch (error) {
      console.error('Error joining community:', error.message)
      socket.emit('error', { message: 'Failed to load messages' })
    }
  })

  // Leave a community room
  socket.on('leave-community', (communityId) => {
    socket.leave(communityId)
    // Broadcast updated user count
    setTimeout(() => {
      const room = io.sockets.adapter.rooms.get(communityId)
      io.to(communityId).emit('user-count', room ? room.size : 0)
    }, 100)
  })

  // Handle new message (anonymous)
  socket.on('new-message', async (data) => {
    const { communityId, content, author } = data

    if (!communityId || !content) {
      socket.emit('error', { message: 'Community ID and content are required' })
      return
    }

    const trimmed = content.trim()
    if (trimmed.length < MIN_MSG_LENGTH || trimmed.length > 5000) {
      socket.emit('error', { message: `Message must be ${MIN_MSG_LENGTH}–5000 characters` })
      return
    }

    // Anti-spam check
    const spamCheck = checkSpam(socket.id, trimmed)
    if (spamCheck.spam) {
      socket.emit('error', { message: spamCheck.reason })
      return
    }

    try {
      const message = await addMessage(communityId, {
        content: trimmed,
        author: author || 'Anonymous',
      }, null)

      invalidatePopularCoinsCache()
      io.to(communityId).emit('message', message.toJSON())
    } catch (error) {
      console.error('Error handling message:', error.message)
      socket.emit('error', { message: 'Failed to send message' })
    }
  })

  // Join a thread room
  socket.on('join-thread', async (threadId) => {
    try {
      socket.join(`thread-${threadId}`)
      const replies = await getRepliesByThread(threadId, 500)
      socket.emit('thread-replies', replies.map(r => r.toJSON()))
      // Broadcast user count to thread
      const room = io.sockets.adapter.rooms.get(`thread-${threadId}`)
      io.to(`thread-${threadId}`).emit('thread-user-count', room ? room.size : 1)
    } catch (error) {
      console.error('Error joining thread:', error.message)
      socket.emit('error', { message: 'Failed to load replies' })
    }
  })

  // Leave a thread room
  socket.on('leave-thread', (threadId) => {
    socket.leave(`thread-${threadId}`)
  })

  // Handle new reply to a thread
  socket.on('new-reply', async (data) => {
    const { threadId, content, author, imageUrl } = data

    if (!threadId || !content) {
      socket.emit('error', { message: 'Thread ID and content are required' })
      return
    }

    const trimmed = content.trim()
    if (trimmed.length < MIN_MSG_LENGTH || trimmed.length > 5000) {
      socket.emit('error', { message: `Reply must be ${MIN_MSG_LENGTH}–5000 characters` })
      return
    }

    // Anti-spam check
    const spamCheck = checkSpam(socket.id, trimmed)
    if (spamCheck.spam) {
      socket.emit('error', { message: spamCheck.reason })
      return
    }

    try {
      const reply = await addReply(threadId, {
        content: trimmed,
        author: author || 'Anonymous',
        imageUrl: imageUrl || null,
      })

      invalidatePopularCoinsCache()
      io.to(`thread-${threadId}`).emit('thread-reply', reply.toJSON())
    } catch (error) {
      console.error('Error handling reply:', error.message)
      socket.emit('error', { message: 'Failed to send reply' })
    }
  })

  socket.on('disconnect', () => {
    // Clean up spam state when socket disconnects
    socketMsgState.delete(socket.id)
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.message)
  res.status(500).json({ error: 'Something went wrong!' })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Initialize Firebase and start server
const startServer = async () => {
  try {
    // Initialize Firebase/Firestore
    initializeFirebase()

    httpServer.listen(PORT, () => {
      console.log(` Server running on http://localhost:${PORT}`)
      console.log(` WebSocket server ready`)
      console.log(` Firestore connected`)

      // Keepalive: self-ping every 4 minutes to prevent Render/Railway from sleeping
      const KEEPALIVE_URL = process.env.RENDER_EXTERNAL_URL || process.env.RAILWAY_PUBLIC_DOMAIN
        ? `https://${process.env.RENDER_EXTERNAL_URL || process.env.RAILWAY_PUBLIC_DOMAIN}/api/health`
        : null
      if (KEEPALIVE_URL) {
        setInterval(() => {
          fetch(KEEPALIVE_URL).catch(() => {})
        }, 4 * 60 * 1000) // every 4 minutes
        console.log(` Keepalive enabled → ${KEEPALIVE_URL}`)
      } else {
        // Fallback: ping localhost
        setInterval(() => {
          fetch(`http://localhost:${PORT}/api/health`).catch(() => {})
        }, 4 * 60 * 1000)
        console.log(` Keepalive enabled (localhost)`)
      }
    })
  } catch (error) {
    console.error(' Failed to start server:', error)
    process.exit(1)
  }
}

// Graceful shutdown — drain sockets and close cleanly
const shutdown = (signal) => {
  console.log(`\n${signal} received — shutting down gracefully...`)
  // Stop accepting new connections
  io.close(() => {
    console.log(' Socket.IO closed')
  })
  httpServer.close(() => {
    console.log(' HTTP server closed')
    process.exit(0)
  })
  // Force kill after 10s if something hangs
  setTimeout(() => {
    console.error(' Forced shutdown after timeout')
    process.exit(1)
  }, 10_000)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

startServer()
