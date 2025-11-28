import { useParams, Link } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { connectSocket } from '../services/socket.js'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

const Thread = () => {
  const { id } = useParams()
  const [thread, setThread] = useState(null)
  const [replies, setReplies] = useState([])
  const [newReply, setNewReply] = useState('')
  const [name, setName] = useState('Anonymous')
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [socket, setSocket] = useState(null)
  const [hoveredPost, setHoveredPost] = useState(null)
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 })
  const [showReplyForm, setShowReplyForm] = useState(false)
  const repliesEndRef = useRef(null)

  // Connect to WebSocket
  useEffect(() => {
    const socketInstance = connectSocket()
    setSocket(socketInstance)

    socketInstance.on('connect', () => {
      console.log('✅ WebSocket connected')
    })

    return () => {
      if (socketInstance && id) {
        socketInstance.emit('leave-thread', id)
      }
    }
  }, [id])

  // Load thread and replies
  useEffect(() => {
    const loadThread = async () => {
      try {
        setLoading(true)
        const response = await axios.get(`${API_BASE_URL}/threads/${id}`)
        setThread(response.data.thread)
        setReplies(response.data.replies || [])

        // Join WebSocket room for this thread
        if (socket) {
          socket.emit('join-thread', id)
        }
      } catch (error) {
        console.error('Error loading thread:', error)
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      loadThread()
    }
  }, [id, socket])

  // Listen for real-time replies
  useEffect(() => {
    if (!socket) return

    const handleReply = (reply) => {
      console.log('Received new reply via WebSocket:', reply)
      setReplies((prev) => {
        if (prev.some(r => r.id === reply.id)) {
          return prev
        }
        return [...prev, reply]
      })
    }

    const handleReplies = (replyList) => {
      console.log('Received replies batch:', replyList.length)
      setReplies(replyList)
    }

    socket.on('thread-reply', handleReply)
    socket.on('thread-replies', handleReplies)

    return () => {
      socket.off('thread-reply', handleReply)
      socket.off('thread-replies', handleReplies)
    }
  }, [socket])

  // Scroll to bottom on new replies
  useEffect(() => {
    repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [replies])

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB')
        return
      }
      
      if (!file.type.startsWith('image/')) {
        alert('File must be an image')
        return
      }

      setImage(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleSubmitReply = async (e) => {
    e.preventDefault()
    
    if (!newReply.trim() || sending) {
      return
    }

    try {
      setSending(true)

      // Create FormData for image upload
      const formData = new FormData()
      formData.append('content', newReply.trim())
      formData.append('author', name.trim() || 'Anonymous')
      
      if (image) {
        formData.append('image', image)
      }

      // Send via REST API (handles both text and image)
      const response = await axios.post(
        `${API_BASE_URL}/threads/${id}/replies`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )

      console.log('Reply posted:', response.data)

      // Add the new reply to local state immediately
      setReplies((prev) => [...prev, response.data])

      // Also send via WebSocket for real-time updates to other users
      if (socket) {
        socket.emit('new-reply', {
          threadId: id,
          content: newReply.trim(),
          author: name.trim() || 'Anonymous',
          imageUrl: response.data.imageUrl, // Include imageUrl for other users
        })
      }

      // Clear inputs
      setNewReply('')
      setName('Anonymous')
      setImage(null)
      setImagePreview(null)
      
      // Clear file input
      const fileInput = document.querySelector('.floating-file-input')
      if (fileInput) {
        fileInput.value = ''
      }
    } catch (error) {
      console.error('Error sending reply:', error)
      alert('Failed to post reply. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleReplyClick = (postNumber) => {
    setNewReply((prev) => `${prev}>>${postNumber} `)
  }

  const handleMouseEnter = (e, postNumber) => {
    const allPosts = [thread, ...replies]
    const post = allPosts.find(p => parseInt(p.postNumber) === parseInt(postNumber))
    if (post) {
      setHoveredPost(post)
      setHoverPosition({ x: e.clientX + 15, y: e.clientY + 15 })
    }
  }

  const handleMouseMove = (e) => {
    setHoverPosition({ x: e.clientX + 15, y: e.clientY + 15 })
  }

  const handleMouseLeave = () => {
    setHoveredPost(null)
  }

  const renderContent = (content) => {
    const parts = content.split(/(>>\d+)/g)
    return parts.map((part, index) => {
      if (part.startsWith('>>') && part.length > 2) {
        const postNumber = part.substring(2)
        return (
          <span 
            key={index} 
            className="reply-link" 
            onClick={() => handleReplyClick(postNumber)}
            onMouseEnter={(e) => handleMouseEnter(e, postNumber)}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {part}
          </span>
        )
      }
      return <span key={index}>{part}</span>
    })
  }

  if (loading) {
    return (
      <div className="thread-page">
        <p>Loading thread...</p>
      </div>
    )
  }

  if (!thread) {
    return (
      <div className="thread-page">
        <p>Thread not found</p>
      </div>
    )
  }

  return (
    <div className="thread-page">
      <div className="thread-header-nav">
        <Link to={`/community/${thread.communityId}`} className="back-link">← Back to Community</Link>
      </div>

      {/* OP Post - No Box */}
      <div className="op-post">
        <div className="post-header">
          <span className="post-subject">{thread.subject}</span>
          <span className="post-name">{thread.author}</span>
          <span className="post-date">
            {new Date(thread.createdAt).toLocaleString()}
          </span>
          <span className="post-number" onClick={() => handleReplyClick(thread.postNumber)}>
            No. {thread.postNumber}
          </span>
        </div>
        {thread.imageUrl && (
          <div className="op-image">
            <img src={thread.imageUrl} alt="Thread image" />
          </div>
        )}
        <div className="op-content">
          <p>{renderContent(thread.content)}</p>
        </div>
        <div style={{ clear: 'both' }}></div>
      </div>

      {/* Replies - With Boxes */}
      <div className="replies-section">
        {replies.map((reply) => (
          <div key={reply.id} className="reply-box">
            <div className="post-header">
              <span className="post-name">{reply.author}</span>
              <span className="post-date">
                {new Date(reply.createdAt).toLocaleString()}
              </span>
              <span className="post-number" onClick={() => handleReplyClick(reply.postNumber)}>
                No. {reply.postNumber}
              </span>
            </div>
            {reply.imageUrl && (
              <div className="reply-image">
                <img src={reply.imageUrl} alt="Reply image" />
              </div>
            )}
            <div className="reply-content">
              <p>{renderContent(reply.content)}</p>
            </div>
            <div style={{ clear: 'both' }}></div>
          </div>
        ))}
        <div ref={repliesEndRef} />
      </div>

      {/* Floating Reply Toggle Button */}
      <button 
        className="reply-toggle-btn"
        onClick={() => setShowReplyForm(!showReplyForm)}
      >
        {showReplyForm ? 'Close Reply' : 'Reply'}
      </button>

      {/* Quote Preview Popup */}
      {hoveredPost && (
        <div 
          className="quote-preview" 
          style={{ position: 'fixed', left: hoverPosition.x, top: hoverPosition.y, zIndex: 1001 }}
        >
          <div className="post-header">
            {hoveredPost.subject && <span className="post-subject">{hoveredPost.subject}</span>}
            <span className="post-name">{hoveredPost.author}</span>
            <span className="post-date">
              {new Date(hoveredPost.createdAt).toLocaleString()}
            </span>
            <span className="post-number">No. {hoveredPost.postNumber}</span>
          </div>
          <div className="post-body">
            <p>{hoveredPost.content}</p>
          </div>
        </div>
      )}

      {/* Floating Reply Form */}
      {showReplyForm && (
        <div className="floating-reply-form">
          <div className="floating-form-header">
            <span>Quick Reply</span>
            <button 
              className="floating-form-close"
              onClick={() => setShowReplyForm(false)}
              type="button"
            >
              ✕
            </button>
          </div>
          <form onSubmit={handleSubmitReply} className="floating-form">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="floating-input"
              placeholder="Name (Anonymous)"
              disabled={sending}
            />

            <textarea
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
              className="floating-textarea"
              placeholder="Enter your reply..."
              required
              disabled={sending}
              rows={6}
            />

            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              disabled={sending}
              className="floating-file-input"
            />
            
            {imagePreview && (
              <div className="floating-image-preview">
                <img src={imagePreview} alt="Preview" />
              </div>
            )}

            <button type="submit" disabled={sending} className="floating-submit-btn">
              {sending ? 'Posting...' : 'Post Reply'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default Thread
