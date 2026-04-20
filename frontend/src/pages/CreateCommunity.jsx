import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { API_BASE_URL } from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'

const CreateCommunity = () => {
  const { isLoggedIn, getToken } = useAuth()
  const [ticker, setTicker] = useState('')
  const [coinName, setCoinName] = useState('')
  const [contractAddress, setContractAddress] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [error, setError] = useState('')
  const [existingId, setExistingId] = useState(null)
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image is too large (maximum 5MB)')
        return
      }

      if (!file.type.startsWith('image/')) {
        setError('Please select an image file')
        return
      }

      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
      }

      setError('')
      setImage(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setExistingId(null)

    if (!ticker.trim() || !coinName.trim()) {
      setError('Ticker and coin name are required')
      return
    }

    // Validate CA only if provided
    const ca = contractAddress.trim()
    if (ca && ca.length < 20) {
      setError('Invalid contract address — must be at least 20 characters')
      return
    }

    setLoading(true)

    try {
      // Get auth token if logged in
      let headers = {}
      if (isLoggedIn) {
        const token = await getToken()
        if (token) headers = { Authorization: `Bearer ${token}` }
      }

      // Step 1: Create the community
      const communityResponse = await axios.post(
        `${API_BASE_URL}/communities`,
        {
          ticker: ticker.trim(),
          coinName: coinName.trim(),
          contractAddress: ca || undefined,
          description: description.trim(),
        },
        { headers }
      )

      const community = communityResponse.data

      // Step 2: Upload image if provided
      if (image) {
        const formData = new FormData()
        formData.append('image', image)
        await axios.post(
          `${API_BASE_URL}/communities/${community.id}/image`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        )
      }

      navigate(`/community/${community.id}`)
    } catch (err) {
      console.error('Error creating community:', err)
      if (err.response?.status === 409 && err.response?.data?.existingId) {
        // CA already in use — show link to existing community
        setExistingId(err.response.data.existingId)
        setError('A community with this contract address already exists.')
      } else {
        setError(err.response?.data?.error || 'Failed to create community')
      }
      setLoading(false)
    }
  }

  return (
    <div className="create-community">
      <h2>Create a Community</h2>
      <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
        You can create a community now and add the contract address later once it's deployed.
        <br />
        {!isLoggedIn && (
          <span>💡 <Link to="/login">Log in</Link> to become the community creator with full mod powers.</span>
        )}
      </p>

      {error && (
        <div className="error-message">
          {error}
          {existingId && (
            <span>{' '}
              <Link to={`/community/${existingId}`} style={{ color: '#fff', textDecoration: 'underline', fontWeight: 'bold' }}>
                → Go to existing community
              </Link>
            </span>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="community-form">
        <div className="form-group">
          <label htmlFor="ticker">Ticker Symbol *</label>
          <input
            type="text"
            id="ticker"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            required
            disabled={loading}
            placeholder="e.g. PEPE"
            maxLength={10}
          />
        </div>

        <div className="form-group">
          <label htmlFor="coinName">Coin Name *</label>
          <input
            type="text"
            id="coinName"
            value={coinName}
            onChange={(e) => setCoinName(e.target.value)}
            required
            disabled={loading}
            placeholder="e.g. Pepe Coin"
            maxLength={255}
          />
        </div>

        <div className="form-group">
          <label htmlFor="contractAddress">
            Contract Address
            <span className="optional-badge">Optional</span>
          </label>
          <input
            type="text"
            id="contractAddress"
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
            disabled={loading}
            placeholder="Add now or later — e.g. 0x... or Solana address"
            className="ca-input"
          />
          <small>Leave blank if the token hasn't launched yet. You can add it from the community page.</small>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
            placeholder="Tell us about this coin community..."
            rows={5}
            maxLength={1000}
          />
        </div>

        <div className="form-group">
          <label htmlFor="image">Community Image</label>
          <input
            type="file"
            id="image"
            accept="image/*"
            onChange={handleImageChange}
            disabled={loading}
          />
          <small>Optional. Max 5MB. Any image format accepted.</small>
          {imagePreview && (
            <div className="image-preview">
              <img src={imagePreview} alt="Preview" />
            </div>
          )}
        </div>

        <button type="submit" disabled={loading} className="create-button">
          {loading ? 'Creating Community...' : 'Create Community'}
        </button>
      </form>
    </div>
  )
}

export default CreateCommunity
