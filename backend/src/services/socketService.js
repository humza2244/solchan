// Singleton to store the socket.io instance
let io = null

export const setSocketIO = (socketInstance) => {
  io = socketInstance
}

export const getSocketIO = () => {
  return io
}

export const broadcastToThread = (threadId, event, data) => {
  if (!io) {
    console.warn('  Socket.IO not initialized, cannot broadcast')
    return
  }
  io.to(`thread-${threadId}`).emit(event, data)
  console.log(` Broadcasted ${event} to thread-${threadId}`)
}

