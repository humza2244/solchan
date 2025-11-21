import {
  createCommunity,
  getCommunityById,
  searchCommunities,
  getAllCommunities,
  getPopularCommunities,
  getMessages,
  addMessage,
  updateCommunityInfo,
} from '../services/communityService.js'
import { uploadCommunityImage } from '../services/storageService.js'
import { invalidatePopularCoinsCache } from '../utils/cache.js'

// POST /api/communities - Create a new community (requires auth)
export const createCommunityHandler = async (req, res) => {
  try {
    const { ticker, coinName, contractAddress, description, imageUrl } = req.body
    
    // Validate required fields
    if (!ticker || !coinName || !contractAddress) {
      return res.status(400).json({ error: 'Ticker, coin name, and contract address are required' })
    }
    
    if (contractAddress.length < 20) {
      return res.status(400).json({ error: 'Invalid contract address' })
    }
    
    // Anonymous creation (no auth required)
    const userId = null
    
    // Create community
    const community = await createCommunity({
      ticker: ticker.trim(),
      coinName: coinName.trim(),
      contractAddress: contractAddress.trim(),
      description: description?.trim() || null,
      imageUrl: imageUrl || null,
      creatorId: userId,
    })
    
    // Invalidate cache
    invalidatePopularCoinsCache()
    
    res.status(201).json(community.toJSON())
  } catch (error) {
    console.error('Error creating community:', error)
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
    
    const communities = await searchCommunities(q)
    res.json(communities.map(c => c.toJSON()))
  } catch (error) {
    console.error('Error searching communities:', error)
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
    
    // Get messages
    const messages = await getMessages(id, 100)
    
    res.json({
      community: community.toJSON(),
      messages: messages.map(m => m.toJSON()),
    })
  } catch (error) {
    console.error('Error fetching community:', error)
    res.status(500).json({ error: 'Failed to fetch community' })
  }
}

// GET /api/communities/:id/messages
export const getCommunityMessagesHandler = async (req, res) => {
  try {
    const { id } = req.params
    const limit = parseInt(req.query.limit) || 100
    
    const messages = await getMessages(id, limit)
    res.json(messages.map(m => m.toJSON()))
  } catch (error) {
    console.error('Error fetching messages:', error)
    res.status(500).json({ error: 'Failed to fetch messages' })
  }
}

// POST /api/communities/:id/messages - Create a message (requires auth)
export const createMessageHandler = async (req, res) => {
  try {
    const { id } = req.params
    const { content, author } = req.body
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' })
    }
    
    if (content.length > 5000) {
      return res.status(400).json({ error: 'Message is too long (max 5000 characters)' })
    }
    
    // Anonymous messaging (no auth required)
    const userId = null
    
    // Add message
    const message = await addMessage(id, {
      content: content.trim(),
      author: author || 'Anonymous',
    }, userId)
    
    // Invalidate cache
    invalidatePopularCoinsCache()
    
    res.status(201).json(message.toJSON())
  } catch (error) {
    console.error('Error creating message:', error)
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
    const limit = parseInt(req.query.limit) || 50
    
    let communities
    if (popular) {
      communities = await getPopularCommunities(limit)
    } else {
      communities = await getAllCommunities(limit)
    }
    
    res.json(communities.map(c => c.toJSON()))
  } catch (error) {
    console.error('Error fetching communities:', error)
    res.status(500).json({ error: 'Failed to fetch communities' })
  }
}

// POST /api/communities/:id/image - Upload community image (requires auth)
export const uploadCommunityImageHandler = async (req, res) => {
  try {
    const { id } = req.params
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' })
    }
    
    // Verify community exists
    const community = await getCommunityById(id)
    if (!community) {
      return res.status(404).json({ error: 'Community not found' })
    }
    
    // Upload to Cloudflare R2
    const publicUrl = await uploadCommunityImage(
      id,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    )
    
    // Update community with image URL
    const updatedCommunity = await updateCommunityInfo(id, { imageUrl: publicUrl })
    
    res.json({ imageUrl: publicUrl, community: updatedCommunity.toJSON() })
  } catch (error) {
    console.error('Error uploading image:', error)
    res.status(500).json({ error: 'Failed to upload image' })
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
}

