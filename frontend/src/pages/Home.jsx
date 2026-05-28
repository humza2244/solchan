import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { API_BASE_URL } from '../services/api.js'

const CopyCA = ({ address }) => {
  const [copied, setCopied] = useState(false)
  const handleCopy = (e) => {
    e.preventDefault()
    e.stopPropagation()
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button className={`copy-ca-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
      {copied ? 'OK' : 'Copy'}
    </button>
  )
}

const CommunityImage = ({ community, size = 'card' }) => {
  const [imgError, setImgError] = useState(false)

  if (community.imageUrl && !imgError) {
    const isKoth = size === 'koth'
    return (
      <img
        src={community.imageUrl}
        alt={community.coinName}
        className={isKoth ? 'koth-image-horizontal' : 'community-card-img'}
        onError={() => setImgError(true)}
      />
    )
  }

  const className = size === 'koth' ? 'koth-placeholder-img' : 'community-placeholder-img'
  return <div className={className}>{community.ticker?.slice(0, 4)}</div>
}

const timeAgo = (dateStr) => {
  if (!dateStr) return null
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now - date) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return date.toLocaleDateString()
}

const CommunityCard = ({ community }) => (
  <Link key={community.id} to={`/community/${community.id}`} className="community-link">
    <div className="community-item">
      <CommunityImage community={community} />
      <div className="community-name">{community.ticker}</div>
      <div className="community-coin-name">{community.coinName}</div>
      <div className="community-ca">
        {community.contractAddress
          ? <>{community.contractAddress.slice(0, 10)}...{community.contractAddress.slice(-6)}<CopyCA address={community.contractAddress} /></>
          : <span style={{ color: '#aaa', fontStyle: 'italic' }}>No CA yet</span>
        }
      </div>
      <div className="community-stats">
        {community.messageCount} msgs {'•'} {community.uniqueUsersCount} users
      </div>
      {community.lastMessageAt && (
        <div className="community-last-active">
          active {timeAgo(community.lastMessageAt)}
        </div>
      )}
    </div>
  </Link>
)

const Home = () => {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [koth, setKoth] = useState(null)
  const [popularCommunities, setPopularCommunities] = useState([])
  const [newCommunities, setNewCommunities] = useState([])
  const [stats, setStats] = useState({ communities: 0, threads: 0, replies: 0 })
  const [loading, setLoading] = useState(true)
  const [feed, setFeed] = useState([])
  const [feedLoading, setFeedLoading] = useState(false)
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('homeTab') || 'feed')
  const [showWelcomeModal, setShowWelcomeModal] = useState(() => {
    return !localStorage.getItem('hasSeenWelcome')
  })

  // Bookmarks + watched from localStorage (reactive)
  const [bookmarks, setBookmarks] = useState(() =>
    JSON.parse(localStorage.getItem('bookmarkedCommunities') || '[]')
  )
  const [watchedThreads, setWatchedThreads] = useState(() =>
    JSON.parse(localStorage.getItem('watchedThreads') || '[]')
  )

  const handleCloseModal = () => {
    setShowWelcomeModal(false)
    localStorage.setItem('hasSeenWelcome', 'true')
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    setSearchQuery('')
  }

  const switchTab = (tab) => {
    setActiveTab(tab)
    localStorage.setItem('homeTab', tab)
    // Refresh local storage data when switching to these tabs
    if (tab === 'bookmarks') {
      setBookmarks(JSON.parse(localStorage.getItem('bookmarkedCommunities') || '[]'))
    }
    if (tab === 'watched') {
      setWatchedThreads(JSON.parse(localStorage.getItem('watchedThreads') || '[]'))
    }
    if (tab === 'feed' && feed.length === 0) {
      loadFeed()
    }
  }

  const loadFeed = async () => {
    setFeedLoading(true)
    try {
      const res = await axios.get(`${API_BASE_URL}/feed`, { params: { limit: 30 } })
      setFeed(res.data)
    } catch (err) {
      console.error('Feed error:', err)
    } finally {
      setFeedLoading(false)
    }
  }

  const removeBookmark = (id) => {
    const updated = bookmarks.filter(b => b.id !== id)
    localStorage.setItem('bookmarkedCommunities', JSON.stringify(updated))
    setBookmarks(updated)
  }

  const removeWatch = (id) => {
    const updated = watchedThreads.filter(w => w.id !== id)
    localStorage.setItem('watchedThreads', JSON.stringify(updated))
    setWatchedThreads(updated)
  }

  useEffect(() => {
    const loadCommunities = async () => {
      await Promise.all([
        axios.get(`${API_BASE_URL}/communities/koth`)
          .then(res => setKoth(res.data))
          .catch(() => setKoth(null)),

        axios.get(`${API_BASE_URL}/communities`, {
          params: { popular: true, limit: 12 }
        })
          .then(res => setPopularCommunities(res.data))
          .catch(() => setPopularCommunities([])),

        axios.get(`${API_BASE_URL}/communities`, {
          params: { recent: true, limit: 12 }
        })
          .then(res => setNewCommunities(res.data))
          .catch(() => setNewCommunities([])),

        axios.get(`${API_BASE_URL}/stats`)
          .then(res => setStats(res.data))
          .catch(() => {}),
      ])
      setLoading(false)
    }
    loadCommunities()
    // Load feed on mount if feed tab is active
    if (localStorage.getItem('homeTab') === 'feed' || !localStorage.getItem('homeTab')) {
      axios.get(`${API_BASE_URL}/feed`, { params: { limit: 30 } })
        .then(res => setFeed(res.data))
        .catch(() => {})
    }
  }, [])

  useEffect(() => {
    document.title = 'Meme Communities'
  }, [])

  const tabs = [
    { id: 'feed', label: 'Feed' },
    { id: 'trending', label: 'Trending' },
    { id: 'new', label: 'New' },
    { id: 'bookmarks', label: `Bookmarks${bookmarks.length > 0 ? ` (${bookmarks.length})` : ''}` },
    { id: 'watched', label: `Watched${watchedThreads.length > 0 ? ` (${watchedThreads.length})` : ''}` },
  ]

  return (
    <div className="home">
      {/* Welcome Modal */}
      {showWelcomeModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content welcome-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCloseModal}>X</button>
            <h2>Welcome to Meme Communities</h2>
            <p className="welcome-subtitle">
              The premium crypto community platform. Discuss any token in real-time.
            </p>
            <div className="welcome-steps">
              <div className="welcome-step">
                <span className="step-number">1</span>
                <div>
                  <strong>No sign up needed</strong>
                  <p>Just pick a community and start posting. You're automatically "Anonymous" -- no email, no wallet, nothing.</p>
                </div>
              </div>
              <div className="welcome-step">
                <span className="step-number">2</span>
                <div>
                  <strong>Find your coin</strong>
                  <p>Search by ticker (PEPE, DOGE, etc.) or paste a contract address. If it doesn't exist yet, create it!</p>
                </div>
              </div>
              <div className="welcome-step">
                <span className="step-number">3</span>
                <div>
                  <strong>Post threads &amp; reply</strong>
                  <p>Start new threads with images, reply to others, use greentext (&gt;like this), and format with **bold** or *italic*.</p>
                </div>
              </div>
            </div>
            <button className="welcome-got-it" onClick={handleCloseModal}>
              Got it, let me in
            </button>
          </div>
        </div>
      )}

      {/* Logo */}
      <div className="home-logo">
        <h1>Meme Communities</h1>
      </div>

      {/* Live Stats */}
      <div className="stats-ticker">
        <div className="stat-item">
          <span className="stat-value">{stats.communities}</span> communities
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.threads}</span> threads
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.replies}</span> replies
        </div>
      </div>

      {/* About */}
      <div className="what-is-cointalk">
        <div className="what-is-header">
          <h2>What is Meme Communities?</h2>
        </div>
        <div className="what-is-content">
          <p>
            A premium community platform for crypto tokens. Every coin gets its own space
            to discuss, share alpha, and vibe. <strong>No sign up required</strong> — just
            search for a token, join the community, and start posting.
          </p>
          <div className="feature-pills">
            <span className="feature-pill">Real-time chat</span>
            <span className="feature-pill">Image sharing</span>
            <span className="feature-pill">No registration</span>
            <span className="feature-pill">Thread pinning</span>
            <span className="feature-pill">Moderation tools</span>
          </div>
        </div>
      </div>

      {/* KOTH */}
      {koth && (
        <div className="koth-wrapper">
          <h3 className="koth-title">King of the Hill</h3>
          <Link to={`/community/${koth.id}`} className="koth-card-horizontal">
            <CommunityImage community={koth} size="koth" />
            <div className="koth-info-horizontal">
              <div className="koth-name-horizontal">{koth.ticker}</div>
              <div className="koth-coin-horizontal">{koth.coinName}</div>
              <div className="koth-stats-horizontal">
                {koth.messageCount || 0} msgs
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Search */}
      <div className="search-floating">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ticker or CA..."
            className="search-input-floating"
          />
          <button type="submit" className="search-btn-floating">
            Search
          </button>
        </form>
      </div>

      {/* Tab Navigation */}
      <div className="home-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`home-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => switchTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <span className="loading-text">Loading communities...</span>
          <span className="loading-hint">First load may take a moment while the server wakes up</span>
        </div>
      ) : (
        <>
          {/* Trending Tab */}
          {activeTab === 'trending' && (
            <>
              {popularCommunities.length > 0 ? (
                <div className="recent-communities">
                  <p className="communities-subtitle">Most active in the past 24 hours</p>
                  <div className="communities-list">
                    {popularCommunities.map(c => <CommunityCard key={c.id} community={c} />)}
                  </div>
                </div>
              ) : (
                <div className="empty-home-state">
                  
                  <h3>No communities yet</h3>
                  <p>Be the first to create a community for your favorite token.</p>
                  <Link to="/create-community" className="empty-state-cta">Create the First Community</Link>
                </div>
              )}
            </>
          )}

          {/* New Tab */}
          {activeTab === 'new' && (
            <>
              {newCommunities.length > 0 ? (
                <div className="recent-communities">
                  <p className="communities-subtitle">Recently created communities</p>
                  <div className="communities-list">
                    {newCommunities.map(c => <CommunityCard key={c.id} community={c} />)}
                  </div>
                </div>
              ) : (
                <div className="empty-home-state">
                  
                  <h3>No new communities</h3>
                  <p>Check back soon or create one!</p>
                  <Link to="/create-community" className="empty-state-cta">Create Community</Link>
                </div>
              )}
            </>
          )}

          {/* Bookmarks Tab */}
          {activeTab === 'bookmarks' && (
            <div className="tab-content-panel">
              {bookmarks.length === 0 ? (
                <div className="empty-tab-state">
                  <h3>No bookmarks yet</h3>
                  <p>Visit a community and click "Bookmark" to save it here for quick access.</p>
                </div>
              ) : (
                <>
                  <p className="communities-subtitle">Your saved communities</p>
                  <div className="bookmarks-grid">
                    {bookmarks.map(b => (
                      <div key={b.id} className="bookmark-card">
                        <Link to={`/community/${b.id}`} className="bookmark-card-link">
                          {b.imageUrl ? (
                            <img src={b.imageUrl} alt={b.ticker} className="bookmark-card-img" onError={e => e.target.style.display='none'} />
                          ) : (
                            <div className="bookmark-card-placeholder">{b.ticker?.slice(0, 3)}</div>
                          )}
                          <div className="bookmark-card-ticker">{b.ticker}</div>
                          <div className="bookmark-card-name">{b.coinName}</div>
                        </Link>
                        <button
                          className="bookmark-remove-btn"
                          onClick={() => removeBookmark(b.id)}
                          title="Remove bookmark"
                        >x</button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Feed Tab */}
          {activeTab === 'feed' && (
            <div className="tab-content-panel">
              {feedLoading ? (
                <div className="loading-container">
                  <div className="spinner"></div>
                  <span className="loading-text">Loading feed...</span>
                </div>
              ) : feed.length === 0 ? (
                <div className="empty-tab-state">
                  <h3>No posts yet</h3>
                  <p>Be the first to start a thread in a community.</p>
                </div>
              ) : (
                <div className="feed-list">
                  {feed.map(post => (
                    <Link key={post.id} to={`/thread/${post.id}`} className="feed-item">
                      <div className="feed-item-header">
                        <span className="feed-community-badge">
                          {post.community?.ticker || '???'}
                        </span>
                        <span className="feed-author">{post.author || 'Anonymous'}</span>
                        <span className="feed-time">{timeAgo(post.lastReplyAt || post.createdAt)}</span>
                      </div>
                      <div className="feed-item-subject">{post.subject}</div>
                      {post.content && (
                        <div className="feed-item-preview">
                          {post.content.length > 180 ? post.content.slice(0, 180) + '...' : post.content}
                        </div>
                      )}
                      <div className="feed-item-stats">
                        <span>{post.replyCount || 0} replies</span>
                        <span>{post.likeCount || 0} likes</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Watched Threads Tab */}
          {activeTab === 'watched' && (
            <div className="tab-content-panel">
              {watchedThreads.length === 0 ? (
                <div className="empty-tab-state">
                  <h3>No watched threads</h3>
                  <p>Open any thread and click "Watch" to track replies here.</p>
                </div>
              ) : (
                <>
                  <p className="communities-subtitle">Threads you're following</p>
                  <div className="watched-threads-panel">
                    {watchedThreads.map(w => (
                      <div key={w.id} className="watched-thread-row">
                        <Link to={`/thread/${w.id}`} className="watched-thread-title">
                          {w.subject || 'Untitled thread'}
                        </Link>
                        <span className="watched-thread-replies">{w.lastReplyCount || 0} replies</span>
                        <button
                          className="watched-thread-remove"
                          onClick={() => removeWatch(w.id)}
                          title="Stop watching"
                        >x</button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Home
