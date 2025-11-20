import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

const Home = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [popularCommunities, setPopularCommunities] = useState([])
  const [newCommunities, setNewCommunities] = useState([])
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [showWelcomeModal, setShowWelcomeModal] = useState(true)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    
    setSearching(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/communities/search`, {
        params: { q: searchQuery.trim() }
      })
      setSearchResults(response.data)
    } catch (error) {
      console.error('Error searching:', error)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
  }

  // Load popular and new communities on mount
  useEffect(() => {
    const loadCommunities = async () => {
      try {
        setLoading(true)
        
        // Fetch popular communities (top 3)
        const popularResponse = await axios.get(`${API_BASE_URL}/communities`, {
          params: { popular: true, limit: 3 }
        })
        setPopularCommunities(popularResponse.data)
        
        // Fetch new communities (12 newest) - explicitly use recent query
        const newResponse = await axios.get(`${API_BASE_URL}/communities`, {
          params: { recent: true, limit: 12 }
        })
        setNewCommunities(newResponse.data)
      } catch (error) {
        console.error('Error loading communities:', error)
      } finally {
        setLoading(false)
      }
    }
    loadCommunities()
  }, [])

  return (
    <div className="home">
      {/* Welcome Modal */}
      {showWelcomeModal && (
        <div className="modal-overlay" onClick={() => setShowWelcomeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowWelcomeModal(false)}>
              ✕
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

      {/* KOTH - King of the Hill (Top community in last 15 min) */}
      {popularCommunities.length > 0 && (
        <div className="koth-section">
          <h3>👑 KOTH - King of the Hill</h3>
          <p className="koth-subtitle">Most active in the last 15 minutes</p>
          <Link to={`/community/${popularCommunities[0].id}`} className="koth-card">
            {popularCommunities[0].imageUrl && (
              <img 
                src={popularCommunities[0].imageUrl} 
                alt={popularCommunities[0].coinName}
                className="koth-image"
              />
            )}
            <div className="koth-info">
              <div className="koth-name">{popularCommunities[0].ticker}</div>
              <div className="koth-coin">{popularCommunities[0].coinName}</div>
              <div className="koth-stats">
                {popularCommunities[0].recentMessageCount || 0} messages
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Create Community Button */}
      <div className="create-community-container">
        <Link to="/create-community" className="create-community-btn">
          [Create a Community]
        </Link>
      </div>

      {/* Search */}
      <div className="search-box">
        <h2>Search Communities</h2>
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ticker or contract address..."
            className="ca-input"
          />
          <button type="submit" className="search-btn" disabled={searching}>
            {searching ? 'Searching...' : 'Search'}
          </button>
          {searchResults.length > 0 && (
            <button 
              type="button" 
              onClick={clearSearch} 
              className="search-btn"
              style={{ background: '#666' }}
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Search Results OR Popular + New Communities */}
      {loading ? (
        <div className="recent-communities">
          <h2>Loading...</h2>
          <p>Please wait...</p>
        </div>
      ) : searchResults.length > 0 ? (
        // Show search results
        <div className="recent-communities">
          <h2>Search Results</h2>
          <p className="communities-subtitle">Found {searchResults.length} communities</p>
          <div className="communities-list">
            {searchResults.map((community) => (
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
        <>
          {/* Trending Communities (Top 3) */}
          {popularCommunities.length > 0 && (
            <div className="recent-communities">
              <h2>🔥 Trending Communities</h2>
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
              <h2>New Communities</h2>
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
