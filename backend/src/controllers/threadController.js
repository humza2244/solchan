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

// Create a new thread
export const createThreadHandler = async (req, res) => {
  try {
    const { communityId } = req.params
    const { subject, content, author } = req.body

    if (!subject || !subject.trim()) {
      return res.status(400).json({ error: 'Subject is required' })
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' })
    }

    const thread = await createThread(communityId, {
      subject: subject.trim(),
      content: content.trim(),
      author: author || 'Anonymous',
      imageUrl: null, // Will be added via separate image upload endpoint
    })

    res.status(201).json(thread.toJSON())
  } catch (error) {
    console.error('Error creating thread:', error)
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

    // Upload to Cloudflare R2
    const publicUrl = await uploadThreadImage(
      threadId,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    )

    // Update thread with image URL
    const { query } = await import('../config/database.js')
    await query(
      'UPDATE threads SET image_url = $1 WHERE id = $2',
      [publicUrl, threadId]
    )

    res.json({ imageUrl: publicUrl })
  } catch (error) {
    console.error('Error uploading thread image:', error)
    res.status(500).json({ error: 'Failed to upload image' })
  }
}

// Get threads for a community
export const getThreadsHandler = async (req, res) => {
  try {
    const { communityId } = req.params
    const limit = parseInt(req.query.limit) || 50
    const offset = parseInt(req.query.offset) || 0
    const withPreview = req.query.preview === 'true'

    const threads = await getThreadsByCommunity(communityId, limit, offset)

    if (withPreview) {
      // Get recent replies for each thread
      const threadsWithPreviews = await Promise.all(
        threads.map(thread => getThreadWithPreview(thread.id, 3))
      )
      res.json(threadsWithPreviews)
    } else {
      res.json(threads.map(t => t.toJSON()))
    }
  } catch (error) {
    console.error('Error fetching threads:', error)
    res.status(500).json({ error: 'Failed to fetch threads' })
  }
}

// Get a single thread with all replies
export const getThreadHandler = async (req, res) => {
  try {
    const { threadId } = req.params

    const thread = await getThreadById(threadId)
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' })
    }

    const replies = await getRepliesByThread(threadId, 1000) // Get all replies

    res.json({
      thread: thread.toJSON(),
      replies: replies.map(r => r.toJSON()),
    })
  } catch (error) {
    console.error('Error fetching thread:', error)
    res.status(500).json({ error: 'Failed to fetch thread' })
  }
}

// Add a reply to a thread
export const addReplyHandler = async (req, res) => {
  try {
    const { threadId } = req.params
    const { content, author } = req.body

    console.log('📨 addReplyHandler called:', { threadId, content, author, hasFile: !!req.file })

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' })
    }

    let imageUrl = null

    // If there's an image, upload it to R2 first
    if (req.file) {
      try {
        const fileName = `replies/${Date.now()}-${Math.random().toString(36).substring(7)}-${req.file.originalname}`
        imageUrl = await uploadToR2(req.file.buffer, fileName, req.file.mimetype)
        console.log('✅ Reply image uploaded:', imageUrl)
      } catch (error) {
        console.error('❌ Error uploading reply image:', error)
        // Continue without image if upload fails
      }
    }

    const reply = await addReply(threadId, {
      content: content.trim(),
      author: author || 'Anonymous',
      imageUrl,
    })

    console.log('✅ Reply created with image:', reply.toJSON())

    // Invalidate cache (thread bumps affect community stats)
    invalidatePopularCoinsCache()

    // Send response to client FIRST
    res.status(201).json(reply.toJSON())

    // Broadcast to all users AFTER sending response (prevents race condition)
    // Use setImmediate to ensure HTTP response is sent first
    setImmediate(() => {
      broadcastToThread(threadId, 'thread-reply', reply.toJSON())
    })
  } catch (error) {
    console.error('Error adding reply:', error)
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

    // Upload to Cloudflare R2
    const publicUrl = await uploadReplyImage(
      replyId,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    )

    // Update reply with image URL
    const { query } = await import('../config/database.js')
    await query(
      'UPDATE replies SET image_url = $1 WHERE id = $2',
      [publicUrl, replyId]
    )

    res.json({ imageUrl: publicUrl })
  } catch (error) {
    console.error('Error uploading reply image:', error)
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
