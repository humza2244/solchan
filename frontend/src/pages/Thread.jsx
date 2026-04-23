import { useParams, Link } from 'react-router-dom'
import { useEffect, useState, useRef, useCallback } from 'react'
import { connectSocket } from '../services/socket.js'
import { API_BASE_URL } from '../services/api.js'
import DOMPurify from 'dompurify'
import axios from 'axios'
import { useAuth } from '../context/AuthContext.jsx'
import ReportModal from '../components/ReportModal.jsx'
import ImageLightbox from '../components/ImageLightbox.jsx'
import ReportButton from '../components/ReportButton.jsx'

// Relative time helper
const timeAgo = (dateStr) => {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

// Generate a consistent color from a string
const stringToColor = (str) => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 55%, 45%)`
}

// Generate a short poster ID from author name
const getPosterID = (author) => {
  let hash = 0
  for (let i = 0; i < author.length; i++) {
    hash = ((hash << 5) - hash) + author.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(36).slice(0, 6).toUpperCase()
}

const Thread = () => {
  const { id } = useParams()
  const { isLoggedIn, displayName, user, getToken } = useAuth()
  const [thread, setThread] = useState(null)
  const [replies, setReplies] = useState([])
  const [newReply, setNewReply] = useState('')
  const [name, setName] = useState(isLoggedIn ? displayName : 'Anonymous')
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [socket, setSocket] = useState(null)
  const [hoveredPost, setHoveredPost] = useState(null)
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 })
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [highlightedPost, setHighlightedPost] = useState(null)
  const [lightboxImg, setLightboxImg] = useState(null)
  const [liveUsers, setLiveUsers] = useState(0)
  const [reportTarget, setReportTarget] = useState(null)
  const [communityData, setCommunityData] = useState(null)
  const [isWatched, setIsWatched] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [expandedImages, setExpandedImages] = useState(new Set())
  const repliesEndRef = useRef(null)
  const justPostedRef = useRef(new Set())
  const recentContentRef = useRef(new Set())
  const addingReplyRef = useRef(new Set())
  const myPostsRef = useRef(new Set())
  const replyTextareaRef = useRef(null)

  // Track which post numbers are "yours"
  const myPosts = myPostsRef.current

  // Build reply backlinks map: postNumber -> [list of postNumbers that quote it]
  const backlinksMap = (() => {
    if (!thread) return {}
    const allPosts = [thread, ...replies]
    const map = {}
    allPosts.forEach(post => {
      const matches = (post.content || '').match(/>>\d+/g)
      if (matches) {
        matches.forEach(m => {
          const targetNum = m.replace('>>', '')
          if (!map[targetNum]) map[targetNum] = []
          if (!map[targetNum].includes(post.postNumber)) {
            map[targetNum].push(post.postNumber)
          }
        })
      }
    })
    return map
  })()

  // Check watch status on load
  useEffect(() => {
    if (id) {
      const watched = JSON.parse(localStorage.getItem('watchedThreads') || '[]')
      setIsWatched(watched.some(w => w.id === id))
    }
  }, [id])

  const toggleWatch = () => {
    const watched = JSON.parse(localStorage.getItem('watchedThreads') || '[]')
    if (isWatched) {
      const updated = watched.filter(w => w.id !== id)
      localStorage.setItem('watchedThreads', JSON.stringify(updated))
      setIsWatched(false)
    } else {
      watched.push({
        id,
        subject: thread?.subject || 'Untitled',
        communityId: thread?.communityId,
        lastReplyCount: replies.length,
        lastChecked: Date.now()
      })
      localStorage.setItem('watchedThreads', JSON.stringify(watched))
      setIsWatched(true)
    }
  }

  // Update watched thread counts when replies change
  useEffect(() => {
    if (id && isWatched) {
      const watched = JSON.parse(localStorage.getItem('watchedThreads') || '[]')
      const updated = watched.map(w => w.id === id ? { ...w, lastReplyCount: replies.length, lastChecked: Date.now() } : w)
      localStorage.setItem('watchedThreads', JSON.stringify(updated))
    }
  }, [replies.length, id, isWatched])

  // Dynamic page title
  useEffect(() => {
    if (thread) {
      document.title = `${thread.subject} (${replies.length}r) — solchan`
    }
    return () => { document.title = 'solchan — memecoin community boards' }
  }, [thread, replies.length])

  const handleShareLink = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const handleToggleLock = async () => {
    try {
      const token = await getToken()
      const res = await axios.post(`${API_BASE_URL}/mod/lock/${thread.id}`, {
        communityId: thread.communityId,
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      setThread(prev => ({ ...prev, isLocked: res.data.isLocked }))
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to toggle lock')
    }
  }

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })
  const scrollToBottom = () => repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' })

  // Toggle image expand/collapse
  const toggleImage = (postNumber) => {
    setExpandedImages(prev => {
      const next = new Set(prev)
      if (next.has(postNumber)) next.delete(postNumber)
      else next.add(postNumber)
      return next
    })
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        if (!thread?.isLocked) setShowReplyForm(true)
      }
      if (e.key === 'Escape') {
        setShowReplyForm(false)
        setLightboxImg(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [thread])

  // Insert formatting around selection in textarea
  const insertFormatting = (prefix, suffix) => {
    const textarea = replyTextareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = newReply.substring(start, end)
    const before = newReply.substring(0, start)
    const after = newReply.substring(end)
    const formatted = `${before}${prefix}${selected || 'text'}${suffix}${after}`
    setNewReply(formatted)
    // Restore cursor position after state update
    setTimeout(() => {
      textarea.focus()
      const newPos = start + prefix.length + (selected || 'text').length
      textarea.setSelectionRange(newPos, newPos)
    }, 0)
  }

  // Compute thread stats
  const threadStats = (() => {
    if (!thread) return { uniquePosters: 0, imageCount: 0, totalPosts: 0 }
    const allPosts = [thread, ...replies]
    const uniqueAuthors = new Set(allPosts.map(p => p.author))
    const imageCount = allPosts.filter(p => p.imageUrl).length
    return { uniquePosters: uniqueAuthors.size, imageCount, totalPosts: allPosts.length }
  })()

  // Check if current user is mod/creator
  const isMod = user && communityData && (
    communityData.creatorId === user.uid ||
    (communityData.moderators || []).includes(user.uid)
  )

  // Connect to WebSocket
  useEffect(() => {
    const socketInstance = connectSocket()
    setSocket(socketInstance)

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

        // Load community data to check mod status
        if (response.data.thread?.communityId) {
          try {
            const commRes = await axios.get(`${API_BASE_URL}/communities/${response.data.thread.communityId}`)
            setCommunityData(commRes.data.community)
          } catch (e) { /* non-critical */ }
        }

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

  // Listen for real-time replies and user count
  useEffect(() => {
    if (!socket) return

    const handleReply = (reply) => {
      if (justPostedRef.current.has(reply.id)) return
      if (addingReplyRef.current.has(reply.id)) return
      
      addingReplyRef.current.add(reply.id)
      
      setReplies((prev) => {
        if (prev.some(r => r.id === reply.id)) return prev
        return [...prev, reply]
      })
      
      setTimeout(() => addingReplyRef.current.delete(reply.id), 100)
    }

    const handleReplies = (replyList) => {
      setReplies(replyList)
    }

    const handleUserCount = (count) => {
      setLiveUsers(count)
    }

    socket.on('thread-reply', handleReply)
    socket.on('thread-replies', handleReplies)
    socket.on('thread-user-count', handleUserCount)

    return () => {
      socket.off('thread-reply', handleReply)
      socket.off('thread-replies', handleReplies)
      socket.off('thread-user-count', handleUserCount)
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

      // Revoke old preview URL to prevent memory leak
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
      }

      setImage(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleSubmitReply = async (e) => {
    e.preventDefault()
    
    if (!newReply.trim() || sending) return

    const contentFingerprint = `${newReply.trim()}_${Date.now()}`
    recentContentRef.current.add(contentFingerprint)

    try {
      setSending(true)

      const formData = new FormData()
      formData.append('content', newReply.trim())
      formData.append('author', name.trim() || 'Anonymous')
      
      if (image) {
        formData.append('image', image)
      }

      const response = await axios.post(
        `${API_BASE_URL}/threads/${id}/replies`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )

      justPostedRef.current.add(response.data.id)

      // Track as "my" post
      if (response.data.postNumber) {
        myPostsRef.current.add(String(response.data.postNumber))
      }

      if (!addingReplyRef.current.has(response.data.id)) {
        addingReplyRef.current.add(response.data.id)
        
        setReplies((prev) => {
          if (prev.some(r => r.id === response.data.id)) return prev
          return [...prev, response.data]
        })
        
        setTimeout(() => addingReplyRef.current.delete(response.data.id), 100)
      }
      
      setTimeout(() => {
        justPostedRef.current.delete(response.data.id)
        recentContentRef.current.delete(contentFingerprint)
      }, 10000)

      setNewReply('')
      setName(isLoggedIn ? displayName : 'Anonymous')
      setImage(null)
      setImagePreview(null)
      
      const fileInput = document.querySelector('.floating-file-input')
      if (fileInput) fileInput.value = ''
    } catch (error) {
      console.error('Error sending reply:', error)
      recentContentRef.current.delete(contentFingerprint)
      alert('Failed to post reply. Please try again.')
    } finally {
      setSending(false)
    }
  }

  // Scroll to a specific post and highlight it
  const scrollToPost = useCallback((postNumber) => {
    const el = document.getElementById(`post-${postNumber}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlightedPost(postNumber)
      setTimeout(() => setHighlightedPost(null), 3000)
    }
  }, [])

  const handleReplyClick = (postNumber) => {
    setNewReply((prev) => `${prev}>>${postNumber} `)
    setShowReplyForm(true)
  }

  const handlePostNumberClick = (postNumber) => {
    scrollToPost(postNumber)
    handleReplyClick(postNumber)
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

  // Render post content with quote links, greentext, and XSS sanitization
  const renderContent = (content) => {
    if (!content) return null
    
    const clean = DOMPurify.sanitize(content, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
    const lines = clean.split('\n')

    const renderFormattedText = (text, keyBase) => {
      // Split by formatting patterns
      const combinedRegex = /(\*\*(.+?)\*\*|\*(.+?)\*|~~(.+?)~~|`(.+?)`)/g
      const elements = []
      let lastIndex = 0
      let match

      while ((match = combinedRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          elements.push(<span key={`${keyBase}-t-${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>)
        }
        const fullMatch = match[0]
        if (fullMatch.startsWith('**')) {
          elements.push(<strong key={`${keyBase}-b-${match.index}`} className="fmt-bold">{match[2]}</strong>)
        } else if (fullMatch.startsWith('~~')) {
          elements.push(<span key={`${keyBase}-s-${match.index}`} className="fmt-spoiler">{match[4]}</span>)
        } else if (fullMatch.startsWith('`')) {
          elements.push(<code key={`${keyBase}-c-${match.index}`} className="fmt-code">{match[5]}</code>)
        } else if (fullMatch.startsWith('*')) {
          elements.push(<em key={`${keyBase}-i-${match.index}`} className="fmt-italic">{match[3]}</em>)
        }
        lastIndex = match.index + fullMatch.length
      }
      if (lastIndex < text.length) {
        elements.push(<span key={`${keyBase}-t-${lastIndex}`}>{text.slice(lastIndex)}</span>)
      }
      return elements.length > 0 ? elements : text
    }
    
    return lines.map((line, lineIndex) => {
      const isGreentext = line.startsWith('>') && !line.startsWith('>>')
      
      const parts = line.split(/(>>\d+)/g)
      const rendered = parts.map((part, partIndex) => {
        if (part.startsWith('>>') && part.length > 2) {
          const postNumber = part.substring(2)
          return (
            <span 
              key={`${lineIndex}-${partIndex}`}
              className="reply-link" 
              onClick={() => scrollToPost(postNumber)}
              onMouseEnter={(e) => handleMouseEnter(e, postNumber)}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {part}
            </span>
          )
        }
        return <span key={`${lineIndex}-${partIndex}`}>{renderFormattedText(part, `${lineIndex}-${partIndex}`)}</span>
      })
      
      return (
        <span key={lineIndex}>
          {isGreentext ? (
            <span className="greentext">{rendered}</span>
          ) : (
            rendered
          )}
          {lineIndex < lines.length - 1 && <br />}
        </span>
      )
    })
  }

  if (loading) {
    return (
      <div className="thread-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <span className="loading-text">Loading thread...</span>
          <span className="loading-hint">First load may take a moment while the server wakes up</span>
        </div>
      </div>
    )
  }

  if (!thread) {
    return (
      <div className="thread-page">
        <div className="no-threads" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <img src="/mascot.png" alt="solchan mascot" style={{ width: 80, height: 'auto', marginBottom: 12, opacity: 0.8 }} />
          <div style={{ fontSize: 36, marginBottom: 12, color: '#ccc', fontWeight: 800 }}>404</div>
          <p style={{ fontSize: 16, marginBottom: 16, color: '#666' }}>Thread not found or has been deleted</p>
          <Link to="/" className="back-link" style={{ fontSize: 14 }}>Back to Home</Link>
        </div>
      </div>
    )
  }

  const handleDeleteThread = async (threadId) => {
    if (!confirm('Delete this entire thread?')) return
    try {
      const token = await getToken()
      await axios.delete(`${API_BASE_URL}/mod/thread/${threadId}?communityId=${thread.communityId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      window.location.href = `/community/${thread.communityId}`
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete')
    }
  }

  const handleDeleteReply = async (replyId) => {
    if (!confirm('Delete this reply?')) return
    try {
      const token = await getToken()
      await axios.delete(`${API_BASE_URL}/mod/reply/${replyId}?communityId=${thread.communityId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      setReplies(prev => prev.filter(r => r.id !== replyId))
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete')
    }
  }

  const handleTogglePin = async () => {
    try {
      const token = await getToken()
      const res = await axios.post(`${API_BASE_URL}/mod/pin/${thread.id}`, {
        communityId: thread.communityId,
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      setThread(prev => ({ ...prev, isPinned: res.data.isPinned }))
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to toggle pin')
    }
  }

  const handleBanUser = async (username) => {
    const reason = prompt(`Ban "${username}" from this community?\n\nEnter reason:`)
    if (reason === null) return // cancelled
    try {
      const token = await getToken()
      await axios.post(`${API_BASE_URL}/mod/${thread.communityId}/ban`, {
        username,
        reason: reason || 'Rule violation',
        duration: null, // permanent from thread view, mods can adjust in panel
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      alert(`${username} has been banned from this community.`)
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to ban user')
    }
  }

  return (
    <div className="thread-page">
      {/* Report Modal */}
      {reportTarget && (
        <ReportModal
          contentType={reportTarget.type}
          contentId={reportTarget.id}
          communityId={thread.communityId}
          onClose={() => setReportTarget(null)}
        />
      )}

      {/* Image Lightbox */}
      {lightboxImg && (
        <div className="lightbox-overlay" onClick={() => setLightboxImg(null)}>
          <button className="lightbox-close" onClick={() => setLightboxImg(null)}></button>
          <img src={lightboxImg} alt="Full size" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <div className="thread-header-nav">
        <Link to={`/community/${thread.communityId}`} className="back-link">← Back to Community</Link>
        <div className="thread-header-actions">
          <span className="thread-post-count">{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</span>
          <button
            className={`thread-action-btn ${isWatched ? 'watched' : ''}`}
            onClick={toggleWatch}
            title={isWatched ? 'Unwatch thread' : 'Watch thread'}
          >
            {isWatched ? ' Watching' : ' Watch'}
          </button>
          <button
            className={`thread-action-btn ${linkCopied ? 'copied' : ''}`}
            onClick={handleShareLink}
            title="Copy thread link"
          >
            {linkCopied ? 'OK Copied!' : ' Share'}
          </button>
          {liveUsers > 0 && (
            <span className="live-users">{liveUsers} in thread</span>
          )}
        </div>
      </div>

      {/* Thread locked banner */}
      {thread.isLocked && (
        <div className="thread-locked-banner">
           This thread is locked. No new replies can be posted.
        </div>
      )}

      {/* Community rules */}
      {communityData?.rules && (
        <details className="community-rules-panel">
          <summary className="rules-toggle"> Community Rules</summary>
          <div className="rules-content">
            {communityData.rules.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </details>
      )}

      {/* OP Post */}
      <div className="op-post" id={`post-${thread.postNumber}`}>
        <div className="post-header">
          <span className="post-subject">{thread.subject}</span>
          <Link to={`/user/${encodeURIComponent(thread.author)}`} className="post-name">{thread.author}</Link>
          <span className="poster-id" style={{ background: stringToColor(thread.author) }}
            title={`Poster ID: ${getPosterID(thread.author)}`}
          >(ID: {getPosterID(thread.author)})</span>
          <span className="post-date">
            {new Date(thread.createdAt).toLocaleString()}
            <span className="time-ago">({timeAgo(thread.createdAt)})</span>
          </span>
          <span className="post-number" onClick={() => handlePostNumberClick(thread.postNumber)}>
            No. {thread.postNumber}
          </span>
          {thread.isLocked && <span className="lock-indicator"></span>}
          {myPosts.has(String(thread.postNumber)) && <span className="you-marker">(You)</span>}
          <span className="post-actions">
            <button className="report-btn" onClick={() => setReportTarget({ type: 'thread', id: thread.id })} title="Report"></button>
            {isMod && <button className="pin-btn" onClick={handleTogglePin} title={thread.isPinned ? 'Unpin' : 'Pin'}>{thread.isPinned ? '' : ''}</button>}
            {isMod && <button className="lock-btn" onClick={handleToggleLock} title={thread.isLocked ? 'Unlock' : 'Lock'}>{thread.isLocked ? '' : ''}</button>}
            {isMod && <button className="delete-btn" onClick={() => handleDeleteThread(thread.id)} title="Delete Thread"></button>}
            {isMod && <button className="ban-btn" onClick={() => handleBanUser(thread.author)} title="Ban User"></button>}
          </span>
        </div>
        {thread.imageUrl && (
          <div className="op-image">
            <ImageLightbox
              src={thread.imageUrl}
              alt="Thread image"
              onError={(e) => { e.target.style.display = 'none' }}
            />
          </div>
        )}
        <div className="op-content">
          <p>{renderContent(thread.content)}</p>
        </div>
        {/* Backlinks */}
        {backlinksMap[thread.postNumber] && backlinksMap[thread.postNumber].length > 0 && (
          <div className="backlinks">
            Replies: {backlinksMap[thread.postNumber].map(num => (
              <span key={num} className="reply-link backlink" onClick={() => scrollToPost(num)}>&gt;&gt;{num}</span>
            ))}
          </div>
        )}
        <div style={{ clear: 'both' }}></div>
      </div>
      {/* Thread Stats Bar */}
      <div className="thread-stats-bar">
        <span> {threadStats.totalPosts} posts</span>
        <span> {threadStats.uniquePosters} posters</span>
        <span> {threadStats.imageCount} images</span>
      </div>

      {/* Replies */}
      <div className="replies-section">
        {replies.map((reply) => (
          <div 
            key={reply.id} 
            id={`post-${reply.postNumber}`}
            className={`reply-box ${highlightedPost == reply.postNumber ? 'highlighted' : ''} ${myPosts.has(String(reply.postNumber)) ? 'my-post' : ''}`}
          >
            <div className="post-header">
              <Link to={`/user/${encodeURIComponent(reply.author)}`} className="post-name">{reply.author}</Link>
              <span className="poster-id" style={{ background: stringToColor(reply.author) }}
                title={`Poster ID: ${getPosterID(reply.author)}`}
              >(ID: {getPosterID(reply.author)})</span>
              <span className="post-date">
                {new Date(reply.createdAt).toLocaleString()}
                <span className="time-ago">({timeAgo(reply.createdAt)})</span>
              </span>
              <span className="post-number" onClick={() => handlePostNumberClick(reply.postNumber)}>
                No. {reply.postNumber}
              </span>
              {myPosts.has(String(reply.postNumber)) && <span className="you-marker">(You)</span>}
              <span className="post-actions">
                <button className="report-btn" onClick={() => setReportTarget({ type: 'reply', id: reply.id })} title="Report"></button>
                {isMod && <button className="delete-btn" onClick={() => handleDeleteReply(reply.id)} title="Delete Reply"></button>}
                {isMod && <button className="ban-btn" onClick={() => handleBanUser(reply.author)} title="Ban User"></button>}
              </span>
            </div>
            {reply.imageUrl && (
              <div className="reply-image">
                <ImageLightbox
                  src={reply.imageUrl}
                  alt="Reply image"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              </div>
            )}
            <div className="reply-content">
              <p>{renderContent(reply.content)}</p>
            </div>
            {/* Backlinks */}
            {backlinksMap[reply.postNumber] && backlinksMap[reply.postNumber].length > 0 && (
              <div className="backlinks">
                Replies: {backlinksMap[reply.postNumber].map(num => (
                  <span key={num} className="reply-link backlink" onClick={() => scrollToPost(num)}>&gt;&gt;{num}</span>
                ))}
              </div>
            )}
            <ReportButton type="reply" targetId={reply.id} communityId={thread.communityId} />
            <div style={{ clear: 'both' }}></div>
          </div>
        ))}
        <div ref={repliesEndRef} />
      </div>

      {/* Scroll buttons */}
      <div className="scroll-buttons">
        <button className="scroll-btn" onClick={scrollToTop} title="Scroll to top">↑</button>
        <button className="scroll-btn" onClick={scrollToBottom} title="Scroll to bottom">↓</button>
      </div>

      {/* Floating Reply Toggle */}
      {!thread.isLocked ? (
        <button 
          className="reply-toggle-btn"
          onClick={() => setShowReplyForm(!showReplyForm)}
        >
          {showReplyForm ? ' Close' : ' Write a Reply'}
        </button>
      ) : (
        <button className="reply-toggle-btn locked" disabled>
           Thread Locked
        </button>
      )}

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
      {showReplyForm && !thread.isLocked && (
        <div className="floating-reply-form">
          <div className="floating-form-header">
            <span>Quick Reply</span>
            <button 
              className="floating-form-close"
              onClick={() => setShowReplyForm(false)}
              type="button"
            >
              
            </button>
          </div>
          <form onSubmit={handleSubmitReply} className="floating-form">
            <input
              type="text"
              value={isLoggedIn ? displayName : name}
              onChange={(e) => setName(e.target.value)}
              className="floating-input"
              placeholder="Name (Anonymous)"
              disabled={sending || isLoggedIn}
            />

            <textarea
              ref={replyTextareaRef}
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
              className="floating-textarea"
              placeholder="Enter your reply..."
              required
              disabled={sending}
              rows={6}
            />

            {/* Formatting Toolbar */}
            <div className="formatting-toolbar">
              <button type="button" className="fmt-btn" onClick={() => insertFormatting('**', '**')} title="Bold"><b>B</b></button>
              <button type="button" className="fmt-btn" onClick={() => insertFormatting('*', '*')} title="Italic"><i>I</i></button>
              <button type="button" className="fmt-btn" onClick={() => insertFormatting('~~', '~~')} title="Spoiler">S</button>
              <button type="button" className="fmt-btn" onClick={() => insertFormatting('`', '`')} title="Code">&lt;/&gt;</button>
              <button type="button" className="fmt-btn" onClick={() => insertFormatting('>', '')} title="Greentext">&gt;</button>
            </div>

            <div className="formatting-help">
              <details>
                <summary className="formatting-help-toggle">Formatting help</summary>
                <div className="formatting-help-content">
                  <code>&gt;greentext</code> — quote text<br/>
                  <code>**bold**</code> — <strong>bold text</strong><br/>
                  <code>*italic*</code> — <em>italic text</em><br/>
                  <code>~~spoiler~~</code> — spoiler text<br/>
                  <code>`code`</code> — inline code<br/>
                  <code>&gt;&gt;1234</code> — reply link
                </div>
              </details>
            </div>

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
