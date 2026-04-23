import {
  createThread,
  getThreadsByCommunity,
  getThreadById,
  getRepliesByThread,
  addReply,
  getThreadWithPreview,
} from '../services/threadService.js'
import { uploadThreadImage, uploadReplyImage, uploadToR2 } from '../services/storageService.js'
import { broadcastToThread } from '../services/socketService.js'
import { invalidatePopularCoinsCache } from '../utils/cache.js'
import { sanitizeInput, sanitizeAuthor, escapeHtml } from '../utils/sanitize.js'
import { trackMember } from '../services/communityService.js'

// In-memory IP spam dedup: Map<ip_contentHash, timestamp>
const ipSpamMap = new Map()
const IP_DEDUP_WINDOW_MS = 2 * 60 * 1000 // 2 minutes

// Periodic cleanup of expired entries (every 60s)
setInterval(() => {
  const now = Date.now()
  for (const [k, t] of ipSpamMap) {
    if (now - t > IP_DEDUP_WINDOW_MS * 2) ipSpamMap.delete(k)
  }
}, 60_000)

const checkIpSpam = (ip, content) => {
  const now = Date.now()
  // Emergency prune if too large
  if (ipSpamMap.size > 10000) {
    const entries = [...ipSpamMap.entries()]
    entries.sort((a, b) => a[1] - b[1])
    for (let i = 0; i < entries.length - 5000; i++) {
      ipSpamMap.delete(entries[i][0])
    }
  }
  const key = `${ip}::${content.trim().toLowerCase().slice(0, 200)}`
  const last = ipSpamMap.get(key)
  if (last && (now - last) < IP_DEDUP_WINDOW_MS) return true
  ipSpamMap.set(key, now)
  return false
}

// Create a new thread
export const createThreadHandler = async (req, res) => {
  try {
    const { communityId } = req.params
    const { subject, content, author } = req.body

    const sanitizedSubject = sanitizeInput(subject, 255)
    const sanitizedContent = sanitizeInput(content, 10000)
    const sanitizedAuthor = sanitizeAuthor(author)

    if (!sanitizedSubject) {
      return res.status(400).json({ error: 'Subject is required' })
    }

    if (!sanitizedContent) {
      return res.status(400).json({ error: 'Content is required' })
    }

    // Check if user is banned
    const { isUserBanned } = await import('../services/moderationService.js')
    const banStatus = await isUserBanned(communityId, sanitizedAuthor)
    if (banStatus) {
      return res.status(403).json({ 
        error: 'You are banned from this community', 
        reason: banStatus.reason,
        expiresAt: banStatus.expiresAt,
      })
    }

    const thread = await createThread(communityId, {
      subject: sanitizedSubject,
      content: sanitizedContent,
      author: sanitizedAuthor,
      imageUrl: null,
    })

    // Track member
    trackMember(communityId, { author: sanitizedAuthor, userId: req.userId }).catch(() => {})

    res.status(201).json(thread.toJSON())
  } catch (error) {
    console.error('Error creating thread:', error.message)
    res.status(500).json({ error: 'Failed to create thread' })
  }
}

// Upload image for a thread
export const uploadThreadImageHandler = async (req, res) => {
  try {
    const { threadId } = req.params

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' })
    }

    // Store as base64 data URL in Firestore (avoids ephemeral fs on Render)
    const base64 = req.file.buffer.toString('base64')
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`

    const { getDb } = await import('../config/firebase.js')
    const db = getDb()
    await db.collection('threads').doc(threadId).update({ imageUrl: dataUrl })

    res.json({ imageUrl: dataUrl })
  } catch (error) {
    console.error('Error uploading thread image:', error.message)
    res.status(500).json({ error: 'Failed to upload image' })
  }
}

// Get threads for a community
export const getThreadsHandler = async (req, res) => {
  try {
    const { communityId } = req.params
    const limit = Math.min(parseInt(req.query.limit) || 50, 100)
    const offset = parseInt(req.query.offset) || 0
    const withPreview = req.query.preview === 'true'

    let threads = []
    try {
      threads = await getThreadsByCommunity(communityId, limit, offset)
    } catch (threadError) {
      console.error('Warning: Could not load threads:', threadError.message)
      return res.json([])
    }

    if (withPreview) {
      const threadsWithPreviews = await Promise.all(
        threads.map(async (thread) => {
          try {
            return await getThreadWithPreview(thread.id, 3)
          } catch {
            return { ...thread.toJSON(), recentReplies: [] }
          }
        })
      )
      res.json(threadsWithPreviews)
    } else {
      res.json(threads.map(t => t.toJSON()))
    }
  } catch (error) {
    console.error('Error fetching threads:', error.message)
    res.status(500).json({ error: 'Failed to fetch threads' })
  }
}

// Get a single thread with all replies
export const getThreadHandler = async (req, res) => {
  try {
    const { threadId } = req.params

    let thread
    try {
      thread = await getThreadById(threadId)
    } catch (lookupErr) {
      return res.status(404).json({ error: 'Thread not found' })
    }
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' })
    }

    let replies = []
    try {
      replies = await getRepliesByThread(threadId, 500)
    } catch (replyError) {
      console.error('Warning: Could not load replies:', replyError.message)
    }

    res.json({
      thread: thread.toJSON(),
      replies: replies.map(r => r.toJSON()),
    })
  } catch (error) {
    console.error('Error fetching thread:', error.message)
    res.status(500).json({ error: 'Failed to fetch thread' })
  }
}

// Add a reply to a thread
export const addReplyHandler = async (req, res) => {
  try {
    const { threadId } = req.params
    const { content, author } = req.body

    // Check if thread is locked
    const { getDb } = await import('../config/firebase.js')
    const db = getDb()
    const threadDoc = await db.collection('threads').doc(threadId).get()
    if (threadDoc.exists && threadDoc.data().isLocked) {
      return res.status(403).json({ error: 'This thread is locked. No new replies allowed.' })
    }

    const sanitizedContent = sanitizeInput(content, 5000)
    const sanitizedAuthor = sanitizeAuthor(author)
    if (!sanitizedContent) {
      return res.status(400).json({ error: 'Content is required' })
    }

    // IP-based duplicate content check
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown'
    if (checkIpSpam(ip, sanitizedContent)) {
      return res.status(429).json({ error: 'Duplicate message — please wait before sending the same content again.' })
    }

    // Check if user is banned from the community
    if (threadDoc.exists) {
      const communityId = threadDoc.data().communityId
      const { isUserBanned } = await import('../services/moderationService.js')
      const banStatus = await isUserBanned(communityId, sanitizedAuthor)
      if (banStatus) {
        return res.status(403).json({
          error: 'You are banned from this community',
          reason: banStatus.reason,
          expiresAt: banStatus.expiresAt,
        })
      }
    }

    let imageUrl = null

    // If there's an image, convert to base64 data URL
    if (req.file) {
      try {
        const base64 = req.file.buffer.toString('base64')
        imageUrl = `data:${req.file.mimetype};base64,${base64}`
      } catch (error) {
        console.error('Error processing reply image:', error.message)
        // Continue without image if processing fails
      }
    }

    const reply = await addReply(threadId, {
      content: sanitizedContent,
      author: sanitizedAuthor,
      imageUrl,
    })

    invalidatePopularCoinsCache()

    // Track member in the community (get communityId from the reply's thread)
    const thread = await getThreadById(threadId)
    if (thread) {
      trackMember(thread.communityId, { author: sanitizedAuthor, userId: req.userId }).catch(() => {})
    }

    // Send response to client first
    res.status(201).json(reply.toJSON())

    // Broadcast to WebSocket after HTTP response
    setImmediate(() => {
      broadcastToThread(threadId, 'thread-reply', reply.toJSON())
    })
  } catch (error) {
    console.error('Error adding reply:', error.message)
    res.status(500).json({ error: 'Failed to add reply' })
  }
}

// Upload image for a reply
export const uploadReplyImageHandler = async (req, res) => {
  try {
    const { replyId } = req.params

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' })
    }

    // Store as base64 data URL in Firestore
    const base64 = req.file.buffer.toString('base64')
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`

    const { getDb } = await import('../config/firebase.js')
    const db = getDb()
    await db.collection('replies').doc(replyId).update({ imageUrl: dataUrl })

    res.json({ imageUrl: dataUrl })
  } catch (error) {
    console.error('Error uploading reply image:', error.message)
    res.status(500).json({ error: 'Failed to upload image' })
  }
}

export default {
  createThreadHandler,
  uploadThreadImageHandler,
  getThreadsHandler,
  getThreadHandler,
  addReplyHandler,
  uploadReplyImageHandler,
}
