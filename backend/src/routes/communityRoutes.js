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
  getKOTHHandler,
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

// GET /api/communities/koth - Get King of the Hill (must be before /:id route)
router.get('/koth', getKOTHHandler)

// POST /api/communities - Create a new community (anonymous)
router.post('/', createCommunityHandler)

// GET /api/communities/:id - Get community with messages
router.get('/:id', getCommunityHandler)

// GET /api/communities/:id/messages - Get messages for a community
router.get('/:id/messages', getCommunityMessagesHandler)

// POST /api/communities/:id/messages - Create a new message (anonymous)
router.post('/:id/messages', createMessageHandler)

// POST /api/communities/:id/image - Upload community image (anonymous)
router.post('/:id/image', upload.single('image'), uploadCommunityImageHandler)

export default router

