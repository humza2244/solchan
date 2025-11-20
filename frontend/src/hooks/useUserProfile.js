import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

export const useUserProfile = () => {
  const { user, getAccessToken } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setProfile(null)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const token = getAccessToken()
        
        if (!token) {
          setProfile(null)
          setLoading(false)
          return
        }

        const response = await axios.get(`${API_BASE_URL}/profile/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        
        setProfile(response.data)
        setError(null)
      } catch (err) {
        console.error('Error fetching user profile:', err)
        setError(err)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [user, getAccessToken])

  return { profile, loading, error }
}

