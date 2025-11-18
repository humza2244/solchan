import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { connectSocket } from '../services/socket.js'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

const Community = () => {
  const { id } = useParams()
  const [community, setCommunity] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [name, setName] = useState('Anonymous')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const { user, getAccessToken } = useAuth()
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    // Connect socket
    const socketInstance = connectSocket()
    setSocket(socketInstance)

    // Authenticate socket if user is logged in
    if (user) {
      const token = getAccessToken()
      if (token) {
        socketInstance.emit('authenticate', token)
      }
    }

    return () => {
      if (socketInstance) {
        socketInstance.emit('leave-community', id)
      }
    }
  }, [user, id, getAccessToken])

  // Load community and messages
  useEffect(() => {
    const loadCommunity = async () => {
      try {
        setLoading(true)
        const response = await axios.get(`${API_BASE_URL}/communities/${id}`)
        setCommunity(response.data.community)
        setMessages(response.data.messages || [])
        
        // Join WebSocket room for this community
        if (socket) {
          socket.emit('join-community', id)
        }
      } catch (error) {
        console.error('Error loading community:', error)
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      loadCommunity()
    }
  }, [id, socket])

  // Listen for real-time messages
  useEffect(() => {
    if (!socket) return

    const handleMessage = (message) => {
      setMessages((prev) => {
        if (prev.some(msg => msg.id === message.id)) {
          return prev
        }
        return [...prev, message]
      })
    }

    const handleMessages = (msgs) => {
      setMessages(msgs || [])
    }

    const handleError = (error) => {
      alert(error.message || 'An error occurred')
    }

    socket.on('message', handleMessage)
    socket.on('messages', handleMessages)
    socket.on('error', handleError)

    return () => {
      socket.off('message', handleMessage)
      socket.off('messages', handleMessages)
      socket.off('error', handleError)
    }
  }, [socket])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    
    // TEMPORARY: Skip user check for testing
    // if (!user) {
    //   alert('You must be signed in to send messages')
    //   return
    // }
    
    if (!newMessage.trim() || sending) {
      return
    }

    try {
      setSending(true)
      
      // Send via WebSocket for real-time
      if (socket) {
        socket.emit('new-message', {
          communityId: id,
          content: newMessage.trim(),
          author: name.trim() || 'Anonymous',
        })
      }
      
      // Clear inputs
      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="thread-page">
        <p>Loading community...</p>
      </div>
    )
  }

  if (!community) {
    return (
      <div className="thread-page">
        <p>Community not found</p>
      </div>
    )
  }

  return (
    <div className="thread-page">
      <div className="thread-header-nav">
        <a href="/" className="back-link">← Back to Home</a>
        <div className="thread-title">
          {community.imageUrl && (
            <img src={community.imageUrl} alt={community.coinName} style={{ width: 32, height: 32, marginRight: 8, borderRadius: 4 }} />
          )}
          {community.ticker} - {community.coinName}
        </div>
        <div className="thread-ca">{community.contractAddress}</div>
        {community.description && <p style={{ fontSize: 12, color: '#666', marginTop: 5 }}>{community.description}</p>}
        <div style={{ fontSize: 11, color: '#888', marginTop: 5 }}>
          {community.messageCount} messages • {community.uniqueUsersCount} users
        </div>
      </div>

      {/* Messages */}
      <div className="messages-section">
        {messages.length === 0 ? (
          <div className="no-posts">
            <p>No messages yet. Be the first to post!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="post">
              <input type="checkbox" className="post-checkbox" />
              <div className="post-content">
                <div className="post-header">
                  <span className="post-name">{message.author}</span>
                  <span className="post-date">
                    {new Date(message.createdAt).toLocaleString()}
                  </span>
                  <span className="post-number">No. {message.postNumber}</span>
                </div>
                <div className="post-body">
                  <p className="post-text">{message.content}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Post Form - TEMPORARILY ALWAYS SHOWN FOR TESTING */}
      <div className="post-form-container">
        <form onSubmit={handleSendMessage} className="post-form">
          <div className="form-row">
            <div className="form-label">Name</div>
            <div className="form-input-group">
              <div className="form-input-group-wrapper">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                  placeholder="Anonymous"
                />
              </div>
            </div>
          </div>
          <div className="form-row">
            <div className="form-label">Comment</div>
            <div className="form-input-group">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="form-textarea"
                placeholder="Enter your message..."
                required
                disabled={sending}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-label"></div>
            <div className="form-input-group">
              <button type="submit" disabled={sending} className="post-button">
                {sending ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Community

