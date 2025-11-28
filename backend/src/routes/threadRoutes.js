import express from 'express'
import multer from 'multer'
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
    // Only allow images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  },
})

// GET /api/communities/:communityId/threads - Get all threads for a community
router.get('/communities/:communityId/threads', getThreadsHandler)

// POST /api/communities/:communityId/threads - Create a new thread
router.post('/communities/:communityId/threads', createThreadHandler)

// POST /api/threads/:threadId/image - Upload image for a thread
router.post('/threads/:threadId/image', upload.single('image'), uploadThreadImageHandler)

// GET /api/threads/:threadId - Get a single thread with all replies
router.get('/threads/:threadId', getThreadHandler)

// POST /api/threads/:threadId/replies - Add a reply to a thread (with optional image)
router.post('/threads/:threadId/replies', upload.single('image'), addReplyHandler)

// POST /api/replies/:replyId/image - Upload image for a reply
router.post('/replies/:replyId/image', upload.single('image'), uploadReplyImageHandler)

export default router
