import { createContext, useContext, useState, useEffect } from 'react'
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
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

  // Logout
  const logout = async () => {
    await signOut(auth)
    setUser(null)
    setProfile(null)
    setAuthToken(null)
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
    isLoggedIn: !!user,
    isVerified: user?.emailVerified || false,
    displayName: profile?.username || 'Anonymous',
    register,
    login,
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
