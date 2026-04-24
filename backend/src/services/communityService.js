import { getDb, toDate, FieldValue } from '../config/firebase.js'
import Community from '../models/Community.js'
import Message from '../models/Message.js'

const CTO_VOTE_PERCENT = 0.35 // 35% of community members needed to approve CTO
const CTO_MIN_VOTES = 2 // minimum votes required even for tiny communities

// Create a new community (CA is now optional)
export const createCommunity = async (communityData) => {
  const db = getDb()
  const now = new Date()

  // If CA provided, check global uniqueness
  if (communityData.contractAddress) {
    const normalizedCA = communityData.contractAddress.trim()
    const existing = await db.collection('communities')
      .where('contractAddressLower', '==', normalizedCA.toLowerCase())
      .limit(1)
      .get()

    if (!existing.empty) {
      const existingDoc = existing.docs[0]
      const err = new Error('Contract address already in use')
      err.code = 'DUPLICATE_CA'
      err.existingId = existingDoc.id
      err.existingData = { id: existingDoc.id, ...existingDoc.data() }
      throw err
    }
  }

  const docData = {
    ticker: communityData.ticker,
    coinName: communityData.coinName,
    contractAddress: communityData.contractAddress?.trim() || null,
    contractAddressLower: communityData.contractAddress?.trim().toLowerCase() || null,
    description: communityData.description || null,
    imageUrl: communityData.imageUrl || null,
    creatorId: communityData.creatorId || null,
    createdAt: now,
    messageCount: 0,
    uniqueUsersCount: 0,
    lastMessageAt: null,
    hasBeenKoth: false,
    becameKothAt: null,
    moderators: [],
    rules: null,
    // Lowercase copies for search
    tickerLower: communityData.ticker.toLowerCase(),
    coinNameLower: communityData.coinName.toLowerCase(),
  }

  const docRef = await db.collection('communities').add(docData)
  const doc = await docRef.get()
  return new Community({ id: doc.id, ...doc.data(), createdAt: toDate(doc.data().createdAt) })
}

// Set or update contract address on an existing community (creator/mod only)
export const updateCommunityCA = async (communityId, contractAddress, requestingUserId) => {
  const db = getDb()
  const normalizedCA = contractAddress.trim()

  if (normalizedCA.length < 20) {
    throw new Error('Invalid contract address — must be at least 20 characters')
  }

  // Check global CA uniqueness
  const existing = await db.collection('communities')
    .where('contractAddressLower', '==', normalizedCA.toLowerCase())
    .limit(1)
    .get()

  if (!existing.empty && existing.docs[0].id !== communityId) {
    const err = new Error('Contract address already in use by another community')
    err.code = 'DUPLICATE_CA'
    err.existingId = existing.docs[0].id
    throw err
  }

  // Verify the community exists and requester is creator/mod
  const communityDoc = await db.collection('communities').doc(communityId).get()
  if (!communityDoc.exists) throw new Error('Community not found')

  const data = communityDoc.data()
  // Only the ORIGINAL creator can update the CA (not mods, not CTO recipients)
  if (data.creatorId !== null && data.creatorId !== requestingUserId) {
    throw new Error('Only the community creator can set the contract address')
  }

  // CA can only be set ONCE — if caUpdatedAt exists, block the update
  if (data.caUpdatedAt) {
    throw new Error('Contract address has already been set and cannot be changed')
  }

  await db.collection('communities').doc(communityId).update({
    contractAddress: normalizedCA,
    contractAddressLower: normalizedCA.toLowerCase(),
    caUpdatedAt: new Date(),
    caUpdatedBy: requestingUserId,
  })

  return await getCommunityById(communityId)
}

// Get community by ID
export const getCommunityById = async (id) => {
  const db = getDb()
  const doc = await db.collection('communities').doc(id).get()

  if (!doc.exists) return null

  const data = doc.data()
  return new Community({
    id: doc.id,
    ...data,
    createdAt: toDate(data.createdAt),
    lastMessageAt: toDate(data.lastMessageAt),
    becameKothAt: toDate(data.becameKothAt),
  })
}

// Search communities by ticker, contract address, or coin name (prefix matching)
export const searchCommunities = async (searchTerm) => {
  const db = getDb()
  const search = searchTerm.toLowerCase().trim()
  if (!search) return []

  const seen = new Set()
  const results = []

  const addResult = (doc) => {
    if (seen.has(doc.id)) return
    seen.add(doc.id)
    const data = doc.data()
    results.push(new Community({
      id: doc.id,
      ...data,
      createdAt: toDate(data.createdAt),
      lastMessageAt: toDate(data.lastMessageAt),
    }))
  }

  // 1. Exact ticker match (case-insensitive)
  const tickerExact = await db.collection('communities')
    .where('tickerLower', '==', search)
    .get()
  tickerExact.docs.forEach(addResult)

  // 2. Prefix ticker match ("SO" → "SOL", "SOLANA")
  if (search.length >= 1) {
    const endStr = search.slice(0, -1) + String.fromCharCode(search.charCodeAt(search.length - 1) + 1)
    const tickerPrefix = await db.collection('communities')
      .where('tickerLower', '>=', search)
      .where('tickerLower', '<', endStr)
      .limit(20)
      .get()
    tickerPrefix.docs.forEach(addResult)
  }

  // 3. Exact contract address match (case-insensitive via lowercase field)
  const caExact = await db.collection('communities')
    .where('contractAddressLower', '==', search)
    .get()
  caExact.docs.forEach(addResult)

  // 4. Prefix contract address match (partial CA paste)
  if (search.length >= 6) {
    const caEnd = search.slice(0, -1) + String.fromCharCode(search.charCodeAt(search.length - 1) + 1)
    const caPrefix = await db.collection('communities')
      .where('contractAddressLower', '>=', search)
      .where('contractAddressLower', '<', caEnd)
      .limit(20)
      .get()
    caPrefix.docs.forEach(addResult)
  }

  // 5. Coin name prefix match ("pepe" → "Pepe Coin") — uses coinNameLower field
  if (search.length >= 2) {
    const nameEnd = search.slice(0, -1) + String.fromCharCode(search.charCodeAt(search.length - 1) + 1)
    const namePrefix = await db.collection('communities')
      .where('coinNameLower', '>=', search)
      .where('coinNameLower', '<', nameEnd)
      .limit(20)
      .get()
    namePrefix.docs.forEach(addResult)
  }

  // Sort by message count descending
  results.sort((a, b) => b.messageCount - a.messageCount)
  return results
}

// Get all communities (newest first)
export const getAllCommunities = async (limit = 50) => {
  const db = getDb()
  const snap = await db.collection('communities')
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get()

  return snap.docs.map(doc => {
    const data = doc.data()
    return new Community({
      id: doc.id,
      ...data,
      createdAt: toDate(data.createdAt),
      lastMessageAt: toDate(data.lastMessageAt),
    })
  })
}

// Get popular communities (most active)
export const getPopularCommunities = async (limit = 50) => {
  const db = getDb()

  const snap = await db.collection('communities')
    .orderBy('messageCount', 'desc')
    .limit(limit)
    .get()

  return snap.docs.map(doc => {
    const data = doc.data()
    const community = new Community({
      id: doc.id,
      ...data,
      createdAt: toDate(data.createdAt),
      lastMessageAt: toDate(data.lastMessageAt),
    })
    community.messages24h = 0
    community.totalThreads = data.messageCount || 0
    community.totalReplies = 0
    community.popularityScore = community.getPopularityScore(0)
    return community
  })
}

// Get messages for a community
export const getMessages = async (communityId, limit = 100) => {
  const db = getDb()
  const snap = await db.collection('messages')
    .where('communityId', '==', communityId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get()

  return snap.docs.map(doc => {
    const data = doc.data()
    return new Message({
      id: doc.id,
      ...data,
      createdAt: toDate(data.createdAt),
    })
  }).reverse()
}

// Add message to a community
export const addMessage = async (communityId, messageData, userId = null) => {
  const db = getDb()

  // Verify community exists
  const communityDoc = await db.collection('communities').doc(communityId).get()
  if (!communityDoc.exists) throw new Error('Community not found')

  // Get the next post number using a counter document
  const counterRef = db.collection('counters').doc(`community_${communityId}`)
  let postNumber

  await db.runTransaction(async (t) => {
    const counterDoc = await t.get(counterRef)
    if (!counterDoc.exists) {
      postNumber = 1000000 + Math.floor(Date.now() % 1000000)
      t.set(counterRef, { lastPostNumber: postNumber })
    } else {
      postNumber = (counterDoc.data().lastPostNumber || 0) + 1
      t.update(counterRef, { lastPostNumber: postNumber })
    }
  })

  const now = new Date()
  const msgRef = await db.collection('messages').add({
    postNumber,
    communityId,
    content: messageData.content.trim(),
    userId: userId || null,
    author: messageData.author || 'Anonymous',
    createdAt: now,
  })

  // Update community stats
  await db.collection('communities').doc(communityId).update({
    messageCount: FieldValue.increment(1),
    lastMessageAt: now,
  })

  const msgDoc = await msgRef.get()
  return new Message({
    id: msgDoc.id,
    ...msgDoc.data(),
    createdAt: toDate(msgDoc.data().createdAt),
  })
}

// Update community info
export const updateCommunityInfo = async (id, updateData) => {
  const db = getDb()
  const updates = {}

  if (updateData.ticker !== undefined) {
    updates.ticker = updateData.ticker
    updates.tickerLower = updateData.ticker.toLowerCase()
  }
  if (updateData.coinName !== undefined) updates.coinName = updateData.coinName
  if (updateData.description !== undefined) updates.description = updateData.description
  if (updateData.imageUrl !== undefined) updates.imageUrl = updateData.imageUrl

  if (Object.keys(updates).length > 0) {
    await db.collection('communities').doc(id).update(updates)
  }

  return await getCommunityById(id)
}

// Get KOTH (King of the Hill)
export const getKOTH = async () => {
  const db = getDb()

  try {
    const kothSnap = await db.collection('communities')
      .where('hasBeenKoth', '==', true)
      .orderBy('becameKothAt', 'asc')
      .limit(1)
      .get()

    if (!kothSnap.empty) {
      const doc = kothSnap.docs[0]
      const data = doc.data()
      return new Community({
        id: doc.id,
        ...data,
        createdAt: toDate(data.createdAt),
        lastMessageAt: toDate(data.lastMessageAt),
        becameKothAt: toDate(data.becameKothAt),
      })
    }

    const snap = await db.collection('communities')
      .orderBy('messageCount', 'desc')
      .limit(1)
      .get()

    if (snap.empty) return null

    const doc = snap.docs[0]
    const data = doc.data()

    const now = new Date()
    await db.collection('communities').doc(doc.id).update({
      hasBeenKoth: true,
      becameKothAt: now,
    })

    return new Community({
      id: doc.id,
      ...data,
      createdAt: toDate(data.createdAt),
      lastMessageAt: toDate(data.lastMessageAt),
      hasBeenKoth: true,
      becameKothAt: now,
    })
  } catch (error) {
    console.error('Error in getKOTH:', error.message)
    return null
  }
}

// Track a member in a community (called when someone posts)
export const trackMember = async (communityId, { author, userId }) => {
  const db = getDb()
  const now = new Date()

  const memberKey = userId || `anon_${(author || 'Anonymous').toLowerCase().replace(/[^a-z0-9]/g, '_')}`

  const memberRef = db.collection('communityMembers').doc(`${communityId}_${memberKey}`)
  const memberDoc = await memberRef.get()

  if (memberDoc.exists) {
    await memberRef.update({
      lastPostAt: now,
      postCount: FieldValue.increment(1),
    })
  } else {
    await memberRef.set({
      communityId,
      userId: userId || null,
      author: author || 'Anonymous',
      memberKey,
      joinedAt: now,
      lastPostAt: now,
      postCount: 1,
    })

    await db.collection('communities').doc(communityId).update({
      uniqueUsersCount: FieldValue.increment(1),
    })
  }
}

// Join a community without posting (lurker)
export const joinCommunity = async (communityId, { author, userId }) => {
  const db = getDb()
  const now = new Date()

  const memberKey = userId || `anon_${(author || 'Anonymous').toLowerCase().replace(/[^a-z0-9]/g, '_')}`
  const memberRef = db.collection('communityMembers').doc(`${communityId}_${memberKey}`)
  const memberDoc = await memberRef.get()

  if (memberDoc.exists) {
    return { alreadyJoined: true }
  }

  await memberRef.set({
    communityId,
    userId: userId || null,
    author: author || 'Anonymous',
    memberKey,
    joinedAt: now,
    lastPostAt: null,
    postCount: 0,
  })

  await db.collection('communities').doc(communityId).update({
    uniqueUsersCount: FieldValue.increment(1),
  })

  return { joined: true }
}

// Get all members of a community
export const getCommunityMembers = async (communityId, limit = 100) => {
  const db = getDb()

  try {
    const snap = await db.collection('communityMembers')
      .where('communityId', '==', communityId)
      .orderBy('postCount', 'desc')
      .limit(limit)
      .get()

    return snap.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        author: data.author,
        userId: data.userId,
        postCount: data.postCount,
        joinedAt: toDate(data.joinedAt),
        lastPostAt: toDate(data.lastPostAt),
      }
    })
  } catch (err) {
    console.warn('Members index not ready, using fallback query')
    const snap = await db.collection('communityMembers')
      .where('communityId', '==', communityId)
      .limit(limit)
      .get()

    const members = snap.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        author: data.author,
        userId: data.userId,
        postCount: data.postCount,
        joinedAt: toDate(data.joinedAt),
        lastPostAt: toDate(data.lastPostAt),
      }
    })

    return members.sort((a, b) => b.postCount - a.postCount)
  }
}

// ============================================================
// CTO (Community Takeover) System
// ============================================================

/**
 * Submit a CTO request for an eligible community.
 * Eligible = no creatorId, or last message > 30 days ago.
 */
export const submitCTORequest = async (communityId, requestingUserId, reason) => {
  const db = getDb()
  const community = await getCommunityById(communityId)
  if (!community) throw new Error('Community not found')

  // Check eligibility
  // Fall back to createdAt when no messages yet — prevents brand-new communities from being immediately eligible
  const activityRef = community.lastMessageAt || community.createdAt
  const hoursSinceLastActivity = activityRef
    ? (Date.now() - new Date(activityRef).getTime()) / (1000 * 60 * 60)
    : 0

  const noCreator = !community.creatorId
  const isInactive = hoursSinceLastActivity >= 2

  if (!noCreator || !isInactive) {
    throw new Error('Community is not eligible for CTO — it must have no creator and be inactive for 2+ hours')
  }

  // Don't allow creator to CTO their own community
  if (community.creatorId === requestingUserId) {
    throw new Error('You are already the creator of this community')
  }

  // Check for existing pending request from this user
  const existingReq = await db.collection('ctoRequests')
    .where('communityId', '==', communityId)
    .where('requesterId', '==', requestingUserId)
    .where('status', '==', 'pending')
    .limit(1)
    .get()

  if (!existingReq.empty) {
    throw new Error('You already have a pending CTO request for this community')
  }

  const now = new Date()
  const docRef = await db.collection('ctoRequests').add({
    communityId,
    requesterId: requestingUserId,
    reason: reason || 'Team inactive',
    status: 'pending',
    upvotes: 0,
    downvotes: 0,
    voters: [],
    createdAt: now,
    resolvedAt: null,
  })

  // Mark community as having a pending CTO
  await db.collection('communities').doc(communityId).update({ ctoStatus: 'pending' })

  const doc = await docRef.get()
  return { id: doc.id, ...doc.data() }
}

/**
 * Vote on a CTO request. Auto-approves if upvotes >= threshold.
 */
export const voteCTORequest = async (ctoRequestId, userId, vote) => {
  const db = getDb()
  const reqRef = db.collection('ctoRequests').doc(ctoRequestId)
  const reqDoc = await reqRef.get()

  if (!reqDoc.exists) throw new Error('CTO request not found')
  const data = reqDoc.data()

  if (data.status !== 'pending') throw new Error('This CTO request is no longer pending')
  if (data.requesterId === userId) throw new Error('You cannot vote on your own CTO request')
  if ((data.voters || []).includes(userId)) throw new Error('You have already voted on this request')

  const upvoteDelta = vote === 'up' ? 1 : 0
  const downvoteDelta = vote === 'down' ? 1 : 0
  const newUpvotes = (data.upvotes || 0) + upvoteDelta
  const newDownvotes = (data.downvotes || 0) + downvoteDelta

  await reqRef.update({
    upvotes: newUpvotes,
    downvotes: newDownvotes,
    voters: FieldValue.arrayUnion(userId),
  })

  // Calculate dynamic threshold: 35% of community members (min 2)
  const communityRef = db.collection('communities').doc(data.communityId)
  const communityDoc = await communityRef.get()
  const memberCount = communityDoc.exists ? (communityDoc.data().memberCount || communityDoc.data().uniqueUsersCount || 1) : 1
  const dynamicThreshold = Math.max(CTO_MIN_VOTES, Math.ceil(memberCount * CTO_VOTE_PERCENT))

  // Auto-approve if threshold met
  if (newUpvotes >= dynamicThreshold) {
    await approveCTORequest(ctoRequestId, data)
    return { status: 'approved', message: 'CTO approved! You are now the community creator.' }
  }

  return { status: 'pending', upvotes: newUpvotes, downvotes: newDownvotes, threshold: dynamicThreshold }
}

/**
 * Internal: Execute the approved CTO — transfer creator role.
 */
const approveCTORequest = async (ctoRequestId, requestData) => {
  const db = getDb()
  const now = new Date()

  // Update CTO request status
  await db.collection('ctoRequests').doc(ctoRequestId).update({
    status: 'approved',
    resolvedAt: now,
  })

  // Transfer creator role on community
  const communityRef = db.collection('communities').doc(requestData.communityId)
  const communityDoc = await communityRef.get()
  if (!communityDoc.exists) return

  const communityData = communityDoc.data()
  const oldCreatorId = communityData.creatorId

  // New creator, demote old creator to regular member (not mod)
  const newModerators = (communityData.moderators || []).filter(id => id !== requestData.requesterId)
  if (oldCreatorId && !newModerators.includes(oldCreatorId)) {
    // Old creator becomes a mod (they still have some power)
    newModerators.push(oldCreatorId)
  }

  await communityRef.update({
    creatorId: requestData.requesterId,
    moderators: newModerators,
    ctoStatus: 'approved',
    lastCTOAt: now,
    previousCreatorId: oldCreatorId || null,
  })
}

/**
 * Get CTO requests for a community.
 */
export const getCTORequests = async (communityId) => {
  const db = getDb()

  // Get community member count for threshold calculation
  const communityDoc = await db.collection('communities').doc(communityId).get()
  const memberCount = communityDoc.exists ? (communityDoc.data().memberCount || communityDoc.data().uniqueUsersCount || 1) : 1
  const threshold = Math.max(CTO_MIN_VOTES, Math.ceil(memberCount * CTO_VOTE_PERCENT))

  const snap = await db.collection('ctoRequests')
    .where('communityId', '==', communityId)
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get()

  const requests = []
  for (const doc of snap.docs) {
    const data = doc.data()
    // Resolve requester username
    let requesterUsername = 'Unknown'
    try {
      const profileDoc = await db.collection('userProfiles').doc(data.requesterId).get()
      if (profileDoc.exists) requesterUsername = profileDoc.data().username
    } catch {}

    requests.push({
      id: doc.id,
      ...data,
      requesterUsername,
      createdAt: toDate(data.createdAt),
      resolvedAt: toDate(data.resolvedAt),
    })
  }

  return { requests, threshold, memberCount }
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
  updateCommunityCA,
  getKOTH,
  trackMember,
  getCommunityMembers,
  joinCommunity,
  submitCTORequest,
  voteCTORequest,
  getCTORequests,
}
