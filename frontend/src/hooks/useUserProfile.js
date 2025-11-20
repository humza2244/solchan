import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

// Global flag to disable profile fetching if backend auth is broken
let profileFetchingDisabled = false

export const useUserProfile = () => {
  const { user, getAccessToken } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const hasFetched = useRef(false)

  useEffect(() => {
    const fetchProfile = async () => {
      // Don't fetch if globally disabled or already fetched
      if (!user || hasFetched.current || profileFetchingDisabled) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const token = getAccessToken()
        
        if (!token) {
          setProfile(null)
          setLoading(false)
          hasFetched.current = true
          return
        }

        const response = await axios.get(`${API_BASE_URL}/profile/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          // Don't throw on error status
          validateStatus: (status) => status < 500
        })
        
        if (response.status === 200) {
          setProfile(response.data)
          setError(null)
        } else if (response.status === 401) {
          // Backend auth is broken - disable all future profile fetches
          profileFetchingDisabled = true
          setProfile(null)
          setError(null)
        } else {
          // 404 or other - user just doesn't have profile
          setProfile(null)
          setError(null)
        }
        
        hasFetched.current = true
      } catch (err) {
        // Network error or other issue - disable fetching
        profileFetchingDisabled = true
        setProfile(null)
        setError(null)
        hasFetched.current = true
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [user, getAccessToken])

  return { profile, loading, error }
}

