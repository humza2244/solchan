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
  sendPasswordResetEmail,
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

/**
 * Extract Twitter user info from Firebase credential response.
 * Works with both v8 and v9 Firebase SDK token response shapes.
 */
const extractTwitterInfo = (firebaseUser, credential) => {
  const tokenResp = credential?.additionalUserInfo?.profile || {}
  const rawResp = credential?._tokenResponse || {}

  return {
    // Twitter @handle (screenName)
    twitterHandle: tokenResp.screen_name || rawResp.screenName || firebaseUser.displayName?.replace(/\s/g, '') || null,
    // Twitter numeric ID
    twitterId: tokenResp.id_str || rawResp.localId || null,
    // Profile photo (Twitter gives _normal size — upgrade to bigger)
    avatarUrl: (tokenResp.profile_image_url_https || firebaseUser.photoURL || '')
      .replace('_normal.', '_bigger.') || null,
    // Display name
    displayName: tokenResp.name || firebaseUser.displayName || null,
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authToken, setAuthToken] = useState(null)

  const fetchProfile = async (firebaseUser, token) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setProfile(res.data)
      return res.data
    } catch {
      setProfile(null)
      return null
    }
  }

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        const token = await firebaseUser.getIdToken()
        setAuthToken(token)
        await fetchProfile(firebaseUser, token)
      } else {
        setUser(null)
        setProfile(null)
        setAuthToken(null)
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  // Register with email + password + username
  const register = async (email, password, username) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    const token = await credential.user.getIdToken()

    await sendEmailVerification(credential.user)

    const res = await axios.post(`${API_BASE_URL}/auth/register`, { username }, {
      headers: { Authorization: `Bearer ${token}` },
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
    await fetchProfile(credential.user, token)
    return credential.user
  }

  /**
   * Login (or register) with X (Twitter).
   * - Existing users: fetches profile, done.
   * - New users: auto-creates profile using their Twitter @handle as username.
   *   No username prompt needed.
   */
  const loginWithX = async () => {
    const provider = new TwitterAuthProvider()
    provider.setCustomParameters({ force_login: false })

    const credential = await signInWithPopup(auth, provider)
    const token = await credential.user.getIdToken()
    setAuthToken(token)

    // Try to fetch existing profile
    try {
      const res = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      // Existing user — update X info in case it changed
      const { twitterHandle, twitterId, avatarUrl } = extractTwitterInfo(credential.user, credential)
      if (twitterHandle) {
        try {
          const updated = await axios.post(`${API_BASE_URL}/auth/link-x`,
            { twitterHandle, twitterId, avatarUrl },
            { headers: { Authorization: `Bearer ${token}` } }
          )
          setProfile(updated.data.profile)
        } catch {
          setProfile(res.data)
        }
      } else {
        setProfile(res.data)
      }
      return { needsUsername: false }
    } catch (err) {
      if (err.response?.status === 404) {
        // New user — auto-create profile from Twitter info
        const { twitterHandle, twitterId, avatarUrl } = extractTwitterInfo(credential.user, credential)

        const regRes = await axios.post(`${API_BASE_URL}/auth/register`, {
          username: twitterHandle || credential.user.uid.slice(0, 15),
          twitterHandle,
          twitterId,
          avatarUrl,
          isXUser: true,
          autoUsernameFromX: true,
        }, {
          headers: { Authorization: `Bearer ${token}` },
        })

        setProfile(regRes.data.profile)
        return { needsUsername: false, profile: regRes.data.profile }
      }
      throw err
    }
  }

  /**
   * Link X to an existing email-password account.
   * Called from the nav "Link X" button while already logged in.
   */
  const linkX = async () => {
    if (!user) throw new Error('Not logged in')
    const provider = new TwitterAuthProvider()

    const credential = await linkWithPopup(user, provider)
    const token = await credential.user.getIdToken()
    setAuthToken(token)

    const { twitterHandle, twitterId, avatarUrl } = extractTwitterInfo(credential.user, credential)

    if (twitterHandle) {
      try {
        const res = await axios.post(`${API_BASE_URL}/auth/link-x`,
          { twitterHandle, twitterId, avatarUrl },
          { headers: { Authorization: `Bearer ${token}` } }
        )
        setProfile(res.data.profile)
        return twitterHandle
      } catch (err) {
        console.warn('Could not store X handle on backend:', err.message)
      }
    }

    return twitterHandle || null
  }

  const logout = async () => {
    await signOut(auth)
    setUser(null)
    setProfile(null)
    setAuthToken(null)
  }

  const resetPassword = async (email) => {
    await sendPasswordResetEmail(auth, email)
  }

  const getToken = async () => {
    if (!user) return null
    try {
      return await user.getIdToken(false)
    } catch {
      return authToken
    }
  }

  const isLoggedIn = !!user && !!profile
  const displayName = profile?.username || user?.displayName || null
  const twitterHandle = profile?.twitterHandle || null
  const avatarUrl = profile?.avatarUrl || null
  const isXUser = profile?.isXUser || false

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      authToken,
      isLoggedIn,
      displayName,
      twitterHandle,
      avatarUrl,
      isXUser,
      login,
      loginWithX,
      register,
      linkX,
      logout,
      resetPassword,
      getToken,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider
