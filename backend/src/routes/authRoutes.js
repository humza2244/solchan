import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import {
  createUserProfile,
  getUserProfile,
  linkTwitterToProfile,
  findAvailableUsername,
  isUsernameAvailable,
} from '../services/userProfileService.js'
import { sanitizeInput } from '../utils/sanitize.js'

const router = express.Router()

// POST /api/auth/register - Create user profile (email/password or X auto-register)
router.post('/register', requireAuth, async (req, res) => {
  try {
    const { username, twitterHandle, twitterId, avatarUrl, isXUser, autoUsernameFromX } = req.body

    // If this is an X auto-registration, find an available username from the Twitter handle
    let finalUsername = username
    if (autoUsernameFromX && twitterHandle) {
      // Use their Twitter handle as username (find available variant if taken)
      finalUsername = await findAvailableUsername(twitterHandle)
    }

    if (!finalUsername || !finalUsername.trim()) {
      return res.status(400).json({ error: 'Username is required' })
    }

    const sanitizedUsername = sanitizeInput(finalUsername.trim(), 20)

    if (sanitizedUsername.length < 2) {
      return res.status(400).json({ error: 'Username must be at least 2 characters' })
    }

    if (!/^[a-zA-Z0-9_]+$/.test(sanitizedUsername)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' })
    }

    const sanitizedTwitterHandle = twitterHandle
      ? sanitizeInput(twitterHandle.replace('@', '').trim(), 50)
      : null

    const profile = await createUserProfile(req.userId, sanitizedUsername, {
      twitterHandle: sanitizedTwitterHandle,
      twitterId: twitterId || null,
      avatarUrl: avatarUrl || null,
      isXUser: isXUser || false,
    })

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

// POST /api/auth/check-username - Check if a username is available
router.post('/check-username', async (req, res) => {
  try {
    const { username } = req.body
    if (!username) return res.status(400).json({ error: 'Username required' })
    const available = await isUsernameAvailable(username.trim())
    res.json({ available })
  } catch (error) {
    res.status(500).json({ error: 'Failed to check username' })
  }
})

// POST /api/auth/link-x - Link X account to existing profile (or update X info)
router.post('/link-x', requireAuth, async (req, res) => {
  try {
    const { twitterHandle, twitterId, avatarUrl } = req.body

    if (!twitterHandle) {
      return res.status(400).json({ error: 'twitterHandle is required' })
    }

    const cleanHandle = sanitizeInput(twitterHandle.replace('@', '').trim(), 50)
    const profile = await linkTwitterToProfile(req.userId, cleanHandle, {
      twitterId: twitterId || null,
      avatarUrl: avatarUrl || null,
    })

    res.json({
      message: 'X account linked successfully',
      profile,
    })
  } catch (error) {
    console.error('Error linking X account:', error.message)
    res.status(500).json({ error: 'Failed to link X account' })
  }
})

// POST /api/auth/link-twitter - Alias for link-x (frontend compatibility)
router.post('/link-twitter', requireAuth, async (req, res) => {
  try {
    const { twitterHandle, twitterId, avatarUrl } = req.body

    if (!twitterHandle) {
      return res.status(400).json({ error: 'twitterHandle is required' })
    }

    const cleanHandle = sanitizeInput(twitterHandle.replace('@', '').trim(), 50)
    const profile = await linkTwitterToProfile(req.userId, cleanHandle, {
      twitterId: twitterId || null,
      avatarUrl: avatarUrl || null,
    })

    res.json({
      message: 'Twitter account linked successfully',
      profile,
    })
  } catch (error) {
    console.error('Error linking Twitter account:', error.message)
    res.status(500).json({ error: 'Failed to link Twitter account' })
  }
})

// GET /api/auth/profile/:username - Public profile lookup by username
router.get('/profile/:username', async (req, res) => {
  try {
    const { username } = req.params
    const { getDb } = await import('../config/firebase.js')
    const db = getDb()
    const snap = await db.collection('userProfiles')
      .where('usernameLower', '==', decodeURIComponent(username).toLowerCase())
      .limit(1)
      .get()

    if (snap.empty) {
      return res.status(404).json({ error: 'User not found' })
    }

    const data = snap.docs[0].data()
    // Return only public fields
    res.json({
      username: data.username,
      twitterHandle: data.twitterHandle || null,
      isXUser: data.isXUser || false,
      avatarUrl: data.avatarUrl || null,
      createdAt: data.createdAt,
    })
  } catch (error) {
    console.error('Error fetching public profile:', error.message)
    res.status(500).json({ error: 'Failed to fetch profile' })
  }
})

export default router
