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
          <div className="search-actions">
            <button type="submit" className="search-btn" disabled={searching}>
              {searching ? 'Searching...' : 'Search'}
            </button>
            {searchResults.length > 0 && (
              <button 
                type="button" 
                onClick={clearSearch} 
                className="search-btn"
                style={{ marginLeft: '8px', background: '#666' }}
              >
                Clear
              </button>
            )}
          </div>
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
                      style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4, marginBottom: 8 }}
                    />
                  )}
                  <div className="community-name">{community.ticker} - {community.coinName}</div>
                  <div className="community-ca">
                    {community.contractAddress.slice(0, 10)}...{community.contractAddress.slice(-6)}
                  </div>
                  {community.description && (
                    <div style={{ fontSize: 11, color: '#666', marginTop: 5 }}>
                      {community.description.slice(0, 100)}{community.description.length > 100 ? '...' : ''}
                    </div>
                  )}
                  <div className="community-stats">
                    {community.messageCount} messages • {community.uniqueUsersCount} users
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Top #1 Community - Highlighted */}
          {popularCommunities.length > 0 && (
            <div className="top-community-highlight">
              <h2>🏆 Most Active Community</h2>
              <Link
                to={`/community/${popularCommunities[0].id}`}
                className="top-community-card"
              >
                {popularCommunities[0].imageUrl && (
                  <img 
                    src={popularCommunities[0].imageUrl} 
                    alt={popularCommunities[0].coinName}
                    className="top-community-image"
                  />
                )}
                <div className="top-community-info">
                  <div className="top-community-name">
                    {popularCommunities[0].ticker} - {popularCommunities[0].coinName}
                  </div>
                  <div className="community-ca">
                    {popularCommunities[0].contractAddress.slice(0, 10)}...{popularCommunities[0].contractAddress.slice(-6)}
                  </div>
                  {popularCommunities[0].description && (
                    <div className="top-community-desc">
                      {popularCommunities[0].description}
                    </div>
                  )}
                  <div className="community-stats" style={{ marginTop: 10 }}>
                    {popularCommunities[0].messageCount} messages • {popularCommunities[0].uniqueUsersCount} users
                    {popularCommunities[0].recentMessageCount && ` • ${popularCommunities[0].recentMessageCount} in 24h`}
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Popular Communities (Top 3) */}
          {popularCommunities.length > 0 && (
            <div className="recent-communities">
              <h2>Popular Communities</h2>
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
                          style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4, marginBottom: 8 }}
                        />
                      )}
                      <div className="community-name">{community.ticker} - {community.coinName}</div>
                      <div className="community-ca">
                        {community.contractAddress.slice(0, 10)}...{community.contractAddress.slice(-6)}
                      </div>
                      {community.description && (
                        <div style={{ fontSize: 11, color: '#666', marginTop: 5 }}>
                          {community.description.slice(0, 100)}{community.description.length > 100 ? '...' : ''}
                        </div>
                      )}
                      <div className="community-stats">
                        {community.messageCount} messages • {community.uniqueUsersCount} users
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
                          style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4, marginBottom: 8 }}
                        />
                      )}
                      <div className="community-name">{community.ticker} - {community.coinName}</div>
                      <div className="community-ca">
                        {community.contractAddress.slice(0, 10)}...{community.contractAddress.slice(-6)}
                      </div>
                      {community.description && (
                        <div style={{ fontSize: 11, color: '#666', marginTop: 5 }}>
                          {community.description.slice(0, 100)}{community.description.length > 100 ? '...' : ''}
                        </div>
                      )}
                      <div className="community-stats">
                        {community.messageCount} messages • {community.uniqueUsersCount} users
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
