import { query, getClient } from '../config/database.js'
import Coin from '../models/Coin.js'
import Message from '../models/Message.js'

// Get or create a coin community
export const getOrCreateCoin = async (contractAddress) => {
  const ca = contractAddress.toLowerCase()
  
  // Try to get existing coin
  const existingCoin = await query(
    'SELECT * FROM coins WHERE contract_address = $1',
    [ca]
  )
  
  if (existingCoin.rows.length > 0) {
    const row = existingCoin.rows[0]
    return new Coin({
      contractAddress: row.contract_address,
      name: row.name,
      symbol: row.symbol,
      createdAt: row.created_at,
      messageCount: row.message_count,
      lastMessageAt: row.last_message_at,
    })
  }
  
  // Create new coin
  const result = await query(
    `INSERT INTO coins (contract_address, created_at, message_count)
     VALUES ($1, CURRENT_TIMESTAMP, 0)
     ON CONFLICT (contract_address) DO NOTHING
     RETURNING *`,
    [ca]
  )
  
  if (result.rows.length === 0) {
    // Coin was created by another request, fetch it
    const coin = await query(
      'SELECT * FROM coins WHERE contract_address = $1',
      [ca]
    )
    const row = coin.rows[0]
    return new Coin({
      contractAddress: row.contract_address,
      name: row.name,
      symbol: row.symbol,
      createdAt: row.created_at,
      messageCount: row.message_count,
      lastMessageAt: row.last_message_at,
    })
  }
  
  const row = result.rows[0]
  return new Coin({
    contractAddress: row.contract_address,
    name: row.name,
    symbol: row.symbol,
    createdAt: row.created_at,
    messageCount: row.message_count,
    lastMessageAt: row.last_message_at,
  })
}

// Get coin by contract address
export const getCoin = async (contractAddress) => {
  const ca = contractAddress.toLowerCase()
  const result = await query(
    'SELECT * FROM coins WHERE contract_address = $1',
    [ca]
  )
  
  if (result.rows.length === 0) {
    return null
  }
  
  const row = result.rows[0]
  return new Coin({
    contractAddress: row.contract_address,
    name: row.name,
    symbol: row.symbol,
    createdAt: row.created_at,
    messageCount: row.message_count,
    lastMessageAt: row.last_message_at,
  })
}

// Get all coins
export const getAllCoins = async () => {
  const result = await query('SELECT * FROM coins ORDER BY created_at DESC')
  return result.rows.map(row => ({
    contractAddress: row.contract_address,
    name: row.name,
    symbol: row.symbol,
    createdAt: row.created_at,
    messageCount: row.message_count,
    lastMessageAt: row.last_message_at,
  }))
}

// Get messages for a coin
export const getMessages = async (contractAddress, limit = 100) => {
  const ca = contractAddress.toLowerCase()
  const result = await query(
    `SELECT * FROM messages 
     WHERE contract_address = $1 
     ORDER BY created_at DESC 
     LIMIT $2`,
    [ca, limit]
  )
  
  return result.rows.map(row => ({
    id: row.id.toString(),
    postNumber: row.post_number,
    contractAddress: row.contract_address,
    content: row.content,
    author: row.author,
    createdAt: row.created_at,
  })).reverse() // Reverse to show oldest first
}

// Add message to a coin community
export const addMessage = async (contractAddress, messageData) => {
  const ca = contractAddress.toLowerCase()
  const client = await getClient()
  
  try {
    await client.query('BEGIN')
    
    // Ensure coin exists (within transaction)
    const coinCheck = await client.query(
      'SELECT * FROM coins WHERE contract_address = $1',
      [ca]
    )
    
    if (coinCheck.rows.length === 0) {
      // Create coin if it doesn't exist
      await client.query(
        `INSERT INTO coins (contract_address, created_at, message_count)
         VALUES ($1, CURRENT_TIMESTAMP, 0)
         ON CONFLICT (contract_address) DO NOTHING`,
        [ca]
      )
    }
    
    // Get the next post number for this coin
    const postNumberResult = await client.query(
      `SELECT COALESCE(MAX(post_number), 0) + 1 as next_post_number
       FROM messages
       WHERE contract_address = $1`,
      [ca]
    )
    
    let postNumber = parseInt(postNumberResult.rows[0].next_post_number)
    
    // If this is the first message, start from a base number
    if (postNumber === 1) {
      postNumber = 1000000 + Date.now() % 1000000
    }
    
    // Insert message
    const messageResult = await client.query(
      `INSERT INTO messages (post_number, contract_address, content, author, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        postNumber,
        ca,
        messageData.content.trim(),
        messageData.author || 'Anonymous',
      ]
    )
    
    // Commit transaction
    await client.query('COMMIT')
    
    const row = messageResult.rows[0]
    return new Message({
      id: row.id.toString(),
      postNumber: row.post_number,
      contractAddress: row.contract_address,
      content: row.content,
      author: row.author,
      createdAt: row.created_at,
    })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// Update coin info (name, symbol)
export const updateCoinInfo = async (contractAddress, info) => {
  const ca = contractAddress.toLowerCase()
  
  const updates = []
  const values = []
  let paramCount = 1
  
  if (info.name !== undefined) {
    updates.push(`name = $${paramCount++}`)
    values.push(info.name)
  }
  
  if (info.symbol !== undefined) {
    updates.push(`symbol = $${paramCount++}`)
    values.push(info.symbol)
  }
  
  if (updates.length === 0) {
    return await getCoin(ca)
  }
  
  values.push(ca)
  
  const result = await query(
    `UPDATE coins 
     SET ${updates.join(', ')}
     WHERE contract_address = $${paramCount}
     RETURNING *`,
    values
  )
  
  if (result.rows.length === 0) {
    // Coin doesn't exist, create it first
    await getOrCreateCoin(ca)
    return await updateCoinInfo(ca, info)
  }
  
  const row = result.rows[0]
  return new Coin({
    contractAddress: row.contract_address,
    name: row.name,
    symbol: row.symbol,
    createdAt: row.created_at,
    messageCount: row.message_count,
    lastMessageAt: row.last_message_at,
  })
}

// Get recent coins (by last message time)
export const getRecentCoins = async (limit = 20) => {
  const result = await query(
    `SELECT * FROM coins 
     WHERE last_message_at IS NOT NULL 
     ORDER BY last_message_at DESC 
     LIMIT $1`,
    [limit]
  )
  
  return result.rows.map(row => ({
    contractAddress: row.contract_address,
    name: row.name,
    symbol: row.symbol,
    createdAt: row.created_at,
    messageCount: row.message_count,
    lastMessageAt: row.last_message_at,
  }))
}

// Get popular coins based on messages in the past 24 hours
export const getPopularCoins = async (limit = 50) => {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  
  const result = await query(
    `SELECT 
      c.*,
      COUNT(m.id) as recent_message_count
    FROM coins c
    INNER JOIN messages m ON c.contract_address = m.contract_address
    WHERE m.created_at >= $1
    GROUP BY c.contract_address
    HAVING COUNT(m.id) > 0
    ORDER BY recent_message_count DESC
    LIMIT $2`,
    [twentyFourHoursAgo, limit]
  )
  
  return result.rows.map(row => ({
    contractAddress: row.contract_address,
    name: row.name,
    symbol: row.symbol,
    createdAt: row.created_at,
    messageCount: row.message_count,
    lastMessageAt: row.last_message_at,
    recentMessageCount: parseInt(row.recent_message_count),
  }))
}

export default {
  getOrCreateCoin,
  getCoin,
  getAllCoins,
  getMessages,
  addMessage,
  updateCoinInfo,
  getRecentCoins,
  getPopularCoins,
}

