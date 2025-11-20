import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { connectSocket } from '../services/socket.js'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

const Community = () => {
  const { id } = useParams()
  const [community, setCommunity] = useState(null)
  const [messages, setMessages] = useState([])
  const [displayedMessages, setDisplayedMessages] = useState([])
  const [messagesPerPage] = useState(50)
  const [showingCount, setShowingCount] = useState(50)
  const [newMessage, setNewMessage] = useState('')
  const [name, setName] = useState('Anonymous')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [socket, setSocket] = useState(null)
  const [hoveredPost, setHoveredPost] = useState(null)
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    // Connect socket (no auth needed - anonymous)
    const socketInstance = connectSocket()
    setSocket(socketInstance)

    return () => {
      if (socketInstance) {
        socketInstance.emit('leave-community', id)
      }
    }
  }, [id])

  // Load community and messages
  useEffect(() => {
    const loadCommunity = async () => {
      try {
        setLoading(true)
        const response = await axios.get(`${API_BASE_URL}/communities/${id}`)
        setCommunity(response.data.community)
        const allMessages = response.data.messages || []
        setMessages(allMessages)
        
        // Show last 50 messages initially (most recent)
        setShowingCount(messagesPerPage)
        
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
  }, [id, socket, messagesPerPage])

  // Update displayed messages when messages or showingCount changes
  useEffect(() => {
    if (messages.length === 0) {
      setDisplayedMessages([])
      return
    }
    
    // Show the most recent X messages (they're already in chronological order from API)
    const totalMessages = messages.length
    const startIndex = Math.max(0, totalMessages - showingCount)
    setDisplayedMessages(messages.slice(startIndex))
  }, [messages, showingCount])

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
      const allMessages = msgs || []
      setMessages(allMessages)
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

  // Parse message content for reply links (>>postNumber)
  const parseMessageContent = (content) => {
    const replyRegex = />>(\d+)/g
    const parts = []
    let lastIndex = 0
    let match

    while ((match = replyRegex.exec(content)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: content.slice(lastIndex, match.index)
        })
      }
      
      // Add the reply link
      parts.push({
        type: 'reply',
        postNumber: parseInt(match[1]),
        content: match[0]
      })
      
      lastIndex = match.index + match[0].length
    }
    
    // Add remaining text
    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex)
      })
    }
    
    return parts.length > 0 ? parts : [{ type: 'text', content }]
  }

  const handleReplyClick = (postNumber) => {
    setNewMessage((prev) => (prev ? `${prev}\n>>${postNumber}\n` : `>>${postNumber}\n`))
  }

  const handleReplyHover = (postNumber, event) => {
    // Convert to integer for comparison
    const targetPostNumber = parseInt(postNumber)
    const quotedMessage = messages.find(m => parseInt(m.postNumber) === targetPostNumber)
    
    if (quotedMessage) {
      setHoveredPost(quotedMessage)
      setHoverPosition({ x: event.clientX, y: event.clientY })
    } else {
      console.log('Message not found for post number:', targetPostNumber, 'Available:', messages.map(m => m.postNumber))
    }
  }

  const handleReplyLeave = () => {
    setHoveredPost(null)
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    
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
        {/* Load More Button */}
        {messages.length > showingCount && (
          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            <button
              onClick={() => {
                setLoadingMore(true)
                setTimeout(() => {
                  setShowingCount(prev => Math.min(prev + messagesPerPage, messages.length))
                  setLoadingMore(false)
                }, 300)
              }}
              disabled={loadingMore}
              style={{
                padding: '8px 16px',
                background: '#D6DAF0',
                color: '#0000EE',
                border: '1px solid #B7C5D9',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold'
              }}
            >
              {loadingMore ? 'Loading...' : `Load Earlier Messages (${messages.length - showingCount} more)`}
            </button>
          </div>
        )}

        {displayedMessages.length === 0 ? (
          <div className="no-posts">
            <p>No messages yet. Be the first to post!</p>
          </div>
        ) : (
          displayedMessages.map((message) => {
            const parsedContent = parseMessageContent(message.content)
            
            return (
              <div key={message.id} className="post">
                <input type="checkbox" className="post-checkbox" />
                <div className="post-content">
                  <div className="post-header">
                    <span className="post-name">{message.username || message.author || 'Anonymous'}</span>
                    <span className="post-date">
                      {new Date(message.createdAt).toLocaleString()}
                    </span>
                    <span 
                      className="post-number"
                      onClick={() => handleReplyClick(message.postNumber)}
                      style={{ cursor: 'pointer' }}
                      title="Click to reply"
                    >
                      No. {message.postNumber}
                    </span>
                  </div>
                  <div className="post-body">
                    <p className="post-text">
                      {parsedContent.map((part, idx) => {
                        if (part.type === 'reply') {
                          return (
                            <span
                              key={idx}
                              className="reply-link"
                              onClick={() => handleReplyClick(part.postNumber)}
                              onMouseEnter={(e) => handleReplyHover(part.postNumber, e)}
                              onMouseLeave={handleReplyLeave}
                            >
                              {part.content}
                            </span>
                          )
                        }
                        return <span key={idx}>{part.content}</span>
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )
          })
        )}
        
        {/* Hover Preview for Quoted Messages */}
        {hoveredPost && (
          <div 
            className="quote-preview"
            style={{
              position: 'fixed',
              left: `${hoverPosition.x + 10}px`,
              top: `${hoverPosition.y + 10}px`,
              zIndex: 9999
            }}
          >
            <div className="post-header">
              <span className="post-name">{hoveredPost.username || hoveredPost.author || 'Anonymous'}</span>
              <span className="post-date">
                {new Date(hoveredPost.createdAt).toLocaleString()}
              </span>
              <span className="post-number">No. {hoveredPost.postNumber}</span>
            </div>
            <div className="post-body">
              <p className="post-text">{hoveredPost.content}</p>
            </div>
          </div>
        )}
      </div>

      {/* Post Form */}
      <div className="post-form-container">
        <form onSubmit={handleSendMessage} className="post-form">
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

