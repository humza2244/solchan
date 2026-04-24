// Moderation routes — reports, delete, ban, mod management
import express from 'express'
import { requireAuth, authenticateUser } from '../middleware/auth.js'
import {
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
  deleteChatMessage,
  warnUser,
  getWarnings,
} from '../services/moderationService.js'
import { sanitizeInput } from '../utils/sanitize.js'
import { getDb } from '../config/firebase.js'

const router = express.Router()

// POST /api/mod/report — Report a thread or reply (no auth required, uses IP)
router.post('/report', authenticateUser, async (req, res) => {
  try {
    const { contentType, contentId, communityId, reason } = req.body

    if (!contentType || !contentId || !communityId) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    if (!['thread', 'reply'].includes(contentType)) {
      return res.status(400).json({ error: 'Invalid content type' })
    }

    const sanitizedReason = sanitizeInput(reason, 500) || 'No reason provided'
    const reporterIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null

    const report = await createReport({
      contentType,
      contentId,
      communityId,
      reason: sanitizedReason,
      reporterIp,
    })

    res.status(201).json({ message: 'Report submitted', report })
  } catch (error) {
    console.error('Error creating report:', error.message)
    res.status(500).json({ error: 'Failed to submit report' })
  }
})

// GET /api/mod/:communityId/reports — Get pending reports (mods/creator only)
router.get('/:communityId/reports', requireAuth, async (req, res) => {
  try {
    const { communityId } = req.params
    const isMod = await isModOrCreator(communityId, req.userId)

    if (!isMod) {
      return res.status(403).json({ error: 'Not authorized — must be a moderator or creator' })
    }

    const reports = await getReports(communityId)
    res.json(reports)
  } catch (error) {
    console.error('Error fetching reports:', error.message)
    res.status(500).json({ error: 'Failed to fetch reports' })
  }
})

// POST /api/mod/resolve/:reportId — Resolve a report (delete or dismiss)
router.post('/resolve/:reportId', requireAuth, async (req, res) => {
  try {
    const { reportId } = req.params
    const { action, communityId } = req.body // action: 'resolved' or 'dismissed'

    if (!['resolved', 'dismissed'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' })
    }

    const isMod = await isModOrCreator(communityId, req.userId)
    if (!isMod) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    await resolveReport(reportId, action, req.userId)
    res.json({ message: `Report ${action}` })
  } catch (error) {
    console.error('Error resolving report:', error.message)
    res.status(500).json({ error: 'Failed to resolve report' })
  }
})

// DELETE /api/mod/thread/:threadId — Delete a thread (mods/creator only)
router.delete('/thread/:threadId', requireAuth, async (req, res) => {
  try {
    const { threadId } = req.params
    const { communityId } = req.query

    if (!communityId) {
      return res.status(400).json({ error: 'communityId query param required' })
    }

    const isMod = await isModOrCreator(communityId, req.userId)
    if (!isMod) {
      return res.status(403).json({ error: 'Not authorized — must be a moderator or creator' })
    }

    const result = await deleteThread(threadId)
    res.json({ message: 'Thread deleted', ...result })
  } catch (error) {
    console.error('Error deleting thread:', error.message)
    res.status(500).json({ error: 'Failed to delete thread' })
  }
})

// DELETE /api/mod/reply/:replyId — Delete a reply (mods/creator only)
router.delete('/reply/:replyId', requireAuth, async (req, res) => {
  try {
    const { replyId } = req.params
    const { communityId } = req.query

    if (!communityId) {
      return res.status(400).json({ error: 'communityId query param required' })
    }

    const isMod = await isModOrCreator(communityId, req.userId)
    if (!isMod) {
      return res.status(403).json({ error: 'Not authorized — must be a moderator or creator' })
    }

    const result = await deleteReply(replyId)
    res.json({ message: 'Reply deleted', ...result })
  } catch (error) {
    console.error('Error deleting reply:', error.message)
    res.status(500).json({ error: 'Failed to delete reply' })
  }
})

// GET /api/mod/:communityId/mods — Get moderators list (with usernames)
router.get('/:communityId/mods', async (req, res) => {
  try {
    const { communityId } = req.params
    const mods = await getModerators(communityId)
    
    // Resolve usernames for moderator UIDs
    const db = getDb()
    const modDetails = []
    for (const modId of (mods.moderators || [])) {
      const profileDoc = await db.collection('userProfiles').doc(modId).get()
      modDetails.push({
        uid: modId,
        username: profileDoc.exists ? profileDoc.data().username : `User-${modId.slice(0,6)}`,
      })
    }
    
    // Resolve creator username
    let creatorUsername = null
    if (mods.creator) {
      const creatorDoc = await db.collection('userProfiles').doc(mods.creator).get()
      creatorUsername = creatorDoc.exists ? creatorDoc.data().username : null
    }
    
    res.json({
      creator: mods.creator,
      creatorUsername,
      moderators: mods.moderators || [],
      moderatorDetails: modDetails,
    })
  } catch (error) {
    console.error('Error fetching moderators:', error.message)
    res.status(500).json({ error: 'Failed to fetch moderators' })
  }
})

// POST /api/mod/:communityId/mods — Add a moderator (creator only)
router.post('/:communityId/mods', requireAuth, async (req, res) => {
  try {
    const { communityId } = req.params
    const { username } = req.body

    if (!username) {
      return res.status(400).json({ error: 'Username is required' })
    }

    const db = getDb()

    // Run profile lookup and community fetch in parallel for speed
    const [profileSnap, communityDoc] = await Promise.all([
      db.collection('userProfiles').where('username', '==', username.trim()).limit(1).get(),
      db.collection('communities').doc(communityId).get(),
    ])

    if (!communityDoc.exists) {
      return res.status(404).json({ error: 'Community not found' })
    }
    if (communityDoc.data().creatorId !== req.userId) {
      return res.status(403).json({ error: 'Only the community creator can add mods' })
    }
    if (profileSnap.empty) {
      return res.status(404).json({ error: `User "${username}" not found` })
    }

    const userId = profileSnap.docs[0].id
    await addModerator(communityId, userId, req.userId)
    res.json({ message: `${username} added as moderator` })
  } catch (error) {
    console.error('Error adding moderator:', error.message)
    if (error.message.includes('Only the community creator')) {
      return res.status(403).json({ error: error.message })
    }
    res.status(500).json({ error: 'Failed to add moderator' })
  }
})


// DELETE /api/mod/:communityId/mods/:userId — Remove a moderator (creator only)
router.delete('/:communityId/mods/:userId', requireAuth, async (req, res) => {
  try {
    const { communityId, userId } = req.params
    await removeModerator(communityId, userId, req.userId)
    res.json({ message: 'Moderator removed' })
  } catch (error) {
    console.error('Error removing moderator:', error.message)
    if (error.message.includes('Only the community creator')) {
      return res.status(403).json({ error: error.message })
    }
    res.status(500).json({ error: 'Failed to remove moderator' })
  }
})

// POST /api/mod/pin/:threadId — Toggle pin/unpin a thread (mods/creator only)
router.post('/pin/:threadId', requireAuth, async (req, res) => {
  try {
    const { threadId } = req.params
    const { communityId } = req.body

    if (!communityId) {
      return res.status(400).json({ error: 'communityId is required' })
    }

    const isMod = await isModOrCreator(communityId, req.userId)
    if (!isMod) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    const { togglePinThread } = await import('../services/threadService.js')
    const isPinned = await togglePinThread(threadId)
    res.json({ message: isPinned ? 'Thread pinned' : 'Thread unpinned', isPinned })
  } catch (error) {
    console.error('Error toggling pin:', error.message)
    res.status(500).json({ error: 'Failed to toggle pin' })
  }
})

// POST /api/mod/lock/:threadId — Toggle lock/unlock a thread (mods/creator only)
router.post('/lock/:threadId', requireAuth, async (req, res) => {
  try {
    const { threadId } = req.params
    const { communityId } = req.body

    if (!communityId) {
      return res.status(400).json({ error: 'communityId is required' })
    }

    const isMod = await isModOrCreator(communityId, req.userId)
    if (!isMod) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    const { getDb } = await import('../config/firebase.js')
    const db = getDb()
    const threadRef = db.collection('threads').doc(threadId)
    const threadDoc = await threadRef.get()
    if (!threadDoc.exists) {
      return res.status(404).json({ error: 'Thread not found' })
    }
    const isLocked = !threadDoc.data().isLocked
    await threadRef.update({ isLocked })
    res.json({ message: isLocked ? 'Thread locked' : 'Thread unlocked', isLocked })
  } catch (error) {
    console.error('Error toggling lock:', error.message)
    res.status(500).json({ error: 'Failed to toggle lock' })
  }
})

// PUT /api/mod/:communityId/rules — Update community rules (creator/mods only)
router.put('/:communityId/rules', requireAuth, async (req, res) => {
  try {
    const { communityId } = req.params
    const { rules } = req.body

    const isMod = await isModOrCreator(communityId, req.userId)
    if (!isMod) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    const sanitizedRules = sanitizeInput(rules, 2000) || ''
    const db = getDb()
    await db.collection('communities').doc(communityId).update({ rules: sanitizedRules })
    res.json({ message: 'Rules updated', rules: sanitizedRules })
  } catch (error) {
    console.error('Error updating rules:', error.message)
    res.status(500).json({ error: 'Failed to update rules' })
  }
})

// ========== BAN ROUTES ==========

// POST /api/mod/:communityId/ban — Ban a user (mods/creator only)
router.post('/:communityId/ban', requireAuth, async (req, res) => {
  try {
    const { communityId } = req.params
    const { username, reason, duration } = req.body

    if (!username) {
      return res.status(400).json({ error: 'Username is required' })
    }

    const isMod = await isModOrCreator(communityId, req.userId)
    if (!isMod) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    // Don't allow banning the community creator
    const db = getDb()
    const communityDoc = await db.collection('communities').doc(communityId).get()
    if (communityDoc.exists) {
      const creatorId = communityDoc.data().creatorId
      if (creatorId) {
        const creatorProfile = await db.collection('userProfiles').doc(creatorId).get()
        if (creatorProfile.exists && creatorProfile.data().username?.toLowerCase() === username.toLowerCase()) {
          return res.status(400).json({ error: 'Cannot ban the community creator' })
        }
      }
    }

    const ban = await banUser(communityId, {
      username: sanitizeInput(username, 100),
      reason: sanitizeInput(reason, 500),
      bannedBy: req.userId,
      duration: duration ? Number(duration) : null,
    })

    // Delete all threads and replies by this user in the community
    try {
      const db = getDb()
      const profileSnap = await db.collection('userProfiles')
        .where('username', '==', username.trim())
        .limit(1)
        .get()

      if (!profileSnap.empty) {
        const bannedUserId = profileSnap.docs[0].id

        // Delete threads
        const threadsSnap = await db.collection('threads')
          .where('communityId', '==', communityId)
          .where('authorId', '==', bannedUserId)
          .get()
        const threadDeletes = threadsSnap.docs.map(d => d.ref.delete())

        // Delete replies
        const repliesSnap = await db.collection('replies')
          .where('communityId', '==', communityId)
          .where('authorId', '==', bannedUserId)
          .get()
        const replyDeletes = repliesSnap.docs.map(d => d.ref.delete())

        await Promise.all([...threadDeletes, ...replyDeletes])
      }
    } catch (cleanupErr) {
      console.error('Error cleaning up banned user content:', cleanupErr.message)
      // Don't fail the ban if cleanup fails
    }

    res.status(201).json({ message: `${username} has been banned and their content removed`, ban })

  } catch (error) {
    console.error('Error banning user:', error.message)
    res.status(500).json({ error: 'Failed to ban user' })
  }
})

// DELETE /api/mod/:communityId/ban/:banId — Unban a user (mods/creator only)
router.delete('/:communityId/ban/:banId', requireAuth, async (req, res) => {
  try {
    const { communityId, banId } = req.params

    const isMod = await isModOrCreator(communityId, req.userId)
    if (!isMod) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    await unbanUser(communityId, banId)
    res.json({ message: 'User unbanned' })
  } catch (error) {
    console.error('Error unbanning user:', error.message)
    res.status(500).json({ error: 'Failed to unban user' })
  }
})

// GET /api/mod/:communityId/bans — Get all active bans (mods/creator only)
router.get('/:communityId/bans', requireAuth, async (req, res) => {
  try {
    const { communityId } = req.params

    const isMod = await isModOrCreator(communityId, req.userId)
    if (!isMod) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    const bans = await getBans(communityId)
    res.json(bans)
  } catch (error) {
    console.error('Error fetching bans:', error.message)
    res.status(500).json({ error: 'Failed to fetch bans' })
  }
})

// GET /api/mod/:communityId/check-ban/:username — Check if a user is banned (public)
router.get('/:communityId/check-ban/:username', async (req, res) => {
  try {
    const { communityId, username } = req.params
    const result = await isUserBanned(communityId, username)
    res.json({ banned: !!result, details: result || null })
  } catch (error) {
    console.error('Error checking ban:', error.message)
    res.status(500).json({ error: 'Failed to check ban status' })
  }
})

// DELETE /api/mod/message/:messageId?communityId=... — Delete a live chat message (mods/creator only)
router.delete('/message/:messageId', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params
    const communityId = req.query.communityId

    if (!communityId) {
      return res.status(400).json({ error: 'communityId query param required' })
    }

    const isMod = await isModOrCreator(communityId, req.userId)
    if (!isMod) {
      return res.status(403).json({ error: 'Not authorized — must be a moderator or creator' })
    }

    const result = await deleteChatMessage(messageId, communityId)
    res.json({ message: 'Chat message deleted', ...result })
  } catch (error) {
    console.error('Error deleting message:', error.message)
    res.status(500).json({ error: 'Failed to delete message' })
  }
})

// POST /api/mod/:communityId/warn — Warn a user (mods/creator only)
router.post('/:communityId/warn', requireAuth, async (req, res) => {
  try {
    const { communityId } = req.params
    const { username, reason } = req.body

    if (!username) {
      return res.status(400).json({ error: 'Username is required' })
    }

    const isMod = await isModOrCreator(communityId, req.userId)
    if (!isMod) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    const warning = await warnUser(communityId, {
      username: sanitizeInput(username, 100),
      reason: sanitizeInput(reason, 500) || 'Rule violation',
      warnedBy: req.userId,
    })

    res.status(201).json({ message: `Warning issued to ${username}`, warning })
  } catch (error) {
    console.error('Error warning user:', error.message)
    res.status(500).json({ error: 'Failed to warn user' })
  }
})

// GET /api/mod/:communityId/warnings — Get warnings (mods/creator only)
router.get('/:communityId/warnings', requireAuth, async (req, res) => {
  try {
    const { communityId } = req.params

    const isMod = await isModOrCreator(communityId, req.userId)
    if (!isMod) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    const warnings = await getWarnings(communityId)
    res.json(warnings)
  } catch (error) {
    console.error('Error fetching warnings:', error.message)
    res.status(500).json({ error: 'Failed to fetch warnings' })
  }
})

export default router
