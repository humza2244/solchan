import express from 'express'
import multer from 'multer'
import rateLimit from 'express-rate-limit'
import { autoModerator } from '../middleware/automod.js'
import {
  createThreadHandler,
  uploadThreadImageHandler,
  getThreadsHandler,
  getThreadHandler,
  addReplyHandler,
  uploadReplyImageHandler,
} from '../controllers/threadController.js'

const router = express.Router()

// Configure multer for image uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  },
})

// Stricter rate limits for creation endpoints
const createLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { error: 'Thread creation limit reached. Try again in a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})

const replyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: { error: 'Too many replies. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// GET /api/communities/:communityId/threads - Get all threads for a community
router.get('/communities/:communityId/threads', getThreadsHandler)

// POST /api/communities/:communityId/threads - Create a new thread
router.post('/communities/:communityId/threads', createLimiter, autoModerator, createThreadHandler)

// POST /api/threads/:threadId/image - Upload image for a thread
router.post('/threads/:threadId/image', upload.single('image'), uploadThreadImageHandler)

// GET /api/threads/:threadId - Get a single thread with all replies
router.get('/threads/:threadId', getThreadHandler)

// POST /api/threads/:threadId/replies - Add a reply to a thread (with optional image)
router.post('/threads/:threadId/replies', replyLimiter, autoModerator, upload.single('image'), addReplyHandler)

// POST /api/replies/:replyId/image - Upload image for a reply
router.post('/replies/:replyId/image', upload.single('image'), uploadReplyImageHandler)

// GET /api/users/:author/posts — Get post history for a user
router.get('/users/:author/posts', async (req, res) => {
  try {
    const { author } = req.params
    const limit = Math.min(parseInt(req.query.limit) || 50, 100)
    
    const { getPostsByAuthor } = await import('../services/threadService.js')
    const posts = await getPostsByAuthor(decodeURIComponent(author), limit)
    res.json(posts)
  } catch (error) {
    console.error('Error fetching user posts:', error.message)
    res.status(500).json({ error: 'Failed to fetch user posts' })
  }
})

// Like rate limiter
const likeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: { error: 'Too many likes. Slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// POST /api/threads/:threadId/like — Toggle like on a thread
router.post('/threads/:threadId/like', likeLimiter, async (req, res) => {
  try {
    const { threadId } = req.params
    const userId = req.headers['x-user-id'] || req.ip
    const { toggleLike } = await import('../services/threadService.js')
    const result = await toggleLike('threads', threadId, userId)
    res.json(result)
  } catch (error) {
    console.error('Error toggling thread like:', error.message)
    res.status(500).json({ error: 'Failed to toggle like' })
  }
})

// POST /api/replies/:replyId/like — Toggle like on a reply
router.post('/replies/:replyId/like', likeLimiter, async (req, res) => {
  try {
    const { replyId } = req.params
    const userId = req.headers['x-user-id'] || req.ip
    const { toggleLike } = await import('../services/threadService.js')
    const result = await toggleLike('replies', replyId, userId)
    res.json(result)
  } catch (error) {
    console.error('Error toggling reply like:', error.message)
    res.status(500).json({ error: 'Failed to toggle like' })
  }
})

export default router
