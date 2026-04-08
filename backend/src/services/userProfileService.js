import { getDb, toDate } from '../config/firebase.js'

/**
 * Create or update user profile with username
 */
export const createUserProfile = async (userId, username) => {
  const db = getDb()
  
  // Check if username is taken by another user
  const existingSnap = await db.collection('userProfiles')
    .where('username', '==', username.toLowerCase())
    .get()
    
  if (!existingSnap.empty) {
    const existingDoc = existingSnap.docs[0]
    if (existingDoc.id !== userId) {
      throw new Error('Username already taken')
    }
  }
  
  const now = new Date()
  await db.collection('userProfiles').doc(userId).set({
    userId,
    username: username,
    usernameLower: username.toLowerCase(),
    createdAt: now,
    updatedAt: now,
  }, { merge: true })
  
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
  
  // Firestore 'in' queries support max 30 values
  for (let i = 0; i < userIds.length; i += 30) {
    const batch = userIds.slice(i, i + 30)
    const snap = await db.collection('userProfiles')
      .where('userId', 'in', batch)
      .get()
    snap.docs.forEach(doc => {
      results.push({ id: doc.id, ...doc.data() })
    })
  }
  
  return results
}
