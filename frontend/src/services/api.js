import axios from 'axios'
import { auth } from '../config/firebase.js'

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://solchan-backend-zup0.onrender.com/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
})

// Automatically attach auth token to every request if user is logged in
api.interceptors.request.use(async (config) => {
  try {
    const user = auth.currentUser
    if (user) {
      const token = await user.getIdToken()
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch {
    // No auth token available — continue as anonymous
  }
  return config
})

export default api
