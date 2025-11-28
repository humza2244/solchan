import { query, getClient } from '../config/database.js'
import Community from '../models/Community.js'
import Message from '../models/Message.js'

// Create a new community
export const createCommunity = async (communityData) => {
  const result = await query(
    `INSERT INTO communities (ticker, coin_name, contract_address, description, image_url, creator_id, created_at, message_count, unique_users_count)
     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, 0, 0)
     RETURNING *`,
    [
      communityData.ticker,
      communityData.coinName,
      communityData.contractAddress.toLowerCase(),
      communityData.description,
      communityData.imageUrl,
      communityData.creatorId,
    ]
  )
  
  return new Community(result.rows[0])
}

// Get community by ID
export const getCommunityById = async (id) => {
  const result = await query(
    'SELECT * FROM communities WHERE id = $1',
    [id]
  )
  
  if (result.rows.length === 0) {
    return null
  }
  
  return new Community(result.rows[0])
}

// Search communities by ticker or contract address
export const searchCommunities = async (searchTerm) => {
  const search = searchTerm.toLowerCase().trim()
  
  const result = await query(
    `SELECT 
      c.*,
      COUNT(DISTINCT CASE 
        WHEN t.created_at >= NOW() - INTERVAL '24 hours' 
        THEN t.id 
      END) + COUNT(DISTINCT CASE 
        WHEN r.created_at >= NOW() - INTERVAL '24 hours' 
        THEN r.id 
      END) as activity_24h
    FROM communities c
    LEFT JOIN threads t ON c.id = t.community_id
    LEFT JOIN replies r ON t.id = r.thread_id AND r.created_at >= NOW() - INTERVAL '24 hours'
    WHERE LOWER(c.ticker) = $1 OR LOWER(c.contract_address) = $1
    GROUP BY c.id
    ORDER BY 
      (c.message_count * 1 + 
       (COUNT(DISTINCT CASE WHEN t.created_at >= NOW() - INTERVAL '24 hours' THEN t.id END) + 
        COUNT(DISTINCT CASE WHEN r.created_at >= NOW() - INTERVAL '24 hours' THEN r.id END)) * 5) DESC,
      c.created_at DESC`,
    [search]
  )
  
  return result.rows.map(row => {
    const community = new Community(row)
    community.messages24h = parseInt(row.activity_24h) || 0
    community.popularityScore = community.getPopularityScore(community.messages24h)
    return community
  })
}

// Get all communities (for browsing)
export const getAllCommunities = async (limit = 50) => {
  const result = await query(
    `SELECT 
      c.*,
      COUNT(DISTINCT CASE 
        WHEN t.created_at >= NOW() - INTERVAL '24 hours' 
        THEN t.id 
      END) + COUNT(DISTINCT CASE 
        WHEN r.created_at >= NOW() - INTERVAL '24 hours' 
        THEN r.id 
      END) as activity_24h
    FROM communities c
    LEFT JOIN threads t ON c.id = t.community_id
    LEFT JOIN replies r ON t.id = r.thread_id AND r.created_at >= NOW() - INTERVAL '24 hours'
    GROUP BY c.id
    ORDER BY c.created_at DESC
    LIMIT $1`,
    [limit]
  )
  
  return result.rows.map(row => {
    const community = new Community(row)
    community.messages24h = parseInt(row.activity_24h) || 0
    return community
  })
}

// Get popular communities
export const getPopularCommunities = async (limit = 50) => {
  console.log('🔍 getPopularCommunities called with limit:', limit)
  
  const result = await query(
    `SELECT 
      c.*,
      COUNT(DISTINCT CASE 
        WHEN t.created_at >= NOW() - INTERVAL '24 hours' 
        THEN t.id 
      END) + COUNT(DISTINCT CASE 
        WHEN r.created_at >= NOW() - INTERVAL '24 hours' 
        THEN r.id 
      END) as activity_24h,
      COUNT(DISTINCT t.id) as total_threads,
      COUNT(DISTINCT r.id) as total_replies
    FROM communities c
    LEFT JOIN threads t ON c.id = t.community_id
    LEFT JOIN replies r ON t.id = r.thread_id
    GROUP BY c.id
    ORDER BY 
      -- Weight recent activity heavily, but also consider total activity
      (COUNT(DISTINCT CASE WHEN t.created_at >= NOW() - INTERVAL '24 hours' THEN t.id END) + 
       COUNT(DISTINCT CASE WHEN r.created_at >= NOW() - INTERVAL '24 hours' THEN r.id END)) * 10 +
      c.message_count * 1 +
      (COUNT(DISTINCT t.id) + COUNT(DISTINCT r.id)) * 2 DESC,
      c.created_at DESC
    LIMIT $1`,
    [limit]
  )
  
  console.log('📊 Popular communities found:', result.rows.length)
  
  const communities = result.rows.map(row => {
    const community = new Community(row)
    community.messages24h = parseInt(row.activity_24h) || 0
    community.totalThreads = parseInt(row.total_threads) || 0
    community.totalReplies = parseInt(row.total_replies) || 0
    community.popularityScore = community.getPopularityScore(community.messages24h)
    return community
  })
  
  console.log('✅ Returning popular communities:', communities.map(c => ({ 
    id: c.id, 
    ticker: c.ticker, 
    activity24h: c.messages24h,
    totalThreads: c.totalThreads,
    totalReplies: c.totalReplies
  })))
  
  return communities
}

// Get messages for a community with usernames
export const getMessages = async (communityId, limit = 100) => {
  const result = await query(
    `SELECT 
      m.*,
      up.username
     FROM messages m
     LEFT JOIN user_profiles up ON m.user_id = up.user_id
     WHERE m.community_id = $1 
     ORDER BY m.created_at DESC 
     LIMIT $2`,
    [communityId, limit]
  )
  
  return result.rows.map(row => {
    const message = new Message(row)
    message.username = row.username || null
    return message
  }).reverse()
}

// Add message to a community
export const addMessage = async (communityId, messageData, userId = null) => {
  console.log('🔍 addMessage called with:', { communityId, userId, author: messageData.author, contentLength: messageData.content?.length })
  
  const client = await getClient()
  
  try {
    await client.query('BEGIN')
    console.log('🔄 Transaction started')
    
    // Verify community exists
    const communityCheck = await client.query(
      'SELECT * FROM communities WHERE id = $1',
      [communityId]
    )
    
    if (communityCheck.rows.length === 0) {
      console.error('❌ Community not found:', communityId)
      throw new Error('Community not found')
    }
    console.log('✅ Community exists:', communityCheck.rows[0].ticker)
    
    // Get the next post number for this community
    const postNumberResult = await client.query(
      `SELECT COALESCE(MAX(post_number), 0) + 1 as next_post_number
       FROM messages
       WHERE community_id = $1`,
      [communityId]
    )
    
    let postNumber = parseInt(postNumberResult.rows[0].next_post_number)
    
    // If this is the first message, start from a base number
    if (postNumber === 1) {
      postNumber = 1000000 + Math.floor(Date.now() % 1000000)
    }
    
    console.log('🔢 Post number assigned:', postNumber)
    
    // Insert message
    const messageResult = await client.query(
      `INSERT INTO messages (post_number, community_id, content, user_id, author, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        postNumber,
        communityId,
        messageData.content.trim(),
        userId,
        messageData.author || 'Anonymous',
      ]
    )
    
    console.log('✅ Message inserted, ID:', messageResult.rows[0].id)
    
    // Commit transaction
    await client.query('COMMIT')
    console.log('✅ Transaction committed')
    
    const message = new Message(messageResult.rows[0])
    console.log('✅ Message object created:', message.toJSON())
    
    return message
  } catch (error) {
    console.error('❌ Error in addMessage:', error)
    await client.query('ROLLBACK')
    console.log('🔄 Transaction rolled back')
    throw error
  } finally {
    client.release()
    console.log('🔓 Database client released')
  }
}

// Update community info
export const updateCommunityInfo = async (id, updateData) => {
  const updates = []
  const values = []
  let paramCount = 1
  
  if (updateData.ticker !== undefined) {
    updates.push(`ticker = $${paramCount++}`)
    values.push(updateData.ticker)
  }
  
  if (updateData.coinName !== undefined) {
    updates.push(`coin_name = $${paramCount++}`)
    values.push(updateData.coinName)
  }
  
  if (updateData.description !== undefined) {
    updates.push(`description = $${paramCount++}`)
    values.push(updateData.description)
  }
  
  if (updateData.imageUrl !== undefined) {
    updates.push(`image_url = $${paramCount++}`)
    values.push(updateData.imageUrl)
  }
  
  if (updates.length === 0) {
    return await getCommunityById(id)
  }
  
  values.push(id)
  
  const result = await query(
    `UPDATE communities 
     SET ${updates.join(', ')}
     WHERE id = $${paramCount}
     RETURNING *`,
    values
  )
  
  if (result.rows.length === 0) {
    return null
  }
  
  return new Community(result.rows[0])
}

// Get KOTH (King of the Hill) - one-time achievement
export const getKOTH = async () => {
  console.log('👑 getKOTH called')
  
  try {
    // First, check if there's already a KOTH (return the FIRST one crowned)
    const currentKothResult = await query(
      `SELECT * FROM communities 
       WHERE has_been_koth = TRUE 
       ORDER BY became_koth_at ASC 
       LIMIT 1`,
      []
    )
    
    // If there's already a KOTH, return it (the first one crowned, forever)
    if (currentKothResult.rows.length > 0) {
      console.log('👑 Returning existing KOTH (first crowned):', currentKothResult.rows[0].ticker)
      return new Community(currentKothResult.rows[0])
    }
    
    // No KOTH yet, find the most active eligible community
    // Use simpler query with subqueries instead of complex joins
    const result = await query(
      `SELECT 
        c.*,
        (SELECT COUNT(*) FROM threads WHERE community_id = c.id) as total_threads
      FROM communities c
      WHERE has_been_koth = FALSE
      ORDER BY 
        (SELECT COUNT(*) FROM threads WHERE community_id = c.id) DESC,
        c.created_at DESC
      LIMIT 1`,
      []
    )
    
    if (result.rows.length === 0) {
      console.log('👑 No eligible KOTH found (no communities yet)')
      return null
    }
    
    const community = new Community(result.rows[0])
    
    // Mark this community as having been KOTH (with timestamp)
    await query(
      'UPDATE communities SET has_been_koth = TRUE, became_koth_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [community.id]
    )
    
    console.log('👑 NEW KOTH crowned:', community.ticker, '(ID:', community.id, ')')
    
    return community
  } catch (error) {
    console.error('❌ Error in getKOTH:', error)
    // If column doesn't exist, return null gracefully
    if (error.message?.includes('has_been_koth') || error.message?.includes('column')) {
      console.error('⚠️  has_been_koth column not found - run migrations!')
      return null
    }
    throw error
  }
}

export default {
  createCommunity,
  getCommunityById,
  searchCommunities,
  getAllCommunities,
  getPopularCommunities,
  getMessages,
  addMessage,
  updateCommunityInfo,
  getKOTH,
}

