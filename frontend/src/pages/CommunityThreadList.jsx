import { useParams, Link } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { connectSocket } from '../services/socket.js'
import { API_BASE_URL } from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import DOMPurify from 'dompurify'
import ModPanel from '../components/ModPanel.jsx'
import ReportModal from '../components/ReportModal.jsx'

const CopyCA = ({ address }) => {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button className={`copy-ca-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
      {copied ? '✓ Copied' : 'Copy CA'}
    </button>
  )
}

const CommunityImage = ({ community }) => {
  if (community.imageUrl) {
    return <img src={community.imageUrl} alt={community.coinName} style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover' }} />
  }
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 4,
      background: 'linear-gradient(135deg, #0F0C5D, #AF0A0F)',
      color: '#fff', fontWeight: 800, fontSize: 12,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {community.ticker?.slice(0, 3)}
    </div>
  )
}

// Render content with greentext and >>postNumber refs
const renderContent = (content) => {
  if (!content) return null
  const clean = DOMPurify.sanitize(content, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
  const lines = clean.split('\n')

  const renderFormattedText = (text, keyBase) => {
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
        return (
          <span key={`${lineIndex}-${partIndex}`} className="reply-link">
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

const CommunityThreadList = () => {
  const { id } = useParams()
  const { user } = useAuth()
  const [community, setCommunity] = useState(null)
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [liveUsers, setLiveUsers] = useState(0)
  const [lightboxImg, setLightboxImg] = useState(null)
  const [reportTarget, setReportTarget] = useState(null)
  const [members, setMembers] = useState([])
  const [showMembers, setShowMembers] = useState(false)
  const [sortMode, setSortMode] = useState('bump')
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('threadViewMode') || 'list')
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [hasJoined, setHasJoined] = useState(false)
  const [joinLoading, setJoinLoading] = useState(false)

  // Check bookmark status
  useEffect(() => {
    if (id) {
      const bookmarks = JSON.parse(localStorage.getItem('bookmarkedCommunities') || '[]')
      setIsBookmarked(bookmarks.some(b => b.id === id))
    }
  }, [id])

  const toggleBookmark = () => {
    const bookmarks = JSON.parse(localStorage.getItem('bookmarkedCommunities') || '[]')
    if (isBookmarked) {
      const updated = bookmarks.filter(b => b.id !== id)
      localStorage.setItem('bookmarkedCommunities', JSON.stringify(updated))
      setIsBookmarked(false)
    } else {
      bookmarks.push({
        id,
        ticker: community.ticker,
        coinName: community.coinName,
        imageUrl: community.imageUrl || null
      })
      localStorage.setItem('bookmarkedCommunities', JSON.stringify(bookmarks))
      setIsBookmarked(true)
    }
  }

  const handleViewModeChange = (mode) => {
    setViewMode(mode)
    localStorage.setItem('threadViewMode', mode)
  }

  const isMod = user && community && (
    community.creatorId === user.uid ||
    (community.moderators || []).includes(user.uid)
  )

  const loadData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true)
      
      const [communityResponse, threadsResponse, membersResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/communities/${id}`),
        axios.get(`${API_BASE_URL}/communities/${id}/threads?preview=true&limit=50`),
        axios.get(`${API_BASE_URL}/communities/${id}/members`).catch(() => ({ data: [] })),
      ])
      
      setCommunity(communityResponse.data.community)
      setThreads(threadsResponse.data)
      setMembers(membersResponse.data)
    } catch (error) {
      console.error('Error loading community:', error)
    } finally {
      setLoading(false)
    }
  }, [id])

  // Initial load
  useEffect(() => {
    if (id) loadData(true)
  }, [id, loadData])

  // Socket for live user count
  useEffect(() => {
    const socket = connectSocket()
    if (socket && id) {
      socket.emit('join-community', id)
      socket.on('user-count', (count) => setLiveUsers(count))
      return () => {
        socket.emit('leave-community', id)
        socket.off('user-count')
      }
    }
  }, [id])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => loadData(false), 30000)
    return () => clearInterval(interval)
  }, [id, loadData])

  const handleDeleteThread = async (threadId) => {
    if (!confirm('Delete this thread and all its replies?')) return
    try {
      await axios.delete(`${API_BASE_URL}/mod/thread/${threadId}?communityId=${id}`)
      setThreads(prev => prev.filter(t => t.id !== threadId))
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete thread')
    }
  }

  if (loading) {
    return (
      <div className="thread-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <span className="loading-text">Loading community...</span>
        </div>
      </div>
    )
  }

  if (!community) {
    return (
      <div className="thread-page">
        <div className="no-threads">
          <p>Community not found</p>
          <Link to="/" className="back-link">← Back to Home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="thread-page">
      {/* Report Modal */}
      {reportTarget && (
        <ReportModal
          contentType={reportTarget.type}
          contentId={reportTarget.id}
          communityId={id}
          onClose={() => setReportTarget(null)}
        />
      )}

      {/* Lightbox */}
      {lightboxImg && (
        <div className="lightbox-overlay" onClick={() => setLightboxImg(null)}>
          <button className="lightbox-close" onClick={() => setLightboxImg(null)}>✕</button>
          <img src={lightboxImg} alt="Full size" />
        </div>
      )}

      <div className="thread-header-nav">
        <Link to="/" className="back-link">← Back to Home</Link>
        <div className="thread-title">
          <CommunityImage community={community} />
          <span style={{ marginLeft: 10 }}>{community.ticker} — {community.coinName}</span>
        </div>
        <div className="ca-row">
          <span className="thread-ca">{community.contractAddress}</span>
          <CopyCA address={community.contractAddress} />
        </div>
        {community.description && <p style={{ fontSize: 13, color: '#4a4a6a', marginTop: 6 }}>{community.description}</p>}
        
        <div className="community-header-stats">
          <span>{community.messageCount || 0} messages</span>
          <span>{threads.length} threads</span>
          {liveUsers > 0 && (
            <span className="live-users">{liveUsers} browsing</span>
          )}
        </div>
        
        <div className="community-actions-row">
          <Link to={`/community/${id}/new-thread`} className="create-thread-btn">
            Start a New Thread
          </Link>
          <button
            className={`join-btn ${hasJoined ? 'joined' : ''}`}
            onClick={async () => {
              if (hasJoined) return
              setJoinLoading(true)
              try {
                await axios.post(`${API_BASE_URL}/communities/${id}/join`, { author: 'Anonymous' })
                setHasJoined(true)
              } catch (err) {
                console.error('Failed to join:', err)
              } finally {
                setJoinLoading(false)
              }
            }}
            disabled={hasJoined || joinLoading}
          >
            {hasJoined ? '✓ Joined' : joinLoading ? 'Joining...' : '👋 Join Community'}
          </button>
          <button
            className={`bookmark-btn ${isBookmarked ? 'bookmarked' : ''}`}
            onClick={toggleBookmark}
          >
            {isBookmarked ? '★ Bookmarked' : '☆ Bookmark'}
          </button>
        </div>
      </div>

      {/* Mod Panel — only visible to creator/mods */}
      <ModPanel
        communityId={id}
        community={community}
        onContentDeleted={() => loadData(false)}
      />

      {/* Community Rules Panel */}
      {(community.rules || isMod) && (
        <details className="community-rules-panel" style={{ marginTop: 12 }}>
          <summary className="rules-toggle">📋 Community Rules</summary>
          <div className="rules-content">
            {community.rules ? (
              community.rules.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))
            ) : (
              <p style={{ color: '#999', fontStyle: 'italic' }}>No rules set yet.</p>
            )}
            {isMod && (
              <div className="rules-editor" style={{ marginTop: 10 }}>
                <textarea
                  id="rules-textarea"
                  defaultValue={community.rules || ''}
                  rows={4}
                  style={{ width: '100%', padding: 8, fontFamily: 'inherit', fontSize: 12, borderRadius: 3, border: '1px solid #b7c5d9' }}
                  placeholder="Enter community rules (one per line)..."
                />
                <button
                  className="thread-action-btn"
                  style={{ marginTop: 6 }}
                  onClick={async () => {
                    const textarea = document.getElementById('rules-textarea')
                    try {
                      const res = await axios.put(`${API_BASE_URL}/mod/${id}/rules`, { rules: textarea.value })
                      setCommunity(prev => ({ ...prev, rules: res.data.rules }))
                      alert('Rules updated!')
                    } catch (err) {
                      alert(err.response?.data?.error || 'Failed to update rules')
                    }
                  }}
                >Save Rules</button>
              </div>
            )}
          </div>
        </details>
      )}

      {/* Members Panel */}
      <div className="members-panel-wrapper">
        <button
          className="members-panel-toggle"
          onClick={() => setShowMembers(!showMembers)}
        >
          👥 Members ({members.length})
        </button>
        {showMembers && (
          <div className="members-panel">
            {members.length === 0 ? (
              <p className="members-empty">No members yet. Be the first to post!</p>
            ) : (
              <div className="members-grid">
                {members.map((member) => (
                  <div key={member.id} className="member-card">
                    <div className="member-name">
                      {member.userId ? '🔑 ' : ''}{member.author}
                    </div>
                    <div className="member-stats">
                      <span>{member.postCount} {member.postCount === 1 ? 'post' : 'posts'}</span>
                      <span className="member-joined">
                        joined {new Date(member.joinedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {threads.length === 0 ? (
        <div className="no-threads">
          <p>No threads yet. Be the first to start one!</p>
          <Link to={`/community/${id}/new-thread`} className="create-thread-btn">
            Start a New Thread
          </Link>
        </div>
      ) : (
        <>
          <div className="sort-controls">
            <span className="sort-label">Sort:</span>
            {[{key:'bump',label:'Bump Order'},{key:'newest',label:'Newest'},{key:'replies',label:'Most Replies'},{key:'oldest',label:'Oldest'}].map(s => (
              <button
                key={s.key}
                className={`sort-btn ${sortMode === s.key ? 'active' : ''}`}
                onClick={() => setSortMode(s.key)}
              >{s.label}</button>
            ))}
            <div className="view-toggle">
              <button
                className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => handleViewModeChange('list')}
                title="List View"
              >☰</button>
              <button
                className={`view-toggle-btn ${viewMode === 'catalog' ? 'active' : ''}`}
                onClick={() => handleViewModeChange('catalog')}
                title="Catalog View"
              >▦</button>
            </div>
          </div>

          {viewMode === 'catalog' ? (
            <div className="catalog-grid">
              {[...threads]
                .sort((a, b) => {
                  if (a.isPinned && !b.isPinned) return -1
                  if (!a.isPinned && b.isPinned) return 1
                  if (sortMode === 'newest') return new Date(b.createdAt) - new Date(a.createdAt)
                  if (sortMode === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt)
                  if (sortMode === 'replies') return (b.replyCount || 0) - (a.replyCount || 0)
                  return new Date(b.lastBumpAt || b.createdAt) - new Date(a.lastBumpAt || a.createdAt)
                })
                .map((thread) => (
                  <Link key={thread.id} to={`/thread/${thread.id}`} className="catalog-card">
                    {thread.isPinned && <span className="catalog-card-pin">📌</span>}
                    {thread.imageUrl ? (
                      <img src={thread.imageUrl} className="catalog-card-img" alt="" />
                    ) : (
                      <div className="catalog-card-noimg">No Image</div>
                    )}
                    <div className="catalog-card-body">
                      <div className="catalog-card-subject">{thread.subject || 'No Subject'}</div>
                      <div className="catalog-card-content">{thread.content}</div>
                    </div>
                    <div className="catalog-card-footer">
                      <span>R: {thread.replyCount || 0}</span>
                      <span>{thread.author}</span>
                    </div>
                  </Link>
                ))}
            </div>
          ) : (
          <div className="threads-list">
          {[...threads]
            .sort((a, b) => {
              // Pinned always first
              if (a.isPinned && !b.isPinned) return -1
              if (!a.isPinned && b.isPinned) return 1
              if (sortMode === 'newest') return new Date(b.createdAt) - new Date(a.createdAt)
              if (sortMode === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt)
              if (sortMode === 'replies') return (b.replyCount || 0) - (a.replyCount || 0)
              return new Date(b.lastBumpAt || b.createdAt) - new Date(a.lastBumpAt || a.createdAt)
            })
            .map((thread) => (
            <div key={thread.id} className="thread-preview">
              <div className="op-post">
                <div className="post-header">
                  <span className="post-subject">
                    {thread.isPinned && <span className="pin-indicator" title="Pinned">📌 </span>}
                    <Link to={`/thread/${thread.id}`} className="thread-subject-link">{thread.subject}</Link>
                  </span>
                  <Link to={`/user/${encodeURIComponent(thread.author)}`} className="post-name">{thread.author}</Link>
                  <span className="post-date">
                    {new Date(thread.createdAt).toLocaleString()}
                  </span>
                  <span className="post-number">
                    No. {thread.postNumber}
                  </span>
                  <span className="post-actions">
                    <button
                      className="report-btn"
                      onClick={() => setReportTarget({ type: 'thread', id: thread.id })}
                      title="Report"
                    >
                      🚩
                    </button>
                    {isMod && (
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteThread(thread.id)}
                        title="Delete Thread"
                      >
                        🗑
                      </button>
                    )}
                  </span>
                </div>
                {thread.imageUrl && (
                  <div className="op-image">
                    <img 
                      src={thread.imageUrl} 
                      alt="Thread image"
                      onClick={() => setLightboxImg(thread.imageUrl)} 
                    />
                  </div>
                )}
                <div className="op-content">
                  <p>{renderContent(thread.content)}</p>
                </div>
                <div className="thread-stats">
                  <Link to={`/thread/${thread.id}`} className="open-thread-btn">
                    💬 Open Thread
                  </Link>
                  <span className="reply-count-badge">
                    {thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}
                  </span>
                </div>
              </div>

              {thread.recentReplies && thread.recentReplies.length > 0 && (
                <div className="replies-preview">
                  {thread.recentReplies.map((reply) => (
                    <div key={reply.id} className="reply-box">
                      <div className="post-header">
                        <Link to={`/user/${encodeURIComponent(reply.author)}`} className="post-name">{reply.author}</Link>
                        <span className="post-date">
                          {new Date(reply.createdAt).toLocaleString()}
                        </span>
                        <span className="post-number">
                          No. {reply.postNumber}
                        </span>
                      </div>
                      {reply.imageUrl && (
                        <div className="reply-image">
                          <img 
                            src={reply.imageUrl} 
                            alt="Reply image"
                            onClick={() => setLightboxImg(reply.imageUrl)}
                          />
                        </div>
                      )}
                      <div className="reply-content">
                        <p>{renderContent(reply.content)}</p>
                      </div>
                    </div>
                  ))}
                  {thread.replyCount > thread.recentReplies.length && (
                    <Link to={`/thread/${thread.id}`} className="view-all-link">
                      View all {thread.replyCount} replies →
                    </Link>
                  )}
                </div>
              )}
              <hr className="thread-divider" />
            </div>
          ))}
        </div>
          )}
        </>
      )}
    </div>
  )
}

export default CommunityThreadList
