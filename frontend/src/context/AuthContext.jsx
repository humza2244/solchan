import { createContext, useContext, useState, useEffect } from 'react'
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  TwitterAuthProvider,
  signInWithPopup,
  linkWithPopup,
} from 'firebase/auth'
import { auth } from '../config/firebase.js'
import axios from 'axios'
import { API_BASE_URL } from '../services/api.js'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authToken, setAuthToken] = useState(null)
  // Pending X user = X login succeeded but needs a username before profile is created
  const [pendingXUser, setPendingXUser] = useState(null)

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        const token = await firebaseUser.getIdToken()
        setAuthToken(token)

        // Fetch user profile
        try {
          const res = await axios.get(`${API_BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          setProfile(res.data)
        } catch {
          setProfile(null)
        }
      } else {
        setUser(null)
        setProfile(null)
        setAuthToken(null)
        setPendingXUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Register with email + password + username
  const register = async (email, password, username) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    const token = await credential.user.getIdToken()

    // Send verification email
    await sendEmailVerification(credential.user)

    // Create profile on backend
    const res = await axios.post(`${API_BASE_URL}/auth/register`, {
      username,
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })

    setProfile(res.data.profile)
    setAuthToken(token)
    return credential.user
  }

  // Login with email + password
  const login = async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email, password)
    const token = await credential.user.getIdToken()
    setAuthToken(token)

    // Fetch profile
    try {
      const res = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setProfile(res.data)
    } catch {
      setProfile(null)
    }

    return credential.user
  }

  /**
   * Login with X (Twitter) via Firebase popup.
   * - Existing users: fetches their profile, done.
   * - New users (no profile): returns { needsUsername: true }
   *   so the UI can show XLinkPrompt to pick a username.
   */
  const loginWithX = async () => {
    const provider = new TwitterAuthProvider()
    const credential = await signInWithPopup(auth, provider)
    const token = await credential.user.getIdToken()
    setAuthToken(token)

    // Check if profile already exists
    try {
      const res = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setProfile(res.data)
      return { needsUsername: false }
    } catch (err) {
      if (err.response?.status === 404) {
        // New user — save pending X info
        const twitterInfo = credential._tokenResponse || {}
        setPendingXUser({
          uid: credential.user.uid,
          twitterHandle: twitterInfo.screenName || credential.user.displayName || null,
          twitterId: twitterInfo.localId || null,
        })
        return { needsUsername: true }
      }
      throw err
    }
  }

  /**
   * Called by XLinkPrompt after choosing a username.
   * Creates the profile with optional twitterHandle.
   */
  const registerWithX = async (username) => {
    if (!user) throw new Error('Not authenticated')
    const token = await user.getIdToken()

    const res = await axios.post(`${API_BASE_URL}/auth/register`, {
      username,
      twitterHandle: pendingXUser?.twitterHandle || null,
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })

    setProfile(res.data.profile)
    setPendingXUser(null)
    return res.data.profile
  }

  /**
   * Link X to an existing email-password account.
   * Must be called while the user is already logged in.
   */
  const linkX = async () => {
    if (!user) throw new Error('Not logged in')
    const provider = new TwitterAuthProvider()

    const credential = await linkWithPopup(user, provider)
    const token = await credential.user.getIdToken()
    setAuthToken(token)

    // Store twitter handle on backend profile
    const twitterInfo = credential._tokenResponse || {}
    const twitterHandle = twitterInfo.screenName || null

    if (twitterHandle) {
      try {
        const res = await axios.post(`${API_BASE_URL}/auth/link-x`, { twitterHandle }, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setProfile(res.data.profile)
      } catch (err) {
        console.warn('Could not store twitter handle:', err.message)
      }
    }

    return twitterHandle
  }

  // Logout
  const logout = async () => {
    await signOut(auth)
    setUser(null)
    setProfile(null)
    setAuthToken(null)
    setPendingXUser(null)
  }

  // Resend verification email
  const resendVerification = async () => {
    if (user && !user.emailVerified) {
      await sendEmailVerification(user)
    }
  }

  // Get fresh token (for API calls)
  const getToken = async () => {
    if (user) {
      const token = await user.getIdToken(true)
      setAuthToken(token)
      return token
    }
    return null
  }

  const value = {
    user,
    profile,
    loading,
    authToken,
    pendingXUser,
    isLoggedIn: !!user,
    isVerified: user?.emailVerified || false,
    displayName: profile?.username || 'Anonymous',
    twitterHandle: profile?.twitterHandle || null,
    register,
    login,
    loginWithX,
    registerWithX,
    linkX,
    logout,
    resendVerification,
    getToken,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext
