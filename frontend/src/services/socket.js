import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001'

let socket = null

export const connectSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 10000,
    })

    socket.on('connect', () => {
      console.log(' Socket connected')
    })

    socket.on('disconnect', (reason) => {
      console.log(' Socket disconnected:', reason)
    })

    socket.on('connect_error', (error) => {
      console.log(' Socket connection error:', error.message)
    })
  }
  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export const getSocket = () => {
  return socket || connectSocket()
}

export default {
  connectSocket,
  disconnectSocket,
  getSocket,
}
