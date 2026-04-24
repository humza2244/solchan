import { getDb, toDate, FieldValue } from '../config/firebase.js'
import Thread from '../models/Thread.js'
import Reply from '../models/Reply.js'



// Create a new thread (OP post)
export const createThread = async (communityId, threadData) => {
  const db = getDb()

  // Get next post number using a counter (atomic)
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
  const docRef = await db.collection('threads').add({
    communityId,
    subject: threadData.subject,
    content: threadData.content,
    imageUrl: threadData.imageUrl || null,
    author: threadData.author || 'Anonymous',
    postNumber,
    createdAt: now,
    lastBumpAt: now,
    replyCount: 0,
    isPinned: false,
  })

  // Update community message count
  await db.collection('communities').doc(communityId).update({
    messageCount: FieldValue.increment(1),
    lastMessageAt: now,
  })

  const doc = await docRef.get()
  return new Thread({
    id: doc.id,
    ...doc.data(),
    createdAt: toDate(doc.data().createdAt),
    lastBumpAt: toDate(doc.data().lastBumpAt),
  })
}

// Get threads for a community (bump order)
export const getThreadsByCommunity = async (communityId, limit = 50, offset = 0) => {
  const db = getDb()

  // Firestore doesn't support OFFSET natively, but for most cases limit is fine
  const snap = await db.collection('threads')
    .where('communityId', '==', communityId)
    .orderBy('isPinned', 'desc')
    .orderBy('lastBumpAt', 'desc')
    .limit(limit + offset)
    .get()

  return snap.docs.slice(offset).map(doc => {
    const data = doc.data()
    return new Thread({
      id: doc.id,
      ...data,
      createdAt: toDate(data.createdAt),
      lastBumpAt: toDate(data.lastBumpAt),
    })
  })
}

// Get a single thread by ID
export const getThreadById = async (threadId) => {
  const db = getDb()
  const doc = await db.collection('threads').doc(threadId).get()

  if (!doc.exists) return null

  const data = doc.data()
  return new Thread({
    id: doc.id,
    ...data,
    createdAt: toDate(data.createdAt),
    lastBumpAt: toDate(data.lastBumpAt),
  })
}

// Get replies for a thread
export const getRepliesByThread = async (threadId, limit = 100, offset = 0) => {
  const db = getDb()
  const snap = await db.collection('replies')
    .where('threadId', '==', threadId)
    .orderBy('createdAt', 'asc')
    .limit(limit + offset)
    .get()

  return snap.docs.slice(offset).map(doc => {
    const data = doc.data()
    return new Reply({
      id: doc.id,
      ...data,
      createdAt: toDate(data.createdAt),
    })
  })
}

// Add a reply to a thread
export const addReply = async (threadId, replyData) => {
  const db = getDb()

  // Get thread to find communityId
  const threadDoc = await db.collection('threads').doc(threadId).get()
  if (!threadDoc.exists) throw new Error('Thread not found')

  const communityId = threadDoc.data().communityId

  // Get next post number (atomic)
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
  const replyRef = await db.collection('replies').add({
    threadId,
    content: replyData.content,
    imageUrl: replyData.imageUrl || null,
    author: replyData.author || 'Anonymous',
    postNumber,
    createdAt: now,
  })

  // Update thread stats (bump + reply count)
  await db.collection('threads').doc(threadId).update({
    replyCount: FieldValue.increment(1),
    lastBumpAt: now,
  })

  // Update community stats
  await db.collection('communities').doc(communityId).update({
    messageCount: FieldValue.increment(1),
    lastMessageAt: now,
  })

  const replyDoc = await replyRef.get()
  return new Reply({
    id: replyDoc.id,
    ...replyDoc.data(),
    createdAt: toDate(replyDoc.data().createdAt),
  })
}

// Get recent replies for a thread (for preview)
export const getRecentReplies = async (threadId, limit = 3) => {
  const db = getDb()
  const snap = await db.collection('replies')
    .where('threadId', '==', threadId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get()

  return snap.docs.map(doc => {
    const data = doc.data()
    return new Reply({
      id: doc.id,
      ...data,
      createdAt: toDate(data.createdAt),
    })
  }).reverse()
}

// Get thread with recent replies (for community page preview)
export const getThreadWithPreview = async (threadId, replyLimit = 3) => {
  const thread = await getThreadById(threadId)
  if (!thread) return null

  const recentReplies = await getRecentReplies(threadId, replyLimit)

  return {
    ...thread.toJSON(),
    recentReplies: recentReplies.map(r => r.toJSON()),
  }
}

// Toggle pin/unpin a thread
export const togglePinThread = async (threadId) => {
  const db = getDb()
  const doc = await db.collection('threads').doc(threadId).get()
  if (!doc.exists) throw new Error('Thread not found')
  
  const currentPinned = doc.data().isPinned || false
  await db.collection('threads').doc(threadId).update({
    isPinned: !currentPinned,
  })
  
  return !currentPinned
}

// Get all posts by a specific author name (for user profile)
export const getPostsByAuthor = async (authorName, limit = 50) => {
  const db = getDb()
  
  let threads = []
  let replies = []
  
  // Get threads by author
  try {
    const threadSnap = await db.collection('threads')
      .where('author', '==', authorName)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get()
    
    threads = threadSnap.docs.map(doc => {
      const data = doc.data()
      return {
        type: 'thread',
        id: doc.id,
        communityId: data.communityId,
        subject: data.subject,
        content: data.content,
        author: data.author,
        postNumber: data.postNumber,
        imageUrl: data.imageUrl,
        replyCount: data.replyCount || 0,
        createdAt: toDate(data.createdAt),
      }
    })
  } catch (err) {
    // Fallback without ordering
    console.warn('Thread author index not ready, using fallback')
    const threadSnap = await db.collection('threads')
      .where('author', '==', authorName)
      .limit(limit)
      .get()
    
    threads = threadSnap.docs.map(doc => {
      const data = doc.data()
      return {
        type: 'thread',
        id: doc.id,
        communityId: data.communityId,
        subject: data.subject,
        content: data.content,
        author: data.author,
        postNumber: data.postNumber,
        imageUrl: data.imageUrl,
        replyCount: data.replyCount || 0,
        createdAt: toDate(data.createdAt),
      }
    })
  }
  
  // Get replies by author
  try {
    const replySnap = await db.collection('replies')
      .where('author', '==', authorName)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get()
    
    replies = replySnap.docs.map(doc => {
      const data = doc.data()
      return {
        type: 'reply',
        id: doc.id,
        threadId: data.threadId,
        content: data.content,
        author: data.author,
        postNumber: data.postNumber,
        imageUrl: data.imageUrl,
        createdAt: toDate(data.createdAt),
      }
    })
  } catch (err) {
    console.warn('Reply author index not ready, using fallback')
    const replySnap = await db.collection('replies')
      .where('author', '==', authorName)
      .limit(limit)
      .get()
    
    replies = replySnap.docs.map(doc => {
      const data = doc.data()
      return {
        type: 'reply',
        id: doc.id,
        threadId: data.threadId,
        content: data.content,
        author: data.author,
        postNumber: data.postNumber,
        imageUrl: data.imageUrl,
        createdAt: toDate(data.createdAt),
      }
    })
  }
  
  // Merge and sort by date
  const allPosts = [...threads, ...replies].sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  )
  
  return allPosts.slice(0, limit)
}

// Toggle like on a thread or reply
export const toggleLike = async (collection, docId, userId) => {
  const db = getDb()
  const docRef = db.collection(collection).doc(docId)
  const doc = await docRef.get()
  if (!doc.exists) throw new Error('Document not found')

  const likes = doc.data().likes || []
  const alreadyLiked = likes.includes(userId)

  if (alreadyLiked) {
    await docRef.update({ likes: FieldValue.arrayRemove(userId) })
    return { liked: false, likeCount: likes.length - 1 }
  } else {
    await docRef.update({ likes: FieldValue.arrayUnion(userId) })
    return { liked: true, likeCount: likes.length + 1 }
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
  togglePinThread,
  getPostsByAuthor,
  toggleLike,
}
