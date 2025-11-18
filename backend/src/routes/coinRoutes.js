import express from 'express'
import {
  getCoinCommunity,
  getCoinMessages,
  createMessage,
  updateCoin,
  getAllCoins,
} from '../controllers/coinController.js'

const router = express.Router()

// GET /api/coins - Get all coins (or recent coins)
router.get('/', getAllCoins)

// GET /api/coins/:contractAddress - Get coin community with messages
router.get('/:contractAddress', getCoinCommunity)

// PUT /api/coins/:contractAddress - Update coin info
router.put('/:contractAddress', updateCoin)

// GET /api/coins/:contractAddress/messages - Get messages for a coin
router.get('/:contractAddress/messages', getCoinMessages)

// POST /api/coins/:contractAddress/messages - Create a new message
router.post('/:contractAddress/messages', createMessage)

export default router

