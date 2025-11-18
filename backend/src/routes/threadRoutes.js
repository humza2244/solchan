import express from 'express'
import { getThread, createThread, createReply } from '../controllers/threadController.js'

const router = express.Router()

// GET /api/boards/:board/threads/:threadId
router.get('/:board/threads/:threadId', getThread)

// POST /api/boards/:board/threads
router.post('/:board/threads', createThread)

// POST /api/boards/:board/threads/:threadId/replies
router.post('/:board/threads/:threadId/replies', createReply)

export default router

