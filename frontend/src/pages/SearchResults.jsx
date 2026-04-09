import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
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

const CommunityImage = ({ community }) => {
  const [imgErr, setImgErr] = useState(false)
  if (community.imageUrl && !imgErr) {
    return <img src={community.imageUrl} alt={community.coinName} onError={() => setImgErr(true)} />
  }
  return (
    <div className="community-placeholder-img">
      {community.ticker?.slice(0, 4)}
    </div>
  )
}

const SearchResults = () => {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const searchCommunities = async () => {
      if (!query.trim()) {
        setResults([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const response = await axios.get(`${API_BASE_URL}/communities/search`, {
          params: { q: query.trim() }
        })
        setResults(response.data)
      } catch (error) {
        console.error('Error searching communities:', error)
        setResults([])
      } finally {
        setLoading(false)
      }
    }

    searchCommunities()
  }, [query])

  return (
    <div className="search-results-page">
      <div className="search-results-header">
        <h1>Search Results</h1>
        <p>Showing results for: <strong>{query}</strong></p>
        <Link to="/" className="back-home-link">← Back to Home</Link>
      </div>

      {loading ? (
        <div className="loading-section">
          <div className="loading-container">
            <div className="spinner"></div>
            <span className="loading-text">Searching...</span>
          </div>
        </div>
      ) : results.length === 0 ? (
        <div className="no-results-section">
          <h2>No communities found</h2>
          <p>No communities match "{query}"</p>
          <p>Try searching by:</p>
          <ul>
            <li>Ticker symbol (e.g., "BTC", "ETH", "PEPE")</li>
            <li>Contract address (e.g., "0x123...")</li>
          </ul>
          <Link to="/create-community" className="create-community-link">
            Create a community for "{query}"
          </Link>
        </div>
      ) : (
        <div className="search-results-container">
          <h2>Found {results.length} {results.length === 1 ? 'community' : 'communities'}</h2>
          
          <div className="communities-list">
            {results.map((community) => (
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
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default SearchResults
