import { getDb, toDate } from '../config/firebase.js'

/**
 * Create or update user profile.
 * Supports X login fields: twitterHandle, twitterId, avatarUrl, isXVerified.
 */
export const createUserProfile = async (userId, username, options = {}) => {
  const db = getDb()
  const { twitterHandle, twitterId, avatarUrl, isXUser } = options

  // Sanitize username
  const cleanUsername = username.trim()
  if (!cleanUsername || cleanUsername.length < 2) throw new Error('Username too short')
  if (cleanUsername.length > 30) throw new Error('Username too long')

  // Check if username is taken by another user
  const existingSnap = await db.collection('userProfiles')
    .where('usernameLower', '==', cleanUsername.toLowerCase())
    .get()

  if (!existingSnap.empty) {
    const existingDoc = existingSnap.docs[0]
    if (existingDoc.id !== userId) {
      throw new Error('Username already taken')
    }
  }

  const now = new Date()
  const profileData = {
    userId,
    username: cleanUsername,
    usernameLower: cleanUsername.toLowerCase(),
    createdAt: now,
    updatedAt: now,
    twitterHandle: twitterHandle || null,
    twitterId: twitterId || null,
    avatarUrl: avatarUrl || null,
    isXUser: isXUser || false,
  }

  await db.collection('userProfiles').doc(userId).set(profileData, { merge: true })

  const doc = await db.collection('userProfiles').doc(userId).get()
  return { id: doc.id, ...doc.data(), createdAt: toDate(doc.data().createdAt) }
}

/**
 * Get user profile by user ID
 */
export const getUserProfile = async (userId) => {
  const db = getDb()
  const doc = await db.collection('userProfiles').doc(userId).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data(), createdAt: toDate(doc.data().createdAt) }
}

/**
 * Get user profile by username
 */
export const getUserProfileByUsername = async (username) => {
  const db = getDb()
  const snap = await db.collection('userProfiles')
    .where('usernameLower', '==', username.toLowerCase())
    .limit(1)
    .get()

  if (snap.empty) return null
  const doc = snap.docs[0]
  return { id: doc.id, ...doc.data(), createdAt: toDate(doc.data().createdAt) }
}

/**
 * Check if username is available
 */
export const isUsernameAvailable = async (username) => {
  const db = getDb()
  const snap = await db.collection('userProfiles')
    .where('usernameLower', '==', username.toLowerCase())
    .limit(1)
    .get()
  return snap.empty
}

/**
 * Get multiple user profiles
 */
export const getUserProfiles = async (userIds) => {
  if (!userIds || userIds.length === 0) return []
  const db = getDb()
  const results = []
  for (let i = 0; i < userIds.length; i += 30) {
    const batch = userIds.slice(i, i + 30)
    const snap = await db.collection('userProfiles')
      .where('userId', 'in', batch)
      .get()
    snap.docs.forEach(doc => results.push({ id: doc.id, ...doc.data() }))
  }
  return results
}

/**
 * Link a Twitter/X handle to an existing profile, and update avatar if provided.
 */
export const linkTwitterToProfile = async (userId, twitterHandle, opts = {}) => {
  const db = getDb()
  const now = new Date()

  const updateData = {
    twitterHandle,
    isXUser: true,
    updatedAt: now,
  }
  if (opts.twitterId) updateData.twitterId = opts.twitterId
  if (opts.avatarUrl) updateData.avatarUrl = opts.avatarUrl

  await db.collection('userProfiles').doc(userId).update(updateData)

  const doc = await db.collection('userProfiles').doc(userId).get()
  if (!doc.exists) throw new Error('Profile not found')
  return { id: doc.id, ...doc.data(), createdAt: toDate(doc.data().createdAt) }
}

/**
 * Find a unique username based on a Twitter handle.
 * If "coinguy" is taken, tries "coinguy2", "coinguy3", etc.
 */
export const findAvailableUsername = async (baseUsername) => {
  const db = getDb()

  // Sanitize: only alphanumeric + underscore, max 20 chars
  const clean = baseUsername.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20) || 'user'

  // Check if base is available
  const snap = await db.collection('userProfiles')
    .where('usernameLower', '==', clean.toLowerCase())
    .limit(1)
    .get()

  if (snap.empty) return clean

  // Try with suffixes
  for (let i = 2; i <= 99; i++) {
    const candidate = `${clean.slice(0, 17)}${i}`
    const s = await db.collection('userProfiles')
      .where('usernameLower', '==', candidate.toLowerCase())
      .limit(1)
      .get()
    if (s.empty) return candidate
  }

  // Fallback to random
  return `${clean.slice(0, 15)}${Date.now() % 10000}`
}

export default {
  createUserProfile,
  getUserProfile,
  getUserProfileByUsername,
  isUsernameAvailable,
  getUserProfiles,
  linkTwitterToProfile,
  findAvailableUsername,
}
