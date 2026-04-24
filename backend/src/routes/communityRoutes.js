import express from 'express'
import multer from 'multer'
import rateLimit from 'express-rate-limit'
import { authenticateUser, requireAuth } from '../middleware/auth.js'
import {
  createCommunityHandler,
  updateCommunityCAHandler,
  searchCommunitiesHandler,
  getCommunityHandler,
  getCommunityMessagesHandler,
  createMessageHandler,
  getAllCommunitiesHandler,
  uploadCommunityImageHandler,
  getKOTHHandler,
  getCommunityMembersHandler,
  joinCommunityHandler,
  submitCTOHandler,
  voteCTOHandler,
  getCTOHandler,
} from '../controllers/communityController.js'

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
  max: 3,
  message: { error: 'Creation limit reached. Try again in a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})

const postLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: { error: 'Too many messages. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
})

const ctoLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Too many CTO requests. Please wait.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// GET /api/communities - Get all or popular communities
router.get('/', getAllCommunitiesHandler)

// GET /api/communities/search - Search communities by ticker or CA
router.get('/search', searchCommunitiesHandler)

// GET /api/communities/koth - Get King of the Hill (must be before /:id route)
router.get('/koth', getKOTHHandler)

// POST /api/communities - Create a new community (auth optional — CA also optional)
router.post('/', authenticateUser, createLimiter, createCommunityHandler)

// GET /api/communities/:id - Get community with messages
router.get('/:id', getCommunityHandler)

// PUT /api/communities/:id/ca - Set or update contract address (creator/mod only)
router.put('/:id/ca', requireAuth, updateCommunityCAHandler)

// GET /api/communities/:id/messages - Get messages for a community
router.get('/:id/messages', getCommunityMessagesHandler)

// GET /api/communities/:id/members - Get community members
router.get('/:id/members', getCommunityMembersHandler)

// POST /api/communities/:id/messages - Create a new message (anonymous)
router.post('/:id/messages', postLimiter, createMessageHandler)

// POST /api/communities/:id/image - Upload community image (anonymous)
router.post('/:id/image', createLimiter, upload.single('image'), uploadCommunityImageHandler)

// POST /api/communities/:id/join - Join community (anonymous)
router.post('/:id/join', postLimiter, joinCommunityHandler)

// ===== CTO Routes =====

// GET /api/communities/:id/cto - Get CTO requests
router.get('/:id/cto', getCTOHandler)

// POST /api/communities/:id/cto - Submit CTO request (auth required)
router.post('/:id/cto', requireAuth, ctoLimiter, submitCTOHandler)

// POST /api/communities/:id/cto/:requestId/vote - Vote on CTO request (auth required)
// POST /api/communities/:id/cto/:requestId/vote - Vote on CTO request (auth required)
router.post('/:id/cto/:requestId/vote', requireAuth, voteCTOHandler)

// ===== Report Route =====
// POST /api/communities/:id/report - Report a thread or reply
router.post('/:id/report', postLimiter, async (req, res) => {
  try {
    const { id } = req.params
    const { type, targetId, reason } = req.body
    if (!type || !targetId || !reason) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    const { getDb } = await import('../config/firebase.js')
    const db = getDb()
    await db.collection('reports').add({
      communityId: id,
      type,
      targetId,
      reason,
      reportedAt: new Date(),
      status: 'pending',
      reporterIp: req.ip || 'unknown',
    })
    res.json({ success: true })
  } catch (error) {
    console.error('Error saving report:', error.message)
    res.json({ success: true }) // Always return success to prevent info leaks
  }
})

export default router
