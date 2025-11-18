// Simple in-memory cache for popular communities
// Cache is keyed by limit to support different limit values
const popularCoinsCache = new Map()
const TTL = 5 * 60 * 1000 // 5 minutes

// Get cached popular coins
export const getCachedPopularCoins = (limit = 50) => {
  const cacheKey = `limit_${limit}`
  const cacheEntry = popularCoinsCache.get(cacheKey)
  
  if (!cacheEntry) {
    return null
  }
  
  const now = Date.now()
  
  if (cacheEntry.timestamp && (now - cacheEntry.timestamp) < TTL) {
    return cacheEntry.data
  }
  
  // Cache expired, remove it
  popularCoinsCache.delete(cacheKey)
  return null
}

// Set cached popular coins
export const setCachedPopularCoins = (data, limit = 50) => {
  const cacheKey = `limit_${limit}`
  popularCoinsCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  })
  
  // Clean up old cache entries (keep only last 10)
  if (popularCoinsCache.size > 10) {
    const entries = Array.from(popularCoinsCache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
    // Remove oldest entries
    for (let i = 0; i < entries.length - 10; i++) {
      popularCoinsCache.delete(entries[i][0])
    }
  }
}

// Invalidate cache
export const invalidatePopularCoinsCache = () => {
  popularCoinsCache.clear()
}

export default {
  getCachedPopularCoins,
  setCachedPopularCoins,
  invalidatePopularCoinsCache,
}

