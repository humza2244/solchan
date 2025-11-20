import { query } from '../config/database.js'

/**
 * Create or update user profile with username
 */
export const createUserProfile = async (userId, username) => {
  try {
    const result = await query(
      `INSERT INTO user_profiles (user_id, username)
       VALUES ($1, $2)
       ON CONFLICT (user_id) 
       DO UPDATE SET username = $2, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, username]
    )
    return result.rows[0]
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      throw new Error('Username already taken')
    }
    throw error
  }
}

/**
 * Get user profile by user ID
 */
export const getUserProfile = async (userId) => {
  try {
    const result = await query(
      'SELECT * FROM user_profiles WHERE user_id = $1',
      [userId]
    )
    return result.rows[0] || null
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
}

/**
 * Get user profile by username
 */
export const getUserProfileByUsername = async (username) => {
  try {
    const result = await query(
      'SELECT * FROM user_profiles WHERE LOWER(username) = LOWER($1)',
      [username]
    )
    return result.rows[0] || null
  } catch (error) {
    console.error('Error fetching user profile by username:', error)
    return null
  }
}

/**
 * Check if username is available
 */
export const isUsernameAvailable = async (username) => {
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM user_profiles WHERE LOWER(username) = LOWER($1)',
      [username]
    )
    return parseInt(result.rows[0].count) === 0
  } catch (error) {
    console.error('Error checking username availability:', error)
    return false
  }
}

/**
 * Get multiple user profiles
 */
export const getUserProfiles = async (userIds) => {
  if (!userIds || userIds.length === 0) return []
  
  try {
    const result = await query(
      'SELECT * FROM user_profiles WHERE user_id = ANY($1)',
      [userIds]
    )
    return result.rows
  } catch (error) {
    console.error('Error fetching user profiles:', error)
    return []
  }
}

