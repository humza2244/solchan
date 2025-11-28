import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

const Home = () => {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [koth, setKoth] = useState(null)
  const [popularCommunities, setPopularCommunities] = useState([])
  const [newCommunities, setNewCommunities] = useState([])
  const [loading, setLoading] = useState(false)
  const [showWelcomeModal, setShowWelcomeModal] = useState(() => {
    // Only show modal if user hasn't seen it before
    return !localStorage.getItem('hasSeenWelcome')
  })

  const handleCloseModal = () => {
    setShowWelcomeModal(false)
    localStorage.setItem('hasSeenWelcome', 'true')
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    
    // Navigate to search results page
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
  }

  // Load KOTH, popular and new communities on mount
  useEffect(() => {
    const loadCommunities = async () => {
      setLoading(true)
      
      // Fetch all in parallel, with independent error handling
      await Promise.allSettled([
        // Fetch KOTH (King of the Hill) - one-time achievement
        axios.get(`${API_BASE_URL}/communities/koth`)
          .then(res => setKoth(res.data))
          .catch(err => {
            console.error('Error loading KOTH:', err)
            setKoth(null)
          }),
        
        // Fetch popular communities (top 3)
        axios.get(`${API_BASE_URL}/communities`, {
          params: { popular: true, limit: 3 }
        })
          .then(res => setPopularCommunities(res.data))
          .catch(err => {
            console.error('Error loading popular communities:', err)
            setPopularCommunities([])
          }),
        
        // Fetch new communities (12 newest)
        axios.get(`${API_BASE_URL}/communities`, {
          params: { recent: true, limit: 12 }
        })
          .then(res => setNewCommunities(res.data))
          .catch(err => {
            console.error('Error loading new communities:', err)
            setNewCommunities([])
          })
      ])
      
      setLoading(false)
    }
    loadCommunities()
  }, [])

  return (
    <div className="home">
      {/* Welcome Modal */}
      {showWelcomeModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCloseModal}>
              X
            </button>
            <h2>What is solchan?</h2>
            <p>
              <strong>solchan</strong> is an uncensored memecoin community platform. 
              Create or join communities for any cryptocurrency. Chat live with holders, 
              share alpha, and discuss your favorite memecoins. Pure chaos, zero moderation.
            </p>
          </div>
        </div>
      )}

      {/* Logo */}
      <div className="home-logo">
        <h1>solchan</h1>
      </div>

      {/* What is solchan? - 4chan style */}
      <div className="what-is-solchan">
        <div className="what-is-header">
          <h2>What is solchan?</h2>
        </div>
        <div className="what-is-content">
          <p>
            solchan is a simple image-based bulletin board for memecoin communities. 
            Search for any cryptocurrency by its ticker or contract address to join an existing 
            community or create a new one. Each coin gets its own dedicated board where holders 
            can chat in real-time, share alpha, discuss price movements, and engage in unfiltered 
            discussion about their investments. No registration required - just search for a coin 
            and start posting!
          </p>
        </div>
      </div>

      {/* KOTH - King of the Hill - Horizontal */}
      {koth && (
        <div className="koth-wrapper">
          <h3 className="koth-title">King of the Hill</h3>
          <Link to={`/community/${koth.id}`} className="koth-card-horizontal">
            {koth.imageUrl && (
              <img 
                src={koth.imageUrl} 
                alt={koth.coinName}
                className="koth-image-horizontal"
              />
            )}
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

      {/* Search - Floating */}
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

      {/* Popular + New Communities */}
      {loading ? (
        <div className="recent-communities">
          <h2>Loading...</h2>
          <p>Please wait...</p>
        </div>
      ) : (
        <>
          {/* Trending Communities (Top 3) */}
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
                      {community.imageUrl && (
                        <img 
                          src={community.imageUrl} 
                          alt={community.coinName}
                        />
                      )}
                      <div className="community-name">{community.ticker}</div>
                      <div className="community-coin-name">{community.coinName}</div>
                      <div className="community-ca">
                        {community.contractAddress.slice(0, 10)}...{community.contractAddress.slice(-6)}
                      </div>
                      <div className="community-stats">
                        {community.messageCount} msgs • {community.uniqueUsersCount} users
                        {community.recentMessageCount && ` • ${community.recentMessageCount} in 24h`}
                      </div>
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
                      {community.imageUrl && (
                        <img 
                          src={community.imageUrl} 
                          alt={community.coinName}
                        />
                      )}
                      <div className="community-name">{community.ticker}</div>
                      <div className="community-coin-name">{community.coinName}</div>
                      <div className="community-ca">
                        {community.contractAddress.slice(0, 10)}...{community.contractAddress.slice(-6)}
                      </div>
                      <div className="community-stats">
                        {community.messageCount} msgs • {community.uniqueUsersCount} users
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="recent-communities">
              <h2>New Communities</h2>
              <p>No communities yet. Be the first to create one!</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Home
