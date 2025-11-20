import express from 'express'
import { createProfile, getMyProfile, checkUsername } from '../controllers/userProfileController.js'
import { authenticateUser } from '../middleware/auth.js'

const router = express.Router()

// POST /api/profile - Create or update user profile
router.post('/', authenticateUser, createProfile)

// GET /api/profile/me - Get current user's profile
router.get('/me', authenticateUser, getMyProfile)

// GET /api/profile/check-username - Check if username is available
router.get('/check-username', checkUsername)

export default router

