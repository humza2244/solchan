import express from 'express'
import { getBoardThreads } from '../controllers/boardController.js'

const router = express.Router()

// GET /api/boards/:board/threads
router.get('/:board/threads', getBoardThreads)

export default router

