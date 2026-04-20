import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { createUserProfile, getUserProfile, linkTwitterToProfile } from '../services/userProfileService.js'
import { sanitizeInput } from '../utils/sanitize.js'

const router = express.Router()

// POST /api/auth/register - Create user profile after Firebase account creation
router.post('/register', requireAuth, async (req, res) => {
  try {
    const { username, twitterHandle } = req.body

    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Username is required' })
    }

    const sanitizedUsername = sanitizeInput(username.trim(), 20)

    // Validate username format
    if (sanitizedUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' })
    }

    if (!/^[a-zA-Z0-9_]+$/.test(sanitizedUsername)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' })
    }

    const sanitizedTwitterHandle = twitterHandle ? sanitizeInput(twitterHandle.replace('@', '').trim(), 50) : null

    const profile = await createUserProfile(req.userId, sanitizedUsername, sanitizedTwitterHandle)

    res.status(201).json({
      message: 'Profile created successfully',
      profile,
    })
  } catch (error) {
    console.error('Error creating profile:', error.message)
    if (error.message === 'Username already taken') {
      return res.status(409).json({ error: 'Username already taken' })
    }
    res.status(500).json({ error: 'Failed to create profile' })
  }
})

// GET /api/auth/me - Get current user's profile
router.get('/me', requireAuth, async (req, res) => {
  try {
    const profile = await getUserProfile(req.userId)

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    res.json(profile)
  } catch (error) {
    console.error('Error fetching profile:', error.message)
    res.status(500).json({ error: 'Failed to fetch profile' })
  }
})

// POST /api/auth/link-x - Link a Twitter/X account to existing profile
router.post('/link-x', requireAuth, async (req, res) => {
  try {
    const { twitterHandle } = req.body

    if (!twitterHandle) {
      return res.status(400).json({ error: 'twitterHandle is required' })
    }

    const cleanHandle = sanitizeInput(twitterHandle.replace('@', '').trim(), 50)
    const profile = await linkTwitterToProfile(req.userId, cleanHandle)

    res.json({
      message: 'X account linked successfully',
      profile,
    })
  } catch (error) {
    console.error('Error linking X account:', error.message)
    res.status(500).json({ error: 'Failed to link X account' })
  }
})

export default router
