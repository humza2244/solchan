import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  // TEMPORARY: Mock auth state for testing - BYPASS ALL AUTH
  const [user, setUser] = useState({
    id: '00000000-0000-0000-0000-000000000001',
    email: 'test@solchan.com'
  })
  const [session, setSession] = useState({
    access_token: 'mock-token-for-testing'
  })
  const [loading, setLoading] = useState(false)

  // Mock sign in - always succeeds
  const signIn = async (email, password) => {
    console.log('⚠️ MOCK SIGN IN - Auth bypassed for testing')
    return { user, session, error: null }
  }

  // Mock sign up - always succeeds
  const signUp = async (email, password) => {
    console.log('⚠️ MOCK SIGN UP - Auth bypassed for testing')
    return { user, session, error: null }
  }

  // Mock sign out
  const signOut = async () => {
    console.log('⚠️ MOCK SIGN OUT - Auth bypassed for testing')
    // Don't actually sign out during testing
    return { error: null }
  }

  // Mock get access token
  const getAccessToken = () => {
    return 'mock-token-for-testing'
  }

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    getAccessToken,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/* ORIGINAL AUTH CODE - UNCOMMENT WHEN READY TO USE REAL AUTH

import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../config/supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { user: data.user, session: data.session, error }
  }

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { user: data.user, session: data.session, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const getAccessToken = () => {
    return session?.access_token || null
  }

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    getAccessToken,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
*/
