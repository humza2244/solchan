import { supabaseAdmin } from '../config/supabase.js'

// TEMPORARY: Mock user for testing - REMOVE WHEN AUTH IS READY
const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001'

export const authenticateUser = async (req, res, next) => {
  try {
    // TEMPORARY: Bypass auth for testing
    console.log('⚠️  USING MOCK AUTH FOR TESTING')
    req.user = {
      id: MOCK_USER_ID,
      email: 'test@solchan.com'
    }
    return next()
    
    /* ORIGINAL AUTH CODE - UNCOMMENT WHEN READY TO USE REAL AUTH
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' })
    }
    
    const token = authHeader.split(' ')[1]
    
    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }
    
    // Attach user to request
    req.user = user
    next()
    */
  } catch (error) {
    console.error('Authentication error:', error)
    res.status(401).json({ error: 'Authentication failed' })
  }
}
