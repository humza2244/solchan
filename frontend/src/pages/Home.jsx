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
      {copied ? '✓' : 'Copy'}
    </button>
  )
}

const CommunityImage = ({ community, size = 'card' }) => {
  const [imgError, setImgError] = useState(false)
  const className = size === 'koth' ? 'koth-placeholder-img' : 'community-placeholder-img'
  
  if (community.imageUrl && !imgError) {
    return <img src={community.imageUrl} alt={community.coinName} onError={() => setImgError(true)} />
  }
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

const Home = () => {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [koth, setKoth] = useState(null)
  const [popularCommunities, setPopularCommunities] = useState([])
  const [newCommunities, setNewCommunities] = useState([])
  const [stats, setStats] = useState({ communities: 0, threads: 0, replies: 0 })
  const [loading, setLoading] = useState(true)
  const [showWelcomeModal, setShowWelcomeModal] = useState(() => {
    return !localStorage.getItem('hasSeenWelcome')
  })

  const handleCloseModal = () => {
    setShowWelcomeModal(false)
    localStorage.setItem('hasSeenWelcome', 'true')
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
  }

  useEffect(() => {
    const loadCommunities = async () => {
      setLoading(true)
      
      await Promise.allSettled([
        axios.get(`${API_BASE_URL}/communities/koth`)
          .then(res => setKoth(res.data))
          .catch(() => setKoth(null)),
        
        axios.get(`${API_BASE_URL}/communities`, {
          params: { popular: true, limit: 3 }
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
  }, [])

  useEffect(() => {
    document.title = 'solchan — memecoin community boards'
  }, [])

  return (
    <div className="home">
      {/* Welcome Modal */}
      {showWelcomeModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content welcome-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCloseModal}>
              ✕
            </button>
            <h2>👋 Welcome to solchan</h2>
            <p className="welcome-subtitle">
              The anonymous imageboard for memecoin communities.
            </p>
            <div className="welcome-steps">
              <div className="welcome-step">
                <span className="step-number">1</span>
                <div>
                  <strong>No sign up needed</strong>
                  <p>Just pick a community and start posting. You're automatically "Anonymous" — no email, no wallet, nothing.</p>
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
                  <strong>Post threads & reply</strong>
                  <p>Start new threads with images, reply to others, use greentext (&gt;like this), and format with **bold** or *italic*.</p>
                </div>
              </div>
            </div>
            <button className="welcome-got-it" onClick={handleCloseModal}>
              Got it, let me in →
            </button>
          </div>
        </div>
      )}

      {/* Logo */}
      <div className="home-logo">
        <h1>solchan</h1>
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

      {/* Bookmarked Communities */}
      {(() => {
        const bookmarks = JSON.parse(localStorage.getItem('bookmarkedCommunities') || '[]')
        if (bookmarks.length === 0) return null
        return (
          <div className="bookmarked-section">
            <div className="section-header">
              <h2>★ Your Bookmarks</h2>
            </div>
            <div className="bookmarked-communities-list">
              {bookmarks.map((b) => (
                <span key={b.id} className="bookmarked-chip">
                  <Link to={`/community/${b.id}`} style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: 'inherit' }}>
                    {b.imageUrl ? (
                      <img src={b.imageUrl} alt={b.ticker} />
                    ) : (
                      <span className="chip-placeholder">{b.ticker?.slice(0, 3)}</span>
                    )}
                    {b.ticker}
                  </Link>
                  <button
                    className="remove-bookmark"
                    onClick={(e) => {
                      e.preventDefault()
                      const updated = bookmarks.filter(x => x.id !== b.id)
                      localStorage.setItem('bookmarkedCommunities', JSON.stringify(updated))
                      window.location.reload()
                    }}
                    title="Remove bookmark"
                  >×</button>
                </span>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Watched Threads */}
      {(() => {
        const watched = JSON.parse(localStorage.getItem('watchedThreads') || '[]')
        if (watched.length === 0) return null
        return (
          <div className="watched-section">
            <div className="section-header">
              <h2>👁 Watched Threads</h2>
            </div>
            <div className="watched-threads-list">
              {watched.map((w) => (
                <div key={w.id} className="watched-thread-item">
                  <Link to={`/thread/${w.id}`} className="watched-thread-subject" style={{ textDecoration: 'none', color: 'inherit' }}>
                    {w.subject}
                  </Link>
                  <span className="watched-thread-meta">
                    {w.lastReplyCount} replies
                  </span>
                  <button
                    className="remove-watch"
                    onClick={() => {
                      const updated = watched.filter(x => x.id !== w.id)
                      localStorage.setItem('watchedThreads', JSON.stringify(updated))
                      window.location.reload()
                    }}
                    title="Stop watching"
                  >×</button>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* What is solchan? */}
      <div className="what-is-solchan">
        <div className="what-is-header">
          <h2>What is solchan?</h2>
        </div>
        <div className="what-is-content">
          <p>
            An anonymous imageboard for memecoin communities — like 4chan but for crypto. 
            Every coin gets its own board. <strong>No sign up required</strong> — just search for a 
            coin, click a community, and start posting.
          </p>
          <div className="feature-pills">
            <span className="feature-pill">🔓 No registration</span>
            <span className="feature-pill">💬 Real-time chat</span>
            <span className="feature-pill">🖼 Image posting</span>
            <span className="feature-pill">🎨 Text formatting</span>
            <span className="feature-pill">🌙 Dark mode</span>
            <span className="feature-pill">📌 Thread pinning</span>
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

      {/* Content */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <span className="loading-text">Loading communities...</span>
          <span className="loading-hint">First load may take a moment while the server wakes up</span>
        </div>
      ) : (
        <>
          {/* Trending Communities */}
          {popularCommunities.length > 0 && (
            <div className="recent-communities">
              <div className="section-header">
                <h2>Trending Communities</h2>
              </div>
              <p className="communities-subtitle">Most active in the past 24 hours</p>
              <div className="communities-list">
                {popularCommunities.map((community) => (
                  <Link
                    key={community.id}
                    to={`/community/${community.id}`}
                    className="community-link"
                  >
                    <div className="community-item">
                      <CommunityImage community={community} />
                      <div className="community-name">{community.ticker}</div>
                      <div className="community-coin-name">{community.coinName}</div>
                      <div className="community-ca">
                        {community.contractAddress.slice(0, 10)}...{community.contractAddress.slice(-6)}
                        <CopyCA address={community.contractAddress} />
                      </div>
                      <div className="community-stats">
                        {community.messageCount} msgs • {community.uniqueUsersCount} users
                      </div>
                      {community.lastMessageAt && (
                        <div className="community-last-active">
                          active {timeAgo(community.lastMessageAt)}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* New Communities */}
          {newCommunities.length > 0 ? (
            <div className="recent-communities">
              <div className="section-header">
                <h2>New Communities</h2>
              </div>
              <p className="communities-subtitle">Recently created</p>
              <div className="communities-list">
                {newCommunities.map((community) => (
                  <Link
                    key={community.id}
                    to={`/community/${community.id}`}
                    className="community-link"
                  >
                    <div className="community-item">
                      <CommunityImage community={community} />
                      <div className="community-name">{community.ticker}</div>
                      <div className="community-coin-name">{community.coinName}</div>
                      <div className="community-ca">
                        {community.contractAddress.slice(0, 10)}...{community.contractAddress.slice(-6)}
                        <CopyCA address={community.contractAddress} />
                      </div>
                      <div className="community-stats">
                        {community.messageCount} msgs • {community.uniqueUsersCount} users
                      </div>
                      {community.lastMessageAt && (
                        <div className="community-last-active">
                          active {timeAgo(community.lastMessageAt)}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="recent-communities">
              <div className="section-header">
                <h2>New Communities</h2>
              </div>
              <div className="no-threads">
                <p>No communities yet. Be the first to create one!</p>
                <Link to="/create-community" className="create-thread-btn">
                  Create a Community
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Home
