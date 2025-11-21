import {
  createThread,
  getThreadsByCommunity,
  getThreadById,
  getRepliesByThread,
  addReply,
  getThreadWithPreview,
} from '../services/threadService.js'
import { supabaseAdmin } from '../config/supabase.js'

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

    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Storage not configured' })
    }

    // Upload to Supabase Storage
    const fileExt = req.file.originalname.split('.').pop()
    const fileName = `thread_${threadId}_${Date.now()}.${fileExt}`
    const filePath = `threads/${fileName}`

    const { data, error } = await supabaseAdmin.storage
      .from('community-images')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      })

    if (error) {
      console.error('Supabase storage error:', error)
      return res.status(500).json({ error: 'Failed to upload image' })
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('community-images')
      .getPublicUrl(filePath)

    res.json({ imageUrl: urlData.publicUrl })
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

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' })
    }

    const reply = await addReply(threadId, {
      content: content.trim(),
      author: author || 'Anonymous',
      imageUrl: null, // Will be added via separate image upload endpoint
    })

    res.status(201).json(reply.toJSON())
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

    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Storage not configured' })
    }

    // Upload to Supabase Storage
    const fileExt = req.file.originalname.split('.').pop()
    const fileName = `reply_${replyId}_${Date.now()}.${fileExt}`
    const filePath = `replies/${fileName}`

    const { data, error } = await supabaseAdmin.storage
      .from('community-images')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      })

    if (error) {
      console.error('Supabase storage error:', error)
      return res.status(500).json({ error: 'Failed to upload image' })
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('community-images')
      .getPublicUrl(filePath)

    res.json({ imageUrl: urlData.publicUrl })
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
