// Moderation service — reports, bans, mod management, content deletion
import { getDb, toDate, FieldValue } from '../config/firebase.js'

// ======== REPORTS ========

// Create a report for a thread or reply
export const createReport = async ({ contentType, contentId, communityId, reason, reporterIp }) => {
  const db = getDb()
  const now = new Date()

  const reportRef = await db.collection('reports').add({
    contentType, // 'thread' or 'reply'
    contentId,
    communityId,
    reason,
    reporterIp: reporterIp || null,
    status: 'pending', // pending, resolved, dismissed
    createdAt: now,
    resolvedAt: null,
    resolvedBy: null,
  })

  return { id: reportRef.id, contentType, contentId, communityId, reason, status: 'pending', createdAt: now }
}

// Get pending reports for a community
export const getReports = async (communityId, status = 'pending') => {
  const db = getDb()
  const snap = await db.collection('reports')
    .where('communityId', '==', communityId)
    .where('status', '==', status)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get()

  return snap.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: toDate(doc.data().createdAt) }))
}

// Resolve a report (delete content or dismiss)
export const resolveReport = async (reportId, action, resolvedBy) => {
  const db = getDb()
  await db.collection('reports').doc(reportId).update({
    status: action, // 'resolved' or 'dismissed'
    resolvedAt: new Date(),
    resolvedBy,
  })
}

// ======== DELETE CONTENT ========

// Delete a thread and all its replies
export const deleteThread = async (threadId) => {
  const db = getDb()

  // Get thread to find communityId
  const threadDoc = await db.collection('threads').doc(threadId).get()
  if (!threadDoc.exists) throw new Error('Thread not found')

  const communityId = threadDoc.data().communityId
  const replyCount = threadDoc.data().replyCount || 0

  // Delete all replies
  const repliesSnap = await db.collection('replies')
    .where('threadId', '==', threadId)
    .get()

  for (const doc of repliesSnap.docs) {
    await db.collection('replies').doc(doc.id).delete()
  }

  // Delete thread
  await db.collection('threads').doc(threadId).delete()

  // Update community message count
  await db.collection('communities').doc(communityId).update({
    messageCount: FieldValue.increment(-(1 + replyCount)),
  })

  return { deletedThread: threadId, deletedReplies: repliesSnap.size }
}

// Delete a single reply
export const deleteReply = async (replyId) => {
  const db = getDb()

  const replyDoc = await db.collection('replies').doc(replyId).get()
  if (!replyDoc.exists) throw new Error('Reply not found')

  const threadId = replyDoc.data().threadId

  // Get communityId from thread
  const threadDoc = await db.collection('threads').doc(threadId).get()
  const communityId = threadDoc.exists ? threadDoc.data().communityId : null

  // Delete reply
  await db.collection('replies').doc(replyId).delete()

  // Update thread reply count
  if (threadDoc.exists) {
    await db.collection('threads').doc(threadId).update({
      replyCount: FieldValue.increment(-1),
    })
  }

  // Update community message count
  if (communityId) {
    await db.collection('communities').doc(communityId).update({
      messageCount: FieldValue.increment(-1),
    })
  }

  return { deletedReply: replyId }
}

// ======== MODERATOR MANAGEMENT ========

// Check if user is creator or moderator of a community
export const isModOrCreator = async (communityId, userId) => {
  if (!userId) return false
  const db = getDb()
  const doc = await db.collection('communities').doc(communityId).get()
  if (!doc.exists) return false

  const data = doc.data()
  if (data.creatorId === userId) return true
  if (data.moderators && data.moderators.includes(userId)) return true
  return false
}

// Check if user is the creator
export const isCreator = async (communityId, userId) => {
  if (!userId) return false
  const db = getDb()
  const doc = await db.collection('communities').doc(communityId).get()
  if (!doc.exists) return false
  return doc.data().creatorId === userId
}

// Add a moderator to a community (only creator can do this)
export const addModerator = async (communityId, userId, creatorId) => {
  const db = getDb()
  const doc = await db.collection('communities').doc(communityId).get()
  if (!doc.exists) throw new Error('Community not found')
  if (doc.data().creatorId !== creatorId) throw new Error('Only the community creator can add mods')

  await db.collection('communities').doc(communityId).update({
    moderators: FieldValue.arrayUnion(userId),
  })
  return true
}

// Remove a moderator from a community
export const removeModerator = async (communityId, userId, creatorId) => {
  const db = getDb()
  const doc = await db.collection('communities').doc(communityId).get()
  if (!doc.exists) throw new Error('Community not found')
  if (doc.data().creatorId !== creatorId) throw new Error('Only the community creator can remove mods')

  await db.collection('communities').doc(communityId).update({
    moderators: FieldValue.arrayRemove(userId),
  })
  return true
}

// Get moderators list for a community
export const getModerators = async (communityId) => {
  const db = getDb()
  const doc = await db.collection('communities').doc(communityId).get()
  if (!doc.exists) return { creator: null, moderators: [] }
  return {
    creator: doc.data().creatorId || null,
    moderators: doc.data().moderators || [],
  }
}

// ======== BAN MANAGEMENT ========

// Ban a user from a community
export const banUser = async (communityId, { username, reason, bannedBy, duration }) => {
  const db = getDb()
  const now = new Date()
  
  // Calculate expiry if duration is set (in hours), otherwise permanent
  let expiresAt = null
  if (duration && duration > 0) {
    expiresAt = new Date(now.getTime() + duration * 60 * 60 * 1000)
  }

  const banRef = await db.collection('communities').doc(communityId)
    .collection('bans').add({
      username: username.toLowerCase(),
      reason: reason || 'No reason provided',
      bannedBy,
      bannedAt: now,
      expiresAt,
      active: true,
    })

  return {
    id: banRef.id,
    username: username.toLowerCase(),
    reason: reason || 'No reason provided',
    bannedAt: now,
    expiresAt,
    active: true,
  }
}

// Unban a user from a community
export const unbanUser = async (communityId, banId) => {
  const db = getDb()
  await db.collection('communities').doc(communityId)
    .collection('bans').doc(banId).update({
      active: false,
      unbannedAt: new Date(),
    })
  return true
}

// Check if a username is banned from a community
export const isUserBanned = async (communityId, username) => {
  if (!username) return false
  const db = getDb()
  const now = new Date()
  
  const snap = await db.collection('communities').doc(communityId)
    .collection('bans')
    .where('username', '==', username.toLowerCase())
    .where('active', '==', true)
    .limit(1)
    .get()

  if (snap.empty) return false
  
  const ban = snap.docs[0].data()
  
  // Check if ban has expired
  if (ban.expiresAt) {
    const expiry = ban.expiresAt.toDate ? ban.expiresAt.toDate() : new Date(ban.expiresAt)
    if (expiry < now) {
      // Auto-expire the ban
      await db.collection('communities').doc(communityId)
        .collection('bans').doc(snap.docs[0].id).update({ active: false })
      return false
    }
  }

  return {
    banned: true,
    reason: ban.reason,
    expiresAt: ban.expiresAt,
  }
}

// Get all active bans for a community
export const getBans = async (communityId) => {
  const db = getDb()
  const snap = await db.collection('communities').doc(communityId)
    .collection('bans')
    .where('active', '==', true)
    .orderBy('bannedAt', 'desc')
    .limit(100)
    .get()

  return snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    bannedAt: toDate(doc.data().bannedAt),
    expiresAt: doc.data().expiresAt ? toDate(doc.data().expiresAt) : null,
  }))
}

export default {
  createReport,
  getReports,
  resolveReport,
  deleteThread,
  deleteReply,
  isModOrCreator,
  isCreator,
  addModerator,
  removeModerator,
  getModerators,
  banUser,
  unbanUser,
  isUserBanned,
  getBans,
}
