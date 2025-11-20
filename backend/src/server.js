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
import { getCommunityById, getMessages, addMessage } from './services/communityService.js'
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
  console.log('User connected:', socket.id)

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
      console.log(`User ${socket.id} joined community: ${communityId}`)
    
    // Send recent messages to the newly connected user
      const messages = await getMessages(communityId, 50)
      socket.emit('messages', messages.map(m => m.toJSON()))
    } catch (error) {
      console.error('Error joining community:', error)
      socket.emit('error', { message: 'Failed to load messages' })
    }
  })

  // Leave a community room
  socket.on('leave-community', (communityId) => {
    socket.leave(communityId)
    console.log(`User ${socket.id} left community: ${communityId}`)
  })

  // Handle new message (requires authentication)
  socket.on('new-message', async (data) => {
    const { communityId, content, author } = data
    
    if (!authenticatedUserId) {
      socket.emit('error', { message: 'Authentication required to send messages' })
      return
    }
    
    if (!communityId || !content) {
      socket.emit('error', { message: 'Community ID and content are required' })
      return
    }

    // Validate content length
    if (content.trim().length === 0 || content.length > 5000) {
      socket.emit('error', { message: 'Message content must be between 1 and 5000 characters' })
      return
    }

    try {
      // Add message
      const message = await addMessage(communityId, {
        content: content.trim(),
        author: author || 'Anonymous',
      }, authenticatedUserId)
      
      // Fetch username for the authenticated user
      const userProfile = await getUserProfile(authenticatedUserId)
      if (userProfile) {
        message.username = userProfile.username
      }
      
      // Invalidate popular communities cache
      invalidatePopularCoinsCache()
      
      // Broadcast to all users in the community room
      io.to(communityId).emit('message', message.toJSON())
    } catch (error) {
      console.error('Error handling new message:', error)
      socket.emit('error', { message: 'Failed to send message' })
    }
  })

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
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
