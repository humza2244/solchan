import { createContext, useContext, useState, useEffect } from 'react'
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
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
   * Login (or register) with Google.
   * - Existing users: fetches profile, done.
   * - New users: auto-creates profile using their Google display name.
   */
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    const credential = await signInWithPopup(auth, provider)
    const token = await credential.user.getIdToken()
    setAuthToken(token)

    const googleUser = credential.user
    const displayName = googleUser.displayName || googleUser.email?.split('@')[0] || 'user'
    const avatarUrl = googleUser.photoURL || null

    // Try to fetch existing profile
    try {
      const res = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setProfile(res.data)
      return { needsUsername: false }
    } catch (err) {
      if (err.response?.status === 404) {
        // New user -- auto-create profile from Google info
        // Clean the display name to create a username
        const cleanName = displayName.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20) || 'user'

        const regRes = await axios.post(`${API_BASE_URL}/auth/register`, {
          username: cleanName,
          avatarUrl,
          isGoogleUser: true,
        }, {
          headers: { Authorization: `Bearer ${token}` },
        })

        setProfile(regRes.data.profile)
        return { needsUsername: false, profile: regRes.data.profile }
      }
      throw err
    }
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
  const avatarUrl = profile?.avatarUrl || null

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      authToken,
      isLoggedIn,
      displayName,
      avatarUrl,
      login,
      loginWithGoogle,
      register,
      logout,
      resetPassword,
      getToken,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider
