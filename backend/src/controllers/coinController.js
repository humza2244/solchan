import { getOrCreateCoin, getCoin, getMessages, addMessage, updateCoinInfo, getRecentCoins, getPopularCoins } from '../services/coinService.js'
import { getCachedPopularCoins, setCachedPopularCoins, invalidatePopularCoinsCache } from '../utils/cache.js'

// GET /api/coins/:contractAddress
export const getCoinCommunity = async (req, res) => {
  try {
    const { contractAddress } = req.params
    
    if (!contractAddress || contractAddress.length < 20) {
      return res.status(400).json({ error: 'Invalid contract address' })
    }
    
    // Get or create coin (auto-create if doesn't exist)
    const coin = await getOrCreateCoin(contractAddress)
    
    // Get messages
    const messages = await getMessages(contractAddress, 100)
    
    res.json({
      coin: coin.toJSON(),
      messages,
    })
  } catch (error) {
    console.error('Error fetching coin community:', error)
    res.status(500).json({ error: 'Failed to fetch coin community' })
  }
}

// GET /api/coins/:contractAddress/messages
export const getCoinMessages = async (req, res) => {
  try {
    const { contractAddress } = req.params
    const limit = parseInt(req.query.limit) || 100
    
    if (!contractAddress) {
      return res.status(400).json({ error: 'Contract address is required' })
    }
    
    const messages = await getMessages(contractAddress, limit)
    res.json(messages)
  } catch (error) {
    console.error('Error fetching messages:', error)
    res.status(500).json({ error: 'Failed to fetch messages' })
  }
}

// POST /api/coins/:contractAddress/messages
export const createMessage = async (req, res) => {
  try {
    const { contractAddress } = req.params
    const { content, author } = req.body
    
    if (!contractAddress) {
      return res.status(400).json({ error: 'Contract address is required' })
    }
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' })
    }
    
    // Get or create coin
    await getOrCreateCoin(contractAddress)
    
    // Add message
    const message = await addMessage(contractAddress, {
      content: content.trim(),
      author: author || 'Anonymous',
    })
    
    // Invalidate popular coins cache since activity has changed
    invalidatePopularCoinsCache()
    
    res.status(201).json(message.toJSON())
  } catch (error) {
    console.error('Error creating message:', error)
    res.status(500).json({ error: 'Failed to create message' })
  }
}

// PUT /api/coins/:contractAddress
export const updateCoin = async (req, res) => {
  try {
    const { contractAddress } = req.params
    const { name, symbol } = req.body
    
    if (!contractAddress) {
      return res.status(400).json({ error: 'Contract address is required' })
    }
    
    const coin = await updateCoinInfo(contractAddress, { name, symbol })
    res.json(coin.toJSON())
  } catch (error) {
    console.error('Error updating coin:', error)
    res.status(500).json({ error: 'Failed to update coin' })
  }
}

// GET /api/coins
export const getAllCoins = async (req, res) => {
  try {
    const recent = req.query.recent === 'true'
    const popular = req.query.popular === 'true'
    
    if (popular) {
      const limit = parseInt(req.query.limit) || 50
      
      // Check cache first
      const cachedCoins = getCachedPopularCoins(limit)
      if (cachedCoins) {
        return res.json(cachedCoins)
      }
      
      // Fetch from database
      const coins = await getPopularCoins(limit)
      
      // Cache the result
      setCachedPopularCoins(coins, limit)
      
      res.json(coins)
    } else if (recent) {
      const coins = await getRecentCoins(20)
      res.json(coins)
    } else {
      // For now, return recent coins
      const coins = await getRecentCoins(50)
      res.json(coins)
    }
  } catch (error) {
    console.error('Error fetching coins:', error)
    res.status(500).json({ error: 'Failed to fetch coins' })
  }
}

