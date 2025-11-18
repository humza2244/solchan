import { useParams, Link } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { getCoinCommunity } from '../services/api.js'
import { getSocket } from '../services/socket.js'

const Coin = () => {
  const { contractAddress } = useParams()
  const [coin, setCoin] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [name, setName] = useState('Anonymous')
  const [subject, setSubject] = useState('')
  const [options, setOptions] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)
  const socket = getSocket()

  // Format date like 4chan: 11/09/25(Sun)21:22:14
  const formatDate = (date) => {
    const d = new Date(date)
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const year = String(d.getFullYear()).slice(-2)
    const dayName = days[d.getDay()]
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    const seconds = String(d.getSeconds()).padStart(2, '0')
    return `${month}/${day}/${year}(${dayName})${hours}:${minutes}:${seconds}`
  }

  // Parse >> quotes in message content
  const parseQuotes = (content) => {
    const parts = []
    const quoteRegex = /(>>\d+)/g
    let lastIndex = 0
    let match

    while ((match = quoteRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: content.slice(lastIndex, match.index) })
      }
      parts.push({ type: 'quote', content: match[1], postNumber: match[1].slice(2) })
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < content.length) {
      parts.push({ type: 'text', content: content.slice(lastIndex) })
    }

    return parts.length > 0 ? parts : [{ type: 'text', content }]
  }

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load coin community and messages
  useEffect(() => {
    const loadCoinCommunity = async () => {
      try {
        setLoading(true)
        const data = await getCoinCommunity(contractAddress)
        setCoin(data.coin)
        setMessages(data.messages || [])
        
        // Join WebSocket room for this coin
        socket.emit('join-coin', contractAddress)
      } catch (error) {
        console.error('Error loading coin community:', error)
      } finally {
        setLoading(false)
      }
    }

    if (contractAddress) {
      loadCoinCommunity()
    }

    // Listen for new messages
    const handleMessage = (message) => {
      setMessages((prev) => {
        // Check if message already exists to prevent duplicates
        if (prev.some(msg => msg.id === message.id)) {
          return prev
        }
        return [...prev, message]
      })
    }

    // Listen for initial messages
    const handleMessages = (msgs) => {
      setMessages(msgs || [])
    }

    socket.on('message', handleMessage)
    socket.on('messages', handleMessages)

    // Cleanup on unmount
    return () => {
      socket.off('message', handleMessage)
      socket.off('messages', handleMessages)
      socket.emit('leave-coin', contractAddress)
    }
  }, [contractAddress, socket])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    
    if (!newMessage.trim() || sending) {
      return
    }

    try {
      setSending(true)
      
      // Send via WebSocket for real-time
      socket.emit('new-message', {
        contractAddress,
        content: newMessage.trim(),
        author: name.trim() || 'Anonymous',
      })
      
      // Clear inputs
      setNewMessage('')
      setSubject('')
      setOptions('')
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const handleQuote = (postNumber) => {
    setNewMessage(prev => prev ? `${prev}\n>>${postNumber}` : `>>${postNumber} `)
  }

  if (loading) {
    return (
      <div className="thread-page">
        <p>Loading...</p>
      </div>
    )
  }

  if (!coin) {
    return (
      <div className="thread-page">
        <p>Community not found</p>
      </div>
    )
  }

  const firstMessage = messages[0]
  const replies = messages.slice(1)

  return (
    <div className="thread-page">
      <div className="thread-header-nav">
        <Link to="/" className="back-link">[Home]</Link>
        <span className="nav-separator">-</span>
        <span className="thread-title">
          {coin.name || 'Unnamed Coin'} {coin.symbol && `(${coin.symbol})`}
        </span>
        <span className="nav-separator">-</span>
        <span className="thread-ca">{contractAddress.slice(0, 10)}...{contractAddress.slice(-6)}</span>
      </div>

      {firstMessage && (
        <div className="post op-post">
          <input type="checkbox" className="post-checkbox" />
          <div className="post-content">
            <div className="post-header">
              <span className="post-name">Anonymous</span>
              <span className="post-date">{formatDate(firstMessage.createdAt)}</span>
              <span className="post-number">No.{firstMessage.postNumber || firstMessage.id}</span>
              <a href="#reply-form" className="reply-link">[Reply]</a>
            </div>
            <div className="post-body">
              <div className="post-text">
                {parseQuotes(firstMessage.content).map((part, idx) => 
                  part.type === 'quote' ? (
                    <a 
                      key={idx}
                      href={`#post-${part.postNumber}`}
                      className="quote-link"
                      onClick={(e) => {
                        e.preventDefault()
                        handleQuote(part.postNumber)
                      }}
                    >
                      {part.content}
                    </a>
                  ) : (
                    <span key={idx}>{part.content}</span>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {replies.length > 0 && (
        <div className="replies-section">
          {replies.length > 0 && (
            <div className="replies-header">
              {replies.length} {replies.length === 1 ? 'reply' : 'replies'} omitted. Click reply to view.
            </div>
          )}
          {replies.map((message) => (
            <div key={message.id} id={`post-${message.postNumber || message.id}`} className="post reply-post">
              <input type="checkbox" className="post-checkbox" />
              <div className="post-content">
                <div className="post-header">
                  <span className="post-name">Anonymous</span>
                  <span className="post-date">{formatDate(message.createdAt)}</span>
                  <span className="post-number">No.{message.postNumber || message.id}</span>
                  <a href="#reply-form" className="reply-link">[Reply]</a>
                </div>
                <div className="post-body">
                  <div className="post-text">
                    {parseQuotes(message.content).map((part, idx) => 
                      part.type === 'quote' ? (
                        <a 
                          key={idx}
                          href={`#post-${part.postNumber}`}
                          className="quote-link"
                          onClick={(e) => {
                            e.preventDefault()
                            handleQuote(part.postNumber)
                          }}
                        >
                          {part.content}
                        </a>
                      ) : (
                        <span key={idx}>{part.content}</span>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {messages.length === 0 && (
        <div className="no-posts">
          <p>No posts yet. Be the first to post!</p>
        </div>
      )}

      <div id="reply-form" className="post-form-container">
        <form onSubmit={handleSendMessage} className="post-form">
          <div className="form-row">
            <label className="form-label">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
              placeholder="Anonymous"
            />
          </div>
          
          <div className="form-row">
            <label className="form-label">Options</label>
            <div className="form-input-group">
              <div className="form-input-group-wrapper">
                <input
                  type="text"
                  value={options}
                  onChange={(e) => setOptions(e.target.value)}
                  className="form-input"
                />
                <button type="submit" disabled={!newMessage.trim() || sending} className="post-button">
                  {sending ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </div>
          
          <div className="form-row">
            <label className="form-label">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="form-input"
              placeholder="(Optional)"
            />
          </div>
          
          <div className="form-row">
            <label className="form-label">Comment</label>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="form-textarea"
              rows="6"
              placeholder="Enter your message here..."
            />
          </div>
          
          <div className="form-row">
            <label className="form-label">File</label>
            <div className="form-file-group">
              <button type="button" className="file-button">Choose File</button>
              <span className="file-text">No file chosen</span>
            </div>
          </div>
        </form>
        
        <div className="form-footer">
          <p>• Please read the <a href="#">Rules</a> and <a href="#">FAQ</a> before posting.</p>
        </div>
      </div>

      <div ref={messagesEndRef} />
    </div>
  )
}

export default Coin
