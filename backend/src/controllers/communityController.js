import {
  createCommunity,
  getCommunityById,
  searchCommunities,
  getAllCommunities,
  getPopularCommunities,
  getMessages,
  addMessage,
  updateCommunityInfo,
  getKOTH,
  getCommunityMembers,
} from '../services/communityService.js'
import { uploadCommunityImage } from '../services/storageService.js'
import { invalidatePopularCoinsCache } from '../utils/cache.js'
import { escapeHtml, sanitizeInput, sanitizeAuthor } from '../utils/sanitize.js'

// POST /api/communities - Create a new community
export const createCommunityHandler = async (req, res) => {
  try {
    const { ticker, coinName, contractAddress, description, imageUrl } = req.body
    
    // Validate required fields
    if (!ticker || !coinName || !contractAddress) {
      return res.status(400).json({ error: 'Ticker, coin name, and contract address are required' })
    }
    
    const sanitizedTicker = sanitizeInput(ticker, 50)
    const sanitizedCoinName = sanitizeInput(coinName, 255)
    const sanitizedCA = sanitizeInput(contractAddress, 255)
    const sanitizedDescription = sanitizeInput(description, 1000)
    
    if (!sanitizedTicker || !sanitizedCoinName || !sanitizedCA) {
      return res.status(400).json({ error: 'Invalid input' })
    }
    
    if (sanitizedCA.length < 20) {
      return res.status(400).json({ error: 'Invalid contract address' })
    }
    
    // Create community
    const community = await createCommunity({
      ticker: sanitizedTicker,
      coinName: sanitizedCoinName,
      contractAddress: sanitizedCA,
      description: sanitizedDescription || null,
      imageUrl: imageUrl || null,
      creatorId: req.userId || null,
    })
    
    invalidatePopularCoinsCache()
    res.status(201).json(community.toJSON())
  } catch (error) {
    console.error('Error creating community:', error.message)
    res.status(500).json({ error: 'Failed to create community' })
  }
}

// GET /api/communities/search?q=ticker_or_ca
export const searchCommunitiesHandler = async (req, res) => {
  try {
    const { q } = req.query
    
    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' })
    }
    
    if (q.length > 255) {
      return res.status(400).json({ error: 'Search query too long' })
    }
    
    const communities = await searchCommunities(q)
    res.json(communities.map(c => c.toJSON()))
  } catch (error) {
    console.error('Error searching communities:', error.message)
    res.status(500).json({ error: 'Failed to search communities' })
  }
}

// GET /api/communities/:id
export const getCommunityHandler = async (req, res) => {
  try {
    const { id } = req.params
    
    const community = await getCommunityById(id)
    
    if (!community) {
      return res.status(404).json({ error: 'Community not found' })
    }
    
    // Load messages separately — don't break the page if this fails
    let messages = []
    try {
      messages = await getMessages(id, 100)
    } catch (msgError) {
      console.error('Warning: Could not load messages:', msgError.message)
    }
    
    res.json({
      community: community.toJSON(),
      messages: messages.map(m => m.toJSON()),
    })
  } catch (error) {
    console.error('Error fetching community:', error.message)
    res.status(500).json({ error: 'Failed to fetch community' })
  }
}

// GET /api/communities/:id/messages
export const getCommunityMessagesHandler = async (req, res) => {
  try {
    const { id } = req.params
    const limit = Math.min(parseInt(req.query.limit) || 100, 500)
    
    const messages = await getMessages(id, limit)
    res.json(messages.map(m => m.toJSON()))
  } catch (error) {
    console.error('Error fetching messages:', error.message)
    res.status(500).json({ error: 'Failed to fetch messages' })
  }
}

// POST /api/communities/:id/messages - Create a message
export const createMessageHandler = async (req, res) => {
  try {
    const { id } = req.params
    const { content, author } = req.body
    
    const sanitizedContent = sanitizeInput(content, 5000)
    if (!sanitizedContent) {
      return res.status(400).json({ error: 'Message content is required' })
    }
    
    const message = await addMessage(id, {
      content: sanitizedContent,
      author: sanitizeAuthor(author),
    }, null)
    
    invalidatePopularCoinsCache()
    res.status(201).json(message.toJSON())
  } catch (error) {
    console.error('Error creating message:', error.message)
    if (error.message === 'Community not found') {
      return res.status(404).json({ error: 'Community not found' })
    }
    res.status(500).json({ error: 'Failed to create message' })
  }
}

// GET /api/communities - Get all or popular communities
export const getAllCommunitiesHandler = async (req, res) => {
  try {
    const popular = req.query.popular === 'true'
    const limit = Math.min(parseInt(req.query.limit) || 50, 100)
    
    let communities
    if (popular) {
      communities = await getPopularCommunities(limit)
    } else {
      communities = await getAllCommunities(limit)
    }
    
    res.json(communities.map(c => c.toJSON()))
  } catch (error) {
    console.error('Error fetching communities:', error.message)
    res.status(500).json({ error: 'Failed to fetch communities' })
  }
}

// POST /api/communities/:id/image - Upload community image
export const uploadCommunityImageHandler = async (req, res) => {
  try {
    const { id } = req.params
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' })
    }
    
    const community = await getCommunityById(id)
    if (!community) {
      return res.status(404).json({ error: 'Community not found' })
    }
    
    const publicUrl = await uploadCommunityImage(
      id,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    )
    
    const updatedCommunity = await updateCommunityInfo(id, { imageUrl: publicUrl })
    res.json({ imageUrl: publicUrl, community: updatedCommunity.toJSON() })
  } catch (error) {
    console.error('Error uploading image:', error.message)
    res.status(500).json({ error: 'Failed to upload image' })
  }
}

// GET /api/communities/koth - Get King of the Hill
export const getKOTHHandler = async (req, res) => {
  try {
    const koth = await getKOTH()
    
    if (!koth) {
      const popularCommunities = await getPopularCommunities(1)
      if (popularCommunities.length > 0) {
        return res.json(popularCommunities[0].toJSON())
      }
      return res.json(null)
    }
    
    res.json(koth.toJSON())
  } catch (error) {
    console.error('Error fetching KOTH:', error.message)
    res.status(500).json({ error: 'Failed to fetch KOTH' })
  }
}

// GET /api/communities/:id/members - Get community members
export const getCommunityMembersHandler = async (req, res) => {
  try {
    const { id } = req.params
    const limit = Math.min(parseInt(req.query.limit) || 100, 500)
    
    const members = await getCommunityMembers(id, limit)
    res.json(members)
  } catch (error) {
    console.error('Error fetching community members:', error.message)
    res.status(500).json({ error: 'Failed to fetch community members' })
  }
}

export default {
  createCommunityHandler,
  searchCommunitiesHandler,
  getCommunityHandler,
  getCommunityMessagesHandler,
  createMessageHandler,
  getAllCommunitiesHandler,
  uploadCommunityImageHandler,
  getKOTHHandler,
  getCommunityMembersHandler,
}
