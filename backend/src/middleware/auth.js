// Auth middleware - Firebase token verification with anonymous fallback
import admin from 'firebase-admin'

/**
 * Authenticate user via Firebase ID token.
 * If token is present and valid → req.userId, req.user are set.
 * If no token → anonymous mode (req.userId = null).
 * All routes work in both modes.
 */
export const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Anonymous mode — no token, that's fine
    req.userId = null
    req.user = null
    req.isAuthenticated = false
    return next()
  }

  const token = authHeader.split('Bearer ')[1]

  try {
    const decodedToken = await admin.auth().verifyIdToken(token)
    req.userId = decodedToken.uid
    req.user = decodedToken
    req.isAuthenticated = true
    next()
  } catch (error) {
    console.error('Auth token verification failed:', error.message)
    // Invalid token — treat as anonymous rather than blocking
    req.userId = null
    req.user = null
    req.isAuthenticated = false
    next()
  }
}

/**
 * Require authentication — blocks anonymous users.
 * Use this for routes that MUST have a logged-in user.
 */
export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const token = authHeader.split('Bearer ')[1]

  try {
    const decodedToken = await admin.auth().verifyIdToken(token)
    req.userId = decodedToken.uid
    req.user = decodedToken
    req.isAuthenticated = true
    next()
  } catch (error) {
    console.error('Auth token verification failed:', error.message)
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export default authenticateUser
