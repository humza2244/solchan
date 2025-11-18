import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Coin community APIs
export const getCoinCommunity = async (contractAddress) => {
  const response = await api.get(`/coins/${contractAddress}`)
  return response.data
}

export const getCoinMessages = async (contractAddress, limit = 100) => {
  const response = await api.get(`/coins/${contractAddress}/messages`, {
    params: { limit },
  })
  return response.data
}

export const createMessage = async (contractAddress, messageData) => {
  const response = await api.post(`/coins/${contractAddress}/messages`, messageData)
  return response.data
}

export const updateCoinInfo = async (contractAddress, info) => {
  const response = await api.put(`/coins/${contractAddress}`, info)
  return response.data
}

export const getAllCoins = async (recent = true) => {
  const response = await api.get('/coins', {
    params: { recent },
  })
  return response.data
}

export const getPopularCoins = async (limit = 50) => {
  const response = await api.get('/coins', {
    params: { popular: true, limit },
  })
  return response.data
}

export default api
