import express from 'express'
import multer from 'multer'
import rateLimit from 'express-rate-limit'
import {
  createCommunityHandler,
  searchCommunitiesHandler,
  getCommunityHandler,
  getCommunityMessagesHandler,
  createMessageHandler,
  getAllCommunitiesHandler,
  uploadCommunityImageHandler,
  getKOTHHandler,
  getCommunityMembersHandler,
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
  max: 15,
  message: { error: 'Too many messages. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// GET /api/communities - Get all or popular communities
router.get('/', getAllCommunitiesHandler)

// GET /api/communities/search - Search communities by ticker or CA
router.get('/search', searchCommunitiesHandler)

// GET /api/communities/koth - Get King of the Hill (must be before /:id route)
router.get('/koth', getKOTHHandler)

// POST /api/communities - Create a new community (anonymous)
router.post('/', createLimiter, createCommunityHandler)

// GET /api/communities/:id - Get community with messages
router.get('/:id', getCommunityHandler)

// GET /api/communities/:id/messages - Get messages for a community
router.get('/:id/messages', getCommunityMessagesHandler)

// GET /api/communities/:id/members - Get community members
router.get('/:id/members', getCommunityMembersHandler)

// POST /api/communities/:id/messages - Create a new message (anonymous)
router.post('/:id/messages', postLimiter, createMessageHandler)

// POST /api/communities/:id/image - Upload community image (anonymous)
router.post('/:id/image', createLimiter, upload.single('image'), uploadCommunityImageHandler)

export default router
