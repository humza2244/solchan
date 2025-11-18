// In-memory store for coins and messages
import Coin from '../models/Coin.js'
import Message from '../models/Message.js'

// Store coins by contract address
const coins = new Map()

// Store messages by contract address
const messages = new Map()

// Get or create a coin community
export const getOrCreateCoin = (contractAddress) => {
  const ca = contractAddress.toLowerCase()
  
  if (!coins.has(ca)) {
    const coin = new Coin({
      contractAddress: ca,
      createdAt: new Date(),
    })
    coins.set(ca, coin)
    messages.set(ca, [])
  }
  
  return coins.get(ca)
}

// Get coin by contract address
export const getCoin = (contractAddress) => {
  const ca = contractAddress.toLowerCase()
  return coins.get(ca) || null
}

// Get all coins
export const getAllCoins = () => {
  return Array.from(coins.values()).map(coin => coin.toJSON())
}

// Get messages for a coin
export const getMessages = (contractAddress, limit = 100) => {
  const ca = contractAddress.toLowerCase()
  const coinMessages = messages.get(ca) || []
  
  // Return last N messages
  return coinMessages.slice(-limit).map(msg => msg.toJSON())
}

// Add message to a coin community
export const addMessage = (contractAddress, messageData) => {
  const ca = contractAddress.toLowerCase()
  
  // Get or create coin
  const coin = getOrCreateCoin(ca)
  
  // Add to messages array
  if (!messages.has(ca)) {
    messages.set(ca, [])
  }
  
  const coinMessages = messages.get(ca)
  
  // Generate post number (sequential based on existing messages)
  let postNumber
  if (coinMessages.length > 0) {
    const maxPostNumber = Math.max(...coinMessages.map(m => {
      const num = m.postNumber || parseInt(m.id)
      return isNaN(num) ? 0 : num
    }))
    postNumber = maxPostNumber + 1
  } else {
    // First post gets a base number
    postNumber = 1000000 + Date.now() % 1000000
  }
  
  // Create message
  const message = new Message({
    ...messageData,
    postNumber,
    contractAddress: ca,
    createdAt: new Date(),
  })
  
  coinMessages.push(message)
  
  // Update coin stats
  coin.messageCount = coinMessages.length
  coin.lastMessageAt = new Date()
  
  return message
}

// Update coin info (name, symbol)
export const updateCoinInfo = (contractAddress, info) => {
  const ca = contractAddress.toLowerCase()
  const coin = getOrCreateCoin(ca)
  
  if (info.name) coin.name = info.name
  if (info.symbol) coin.symbol = info.symbol
  
  return coin
}

// Get recent coins (by last message time)
export const getRecentCoins = (limit = 20) => {
  return Array.from(coins.values())
    .filter(coin => coin.lastMessageAt !== null)
    .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
    .slice(0, limit)
    .map(coin => coin.toJSON())
}

// Get popular coins based on messages in the past 24 hours
export const getPopularCoins = (limit = 50) => {
  const now = new Date()
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  
  // Calculate message count in past 24h for each coin
  const coinsWithActivity = Array.from(coins.values()).map(coin => {
    const ca = coin.contractAddress.toLowerCase()
    const coinMessages = messages.get(ca) || []
    
    // Count messages in the past 24 hours
    const recentMessages = coinMessages.filter(msg => {
      const msgDate = new Date(msg.createdAt)
      return msgDate >= twentyFourHoursAgo
    })
    
    return {
      ...coin.toJSON(),
      recentMessageCount: recentMessages.length,
    }
  })
  
  // Filter out coins with no recent activity and sort by recent message count
  return coinsWithActivity
    .filter(coin => coin.recentMessageCount > 0)
    .sort((a, b) => b.recentMessageCount - a.recentMessageCount)
    .slice(0, limit)
    .map(({ recentMessageCount, ...coin }) => ({
      ...coin,
      recentMessageCount, // Include the count in the response
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

