import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

const Home = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [popularCommunities, setPopularCommunities] = useState([])
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

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

  // Load popular communities on mount
  useEffect(() => {
    const loadPopularCommunities = async () => {
      try {
        setLoading(true)
        const response = await axios.get(`${API_BASE_URL}/communities`, {
          params: { popular: true, limit: 50 }
        })
        setPopularCommunities(response.data)
      } catch (error) {
        console.error('Error loading popular communities:', error)
      } finally {
        setLoading(false)
      }
    }
    loadPopularCommunities()
  }, [])

  // Show communities (search results or popular)
  const communitiesToShow = searchResults.length > 0 ? searchResults : popularCommunities

  return (
    <div className="home">
      {/* Logo */}
      <div className="home-logo">
        <h1>solchan</h1>
      </div>

      {/* What is solchan? */}
      <div className="info-box">
        <h2>What is solchan?</h2>
        <p>
          <strong>solchan</strong> is an uncensored memecoin community platform. 
          Create or join communities for any cryptocurrency. Chat live with holders, 
          share alpha, and discuss your favorite memecoins. Pure chaos, zero moderation.
        </p>
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
          </div>
        </form>
      </div>

      {/* Communities List */}
      {loading ? (
        <div className="recent-communities">
          <h2>{searchResults.length > 0 ? 'Search Results' : 'Popular Communities'}</h2>
          <p>Loading...</p>
        </div>
      ) : communitiesToShow.length > 0 ? (
        <div className="recent-communities">
          <h2>{searchResults.length > 0 ? 'Search Results' : 'Popular Communities'}</h2>
          <p className="communities-subtitle">
            {searchResults.length > 0 
              ? `Found ${communitiesToShow.length} communities` 
              : 'Most active in the past 24 hours'}
          </p>
          <div className="communities-list">
            {communitiesToShow.map((community) => (
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
      ) : (
        <div className="recent-communities">
          <h2>{searchResults.length > 0 ? 'Search Results' : 'Popular Communities'}</h2>
          <p>
            {searchQuery ? 'No communities found. Try a different search!' : 'No active communities yet. Be the first to create one!'}
          </p>
        </div>
      )}
    </div>
  )
}

export default Home
