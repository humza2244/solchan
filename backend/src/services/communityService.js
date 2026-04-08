import { getDb, toDate, FieldValue } from '../config/firebase.js'
import Community from '../models/Community.js'
import Message from '../models/Message.js'



// Create a new community (prevents duplicates by contract address)
export const createCommunity = async (communityData) => {
  const db = getDb()
  const now = new Date()
  const normalizedCA = communityData.contractAddress.toLowerCase()

  // Check for existing community with same contract address
  const existing = await db.collection('communities')
    .where('contractAddress', '==', normalizedCA)
    .limit(1)
    .get()

  if (!existing.empty) {
    const existingDoc = existing.docs[0]
    return new Community({ id: existingDoc.id, ...existingDoc.data(), createdAt: toDate(existingDoc.data().createdAt) })
  }

  const docRef = await db.collection('communities').add({
    ticker: communityData.ticker,
    coinName: communityData.coinName,
    contractAddress: normalizedCA,
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
    // Lowercase copies for search
    tickerLower: communityData.ticker.toLowerCase(),
    coinNameLower: communityData.coinName.toLowerCase(),
  })

  const doc = await docRef.get()
  return new Community({ id: doc.id, ...doc.data(), createdAt: toDate(doc.data().createdAt) })
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

  // 3. Exact contract address match
  const caExact = await db.collection('communities')
    .where('contractAddress', '==', search)
    .get()
  caExact.docs.forEach(addResult)

  // 4. Prefix contract address match (partial CA paste)
  if (search.length >= 6) {
    const caEnd = search.slice(0, -1) + String.fromCharCode(search.charCodeAt(search.length - 1) + 1)
    const caPrefix = await db.collection('communities')
      .where('contractAddress', '>=', search)
      .where('contractAddress', '<', caEnd)
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

  // Get all communities and sort by message count (Firestore doesn't support complex aggregate ORDER BY)
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
    // Check if there's already a KOTH
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

    // No KOTH yet — find the most active community
    const snap = await db.collection('communities')
      .orderBy('messageCount', 'desc')
      .limit(1)
      .get()

    if (snap.empty) return null

    const doc = snap.docs[0]
    const data = doc.data()

    // Crown it as KOTH
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
  
  // Use a stable key: userId for logged-in users, author name for anon
  const memberKey = userId || `anon_${(author || 'Anonymous').toLowerCase().replace(/[^a-z0-9]/g, '_')}`
  
  const memberRef = db.collection('communityMembers').doc(`${communityId}_${memberKey}`)
  const memberDoc = await memberRef.get()
  
  if (memberDoc.exists) {
    // Update existing member
    await memberRef.update({
      lastPostAt: now,
      postCount: FieldValue.increment(1),
    })
  } else {
    // New member
    await memberRef.set({
      communityId,
      userId: userId || null,
      author: author || 'Anonymous',
      memberKey,
      joinedAt: now,
      lastPostAt: now,
      postCount: 1,
    })
    
    // Increment unique users count on community
    await db.collection('communities').doc(communityId).update({
      uniqueUsersCount: FieldValue.increment(1),
    })
  }
}

// Get all members of a community
export const getCommunityMembers = async (communityId, limit = 100) => {
  const db = getDb()
  
  try {
    // Primary query (requires composite index)
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
    // Fallback: query without ordering (index may still be building)
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
    
    // Sort in memory
    return members.sort((a, b) => b.postCount - a.postCount)
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
  trackMember,
  getCommunityMembers,
}
