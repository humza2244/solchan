import { query, getClient } from '../config/database.js'
import Thread from '../models/Thread.js'
import Reply from '../models/Reply.js'

// Create a new thread (OP post)
export const createThread = async (communityId, threadData) => {
  const client = await getClient()
  
  try {
    await client.query('BEGIN')
    
    // Get the next post number for this community (across all threads and replies)
    const postNumberResult = await client.query(
      `SELECT COALESCE(
        GREATEST(
          (SELECT MAX(post_number) FROM threads WHERE community_id = $1),
          (SELECT MAX(r.post_number) FROM replies r
           JOIN threads t ON r.thread_id = t.id
           WHERE t.community_id = $1)
        ), 0
      ) + 1 as next_post_number`,
      [communityId]
    )
    
    let postNumber = parseInt(postNumberResult.rows[0].next_post_number)
    
    // If this is the first post, start from a base number
    if (postNumber === 1) {
      postNumber = 1000000 + Math.floor(Date.now() % 1000000)
    }
    
    // Insert thread
    const result = await client.query(
      `INSERT INTO threads (community_id, subject, content, image_url, author, post_number, created_at, last_bump_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        communityId,
        threadData.subject,
        threadData.content,
        threadData.imageUrl || null,
        threadData.author || 'Anonymous',
        postNumber,
      ]
    )
    
    await client.query('COMMIT')
    return new Thread(result.rows[0])
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error creating thread:', error)
    throw error
  } finally {
    client.release()
  }
}

// Get threads for a community (bump order - most recently active first)
export const getThreadsByCommunity = async (communityId, limit = 50, offset = 0) => {
  const result = await query(
    `SELECT * FROM threads
     WHERE community_id = $1
     ORDER BY is_pinned DESC, last_bump_at DESC
     LIMIT $2 OFFSET $3`,
    [communityId, limit, offset]
  )
  
  return result.rows.map(row => new Thread(row))
}

// Get a single thread by ID
export const getThreadById = async (threadId) => {
  const result = await query(
    'SELECT * FROM threads WHERE id = $1',
    [threadId]
  )
  
  if (result.rows.length === 0) {
    return null
  }
  
  return new Thread(result.rows[0])
}

// Get replies for a thread
export const getRepliesByThread = async (threadId, limit = 100, offset = 0) => {
  const result = await query(
    `SELECT * FROM replies
     WHERE thread_id = $1
     ORDER BY created_at ASC
     LIMIT $2 OFFSET $3`,
    [threadId, limit, offset]
  )
  
  return result.rows.map(row => new Reply(row))
}

// Add a reply to a thread
export const addReply = async (threadId, replyData) => {
  const client = await getClient()
  
  try {
    await client.query('BEGIN')
    
    // Get the thread to find community_id
    const threadResult = await client.query(
      'SELECT community_id FROM threads WHERE id = $1',
      [threadId]
    )
    
    if (threadResult.rows.length === 0) {
      throw new Error('Thread not found')
    }
    
    const communityId = threadResult.rows[0].community_id
    
    // Get the next post number for this community
    const postNumberResult = await client.query(
      `SELECT COALESCE(
        GREATEST(
          (SELECT MAX(post_number) FROM threads WHERE community_id = $1),
          (SELECT MAX(r.post_number) FROM replies r
           JOIN threads t ON r.thread_id = t.id
           WHERE t.community_id = $1)
        ), 0
      ) + 1 as next_post_number`,
      [communityId]
    )
    
    const postNumber = parseInt(postNumberResult.rows[0].next_post_number)
    
    // Insert reply
    const result = await client.query(
      `INSERT INTO replies (thread_id, content, image_url, author, post_number, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        threadId,
        replyData.content,
        replyData.imageUrl || null,
        replyData.author || 'Anonymous',
        postNumber,
      ]
    )
    
    await client.query('COMMIT')
    return new Reply(result.rows[0])
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error adding reply:', error)
    throw error
  } finally {
    client.release()
  }
}

// Get recent replies for a thread (for preview on community page)
export const getRecentReplies = async (threadId, limit = 3) => {
  const result = await query(
    `SELECT * FROM replies
     WHERE thread_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [threadId, limit]
  )
  
  return result.rows.map(row => new Reply(row)).reverse()
}

// Get thread with recent replies (for community page preview)
export const getThreadWithPreview = async (threadId, replyLimit = 3) => {
  const thread = await getThreadById(threadId)
  if (!thread) {
    return null
  }
  
  const recentReplies = await getRecentReplies(threadId, replyLimit)
  
  return {
    ...thread.toJSON(),
    recentReplies: recentReplies.map(r => r.toJSON()),
  }
}

export default {
  createThread,
  getThreadsByCommunity,
  getThreadById,
  getRepliesByThread,
  addReply,
  getRecentReplies,
  getThreadWithPreview,
}

