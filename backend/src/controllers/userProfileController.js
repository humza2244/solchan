import { createUserProfile, getUserProfile, isUsernameAvailable } from '../services/userProfileService.js'

/**
 * Create user profile with username
 */
export const createProfile = async (req, res) => {
  try {
    const { username } = req.body
    const userId = req.user.id
    
    if (!username || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' })
    }
    
    if (username.length > 50) {
      return res.status(400).json({ error: 'Username must be 50 characters or less' })
    }
    
    // Validate username format
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, underscores, and hyphens' })
    }
    
    const profile = await createUserProfile(userId, username.trim())
    res.status(201).json(profile)
  } catch (error) {
    console.error('Error creating profile:', error)
    if (error.message === 'Username already taken') {
      res.status(409).json({ error: 'Username already taken' })
    } else {
      res.status(500).json({ error: 'Failed to create profile' })
    }
  }
}

/**
 * Get current user's profile
 */
export const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id
    const profile = await getUserProfile(userId)
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' })
    }
    
    res.json(profile)
  } catch (error) {
    console.error('Error fetching profile:', error)
    res.status(500).json({ error: 'Failed to fetch profile' })
  }
}

/**
 * Check if username is available
 */
export const checkUsername = async (req, res) => {
  try {
    const { username } = req.query
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' })
    }
    
    const available = await isUsernameAvailable(username)
    res.json({ available })
  } catch (error) {
    console.error('Error checking username:', error)
    res.status(500).json({ error: 'Failed to check username availability' })
  }
}

