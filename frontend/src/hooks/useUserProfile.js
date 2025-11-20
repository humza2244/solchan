import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

export const useUserProfile = () => {
  const { user, getAccessToken } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const hasFetched = useRef(false)

  useEffect(() => {
    const fetchProfile = async () => {
      // Only fetch once per user
      if (!user || hasFetched.current) {
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
        })
        
        setProfile(response.data)
        setError(null)
        hasFetched.current = true
      } catch (err) {
        // Silently fail - show email instead of username
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

