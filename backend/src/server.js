import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { createServer } from 'http'
import { Server } from 'socket.io'
import rateLimit from 'express-rate-limit'
import communityRoutes from './routes/communityRoutes.js'
import coinRoutes from './routes/coinRoutes.js'
import userProfileRoutes from './routes/userProfileRoutes.js'
import threadRoutes from './routes/threadRoutes.js'
import { getCommunityById, getMessages, addMessage } from './services/communityService.js'
import { getThreadById, getRepliesByThread, addReply } from './services/threadService.js'
import { getUserProfile } from './services/userProfileService.js'
import { connectDatabase, query } from './config/database.js'
import { migrate } from './config/migrate.js'
import { invalidatePopularCoinsCache } from './utils/cache.js'
import { supabaseAdmin } from './config/supabase.js'

const app = express()
const httpServer = createServer(app)

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT'],
  credentials: true,
}

const io = new Server(httpServer, {
  cors: corsOptions,
})

const PORT = process.env.PORT || 5001

// Trust proxy for Railway/production environments
// This is required for rate limiting to work correctly behind a proxy
if (process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT) {
  app.set('trust proxy', 1)
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
})

const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 messages per minute
  message: 'Too many messages, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
})

// Middleware
app.use(cors(corsOptions))
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/api/', limiter)

// Routes
app.use('/api/communities', communityRoutes)
app.use('/api/coins', coinRoutes) // Keep for backwards compatibility
app.use('/api/profile', userProfileRoutes)
app.use('/api', threadRoutes) // Thread routes (includes /communities/:id/threads and /threads/:id)

// Health check with database status
app.get('/api/health', async (req, res) => {
  try {
    await query('SELECT 1')
    res.json({ 
      status: 'ok', 
      message: 'Server is running',
      database: 'connected'
    })
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Server is running but database connection failed',
      database: 'disconnected',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// WebSocket connection handling with authentication
io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id)
  console.log('   Transport:', socket.conn.transport.name)
  console.log('   Origin:', socket.handshake.headers.origin)

  let authenticatedUserId = null

  // Authenticate socket connection
  socket.on('authenticate', async (token) => {
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
      
      if (error || !user) {
        socket.emit('auth-error', { message: 'Invalid authentication token' })
        console.error('Socket auth failed:', error)
        return
      }
      
      authenticatedUserId = user.id
      socket.emit('authenticated', { userId: user.id })
      console.log(`User ${socket.id} authenticated as ${user.id}`)
    } catch (error) {
      console.error('Socket authentication error:', error)
      socket.emit('auth-error', { message: 'Authentication failed' })
    }
  })

  // Join a community room
  socket.on('join-community', async (communityId) => {
    try {
      socket.join(communityId)
      console.log(`🚪 User ${socket.id} joined community: ${communityId}`)
    
    // Send recent messages to the newly connected user
      const messages = await getMessages(communityId, 50)
      console.log(`📬 Sending ${messages.length} messages to ${socket.id}`)
      socket.emit('messages', messages.map(m => m.toJSON()))
    } catch (error) {
      console.error('❌ Error joining community:', error)
      socket.emit('error', { message: 'Failed to load messages' })
    }
  })

  // Leave a community room
  socket.on('leave-community', (communityId) => {
    socket.leave(communityId)
    console.log(`User ${socket.id} left community: ${communityId}`)
  })

  // Handle new message (anonymous - no auth required)
  socket.on('new-message', async (data) => {
    console.log('📨 Received new-message event:', { communityId: data.communityId, contentLength: data.content?.length, author: data.author })
    
    const { communityId, content, author } = data
    
    if (!communityId || !content) {
      console.error('❌ Missing communityId or content')
      socket.emit('error', { message: 'Community ID and content are required' })
      return
    }

    // Validate content length
    if (content.trim().length === 0 || content.length > 5000) {
      console.error('❌ Invalid content length:', content.length)
      socket.emit('error', { message: 'Message content must be between 1 and 5000 characters' })
      return
    }

    try {
      console.log('💾 Attempting to save message to database...')
      // Add message (anonymous - no user ID)
      const message = await addMessage(communityId, {
        content: content.trim(),
        author: author || 'Anonymous',
      }, null)
      
      console.log('✅ Message saved successfully:', message.toJSON())
      
      // Invalidate popular communities cache
      invalidatePopularCoinsCache()
      
      // Broadcast to all users in the community room
      io.to(communityId).emit('message', message.toJSON())
      console.log('📤 Message broadcasted to community:', communityId)
    } catch (error) {
      console.error('❌ Error handling new message:', error)
      console.error('Error details:', error.message, error.stack)
      socket.emit('error', { message: 'Failed to send message: ' + error.message })
    }
  })

  // Join a thread room
  socket.on('join-thread', async (threadId) => {
    try {
      socket.join(`thread-${threadId}`)
      console.log(`🧵 User ${socket.id} joined thread: ${threadId}`)
      
      // Send recent replies to the newly connected user
      const replies = await getRepliesByThread(threadId, 1000)
      console.log(`📬 Sending ${replies.length} replies to ${socket.id}`)
      socket.emit('thread-replies', replies.map(r => r.toJSON()))
    } catch (error) {
      console.error('❌ Error joining thread:', error)
      socket.emit('error', { message: 'Failed to load replies' })
    }
  })

  // Leave a thread room
  socket.on('leave-thread', (threadId) => {
    socket.leave(`thread-${threadId}`)
    console.log(`🧵 User ${socket.id} left thread: ${threadId}`)
  })

  // Handle new reply to a thread
  socket.on('new-reply', async (data) => {
    console.log('📨 Received new-reply event:', { threadId: data.threadId, contentLength: data.content?.length, author: data.author, hasImage: !!data.imageUrl })
    
    const { threadId, content, author, imageUrl } = data
    
    if (!threadId || !content) {
      console.error('❌ Missing threadId or content')
      socket.emit('error', { message: 'Thread ID and content are required' })
      return
    }

    // Validate content length
    if (content.trim().length === 0 || content.length > 5000) {
      console.error('❌ Invalid content length:', content.length)
      socket.emit('error', { message: 'Reply content must be between 1 and 5000 characters' })
      return
    }

    try {
      console.log('💾 Attempting to save reply to database...')
      // Add reply (anonymous - no user ID)
      const reply = await addReply(threadId, {
        content: content.trim(),
        author: author || 'Anonymous',
        imageUrl: imageUrl || null, // Include imageUrl from WebSocket data
      })
      
      console.log('✅ Reply saved successfully:', reply.toJSON())
      
      // Invalidate popular communities cache (thread bumps affect community stats)
      invalidatePopularCoinsCache()
      
      // Broadcast to all users in the thread room
      io.to(`thread-${threadId}`).emit('thread-reply', reply.toJSON())
      console.log('📤 Reply broadcasted to thread:', threadId)
    } catch (error) {
      console.error('❌ Error handling new reply:', error)
      console.error('Error details:', error.message, error.stack)
      socket.emit('error', { message: 'Failed to send reply: ' + error.message })
    }
  })

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log('🔌 User disconnected:', socket.id, 'Reason:', reason)
  })
  
  // Log all events for debugging
  socket.onAny((eventName, ...args) => {
    console.log(`📡 Event received: ${eventName}`, args.length > 0 ? `with ${args.length} arg(s)` : '')
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Something went wrong!' })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Initialize database and start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase()
    
    // Run migrations
    if (process.env.RUN_MIGRATIONS !== 'false') {
      await migrate()
    }
    
    // Start server
httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`)
      console.log(`🔌 WebSocket server ready`)
      console.log(`📊 Database connected`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// Start the server
startServer()
