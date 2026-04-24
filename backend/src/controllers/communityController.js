import {
  createCommunity,
  getCommunityById,
  searchCommunities,
  getAllCommunities,
  getPopularCommunities,
  getMessages,
  addMessage,
  updateCommunityInfo,
  updateCommunityCA,
  getKOTH,
  getCommunityMembers,
  joinCommunity,
  submitCTORequest,
  voteCTORequest,
  getCTORequests,
} from '../services/communityService.js'
import { uploadCommunityImage } from '../services/storageService.js'
import { invalidatePopularCoinsCache } from '../utils/cache.js'
import { escapeHtml, sanitizeInput, sanitizeAuthor } from '../utils/sanitize.js'
import { requireAuth } from '../middleware/auth.js'

// POST /api/communities - Create a new community (CA now optional)
export const createCommunityHandler = async (req, res) => {
  try {
    const { ticker, coinName, contractAddress, description, imageUrl } = req.body

    // Validate required fields (CA is now optional)
    if (!ticker || !coinName) {
      return res.status(400).json({ error: 'Ticker and coin name are required' })
    }

    const sanitizedTicker = sanitizeInput(ticker, 50)
    const sanitizedCoinName = sanitizeInput(coinName, 255)
    const sanitizedDescription = sanitizeInput(description, 1000)

    // CA is optional — only sanitize/validate if provided
    let sanitizedCA = null
    if (contractAddress && contractAddress.trim()) {
      sanitizedCA = sanitizeInput(contractAddress, 255)
      if (sanitizedCA && sanitizedCA.length < 20) {
        return res.status(400).json({ error: 'Invalid contract address — must be at least 20 characters' })
      }
    }

    if (!sanitizedTicker || !sanitizedCoinName) {
      return res.status(400).json({ error: 'Invalid input' })
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
    if (error.code === 'DUPLICATE_CA') {
      return res.status(409).json({
        error: 'A community with this contract address already exists',
        existingId: error.existingId,
      })
    }
    console.error('Error creating community:', error.message)
    res.status(500).json({ error: 'Failed to create community' })
  }
}

// PUT /api/communities/:id/ca - Set or update contract address (creator/mod only)
export const updateCommunityCAHandler = async (req, res) => {
  try {
    const { id } = req.params
    const { contractAddress } = req.body

    if (!contractAddress || !contractAddress.trim()) {
      return res.status(400).json({ error: 'Contract address is required' })
    }

    const community = await updateCommunityCA(id, contractAddress.trim(), req.userId)
    invalidatePopularCoinsCache()
    invalidateCommunityCache(id) // bust the metadata cache
    res.json(community.toJSON())
  } catch (error) {
    if (error.code === 'DUPLICATE_CA') {
      return res.status(409).json({
        error: 'This contract address is already used by another community',
        existingId: error.existingId,
      })
    }
    if (error.message.includes('Only the creator') || error.message.includes('Not authorized')) {
      return res.status(403).json({ error: error.message })
    }
    if (error.message.includes('Invalid contract address')) {
      return res.status(400).json({ error: error.message })
    }
    console.error('Error updating CA:', error.message)
    res.status(500).json({ error: 'Failed to update contract address' })
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

    // Sanitize: strip HTML tags and special chars that could cause issues
    const sanitized = q.replace(/<[^>]*>/g, '').replace(/[<>"'&]/g, '').trim()
    if (!sanitized) {
      return res.json([])
    }

    const communities = await searchCommunities(sanitized)
    res.json(communities.map(c => c.toJSON()))
  } catch (error) {
    console.error('Error searching communities:', error.message)
    res.status(500).json({ error: 'Failed to search communities' })
  }
}

// Simple community metadata cache (60s TTL) to avoid hammering Firestore on auto-refresh
const communityCache = new Map() // id -> { data, ts }
const COMMUNITY_CACHE_TTL = 60_000

// GET /api/communities/:id
export const getCommunityHandler = async (req, res) => {
  try {
    const { id } = req.params
    const includeMessages = req.query.messages !== 'false'

    let community
    const cached = communityCache.get(id)
    if (cached && Date.now() - cached.ts < COMMUNITY_CACHE_TTL) {
      community = cached.data
    } else {
      try {
        community = await getCommunityById(id)
      } catch (lookupErr) {
        return res.status(404).json({ error: 'Community not found' })
      }
      if (!community) return res.status(404).json({ error: 'Community not found' })
      communityCache.set(id, { data: community, ts: Date.now() })
    }

    // Only fetch messages if explicitly requested (socket handles this for live view)
    let messages = []
    if (includeMessages) {
      try {
        messages = await getMessages(id, 50) // reduced from 100 to 50
      } catch (msgError) {
        console.error('Warning: Could not load messages:', msgError.message)
      }
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

// Invalidate community cache when community is modified
export const invalidateCommunityCache = (id) => {
  if (id) communityCache.delete(id)
  else communityCache.clear()
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
    const recent = req.query.recent === 'true'
    const limit = Math.min(parseInt(req.query.limit) || 50, 100)

    let communities
    if (popular) {
      communities = await getPopularCommunities(limit)
    } else {
      // recent=true is the same as default (newest first) — getAllCommunities is already sorted desc
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

    let imageUrl
    try {
      imageUrl = await uploadCommunityImage(id, req.file.buffer, req.file.originalname, req.file.mimetype)
    } catch (r2Err) {
      console.warn('R2 upload failed, falling back to base64:', r2Err.message)
      const base64 = req.file.buffer.toString('base64')
      imageUrl = `data:${req.file.mimetype};base64,${base64}`
    }

    const updatedCommunity = await updateCommunityInfo(id, { imageUrl })
    res.json({ imageUrl, community: updatedCommunity.toJSON() })
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

// POST /api/communities/:id/join - Join community without posting
export const joinCommunityHandler = async (req, res) => {
  try {
    const { id } = req.params
    const author = req.body.author || 'Anonymous'

    const result = await joinCommunity(id, { author, userId: req.userId || null })
    res.json(result)
  } catch (error) {
    console.error('Error joining community:', error.message)
    res.status(500).json({ error: 'Failed to join community' })
  }
}

// POST /api/communities/:id/cto - Submit CTO request (auth required)
export const submitCTOHandler = async (req, res) => {
  try {
    const { id } = req.params
    const { reason } = req.body

    if (!req.userId) {
      return res.status(401).json({ error: 'Must be logged in to request a CTO' })
    }

    const sanitizedReason = sanitizeInput(reason, 500) || 'Team appears inactive'
    const request = await submitCTORequest(id, req.userId, sanitizedReason)
    res.status(201).json(request)
  } catch (error) {
    console.error('Error submitting CTO:', error.message)
    if (error.message.includes('not eligible') || error.message.includes('already the creator') || error.message.includes('already have')) {
      return res.status(400).json({ error: error.message })
    }
    res.status(500).json({ error: 'Failed to submit CTO request' })
  }
}

// POST /api/communities/:id/cto/:requestId/vote - Vote on CTO request (auth required)
export const voteCTOHandler = async (req, res) => {
  try {
    const { requestId } = req.params
    const { vote } = req.body // 'up' or 'down'

    if (!req.userId) {
      return res.status(401).json({ error: 'Must be logged in to vote' })
    }

    if (!['up', 'down'].includes(vote)) {
      return res.status(400).json({ error: 'Vote must be "up" or "down"' })
    }

    const result = await voteCTORequest(requestId, req.userId, vote)
    res.json(result)
  } catch (error) {
    console.error('Error voting on CTO:', error.message)
    if (error.message.includes('already voted') || error.message.includes('own CTO') || error.message.includes('no longer pending')) {
      return res.status(400).json({ error: error.message })
    }
    res.status(500).json({ error: 'Failed to vote on CTO request' })
  }
}

// GET /api/communities/:id/cto - Get CTO requests for a community
export const getCTOHandler = async (req, res) => {
  try {
    const { id } = req.params
    const requests = await getCTORequests(id)
    res.json(requests)
  } catch (error) {
    console.error('Error fetching CTO requests:', error.message)
    res.status(500).json({ error: 'Failed to fetch CTO requests' })
  }
}

export default {
  createCommunityHandler,
  updateCommunityCAHandler,
  searchCommunitiesHandler,
  getCommunityHandler,
  getCommunityMessagesHandler,
  createMessageHandler,
  getAllCommunitiesHandler,
  uploadCommunityImageHandler,
  getKOTHHandler,
  getCommunityMembersHandler,
  joinCommunityHandler,
  submitCTOHandler,
  voteCTOHandler,
  getCTOHandler,
}
