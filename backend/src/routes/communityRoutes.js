import express from 'express'
import multer from 'multer'
import {
  createCommunityHandler,
  searchCommunitiesHandler,
  getCommunityHandler,
  getCommunityMessagesHandler,
  createMessageHandler,
  getAllCommunitiesHandler,
  uploadCommunityImageHandler,
} from '../controllers/communityController.js'
import { authenticateUser } from '../middleware/auth.js'

const router = express.Router()

// Configure multer for image uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  },
})

// GET /api/communities - Get all or popular communities
router.get('/', getAllCommunitiesHandler)

// GET /api/communities/search - Search communities by ticker or CA
router.get('/search', searchCommunitiesHandler)

// POST /api/communities - Create a new community (requires auth)
router.post('/', authenticateUser, createCommunityHandler)

// GET /api/communities/:id - Get community with messages
router.get('/:id', getCommunityHandler)

// GET /api/communities/:id/messages - Get messages for a community
router.get('/:id/messages', getCommunityMessagesHandler)

// POST /api/communities/:id/messages - Create a new message (requires auth)
router.post('/:id/messages', authenticateUser, createMessageHandler)

// POST /api/communities/:id/image - Upload community image (requires auth)
router.post('/:id/image', authenticateUser, upload.single('image'), uploadCommunityImageHandler)

export default router

