import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

const CreateCommunity = () => {
  const [ticker, setTicker] = useState('')
  const [coinName, setCoinName] = useState('')
  const [contractAddress, setContractAddress] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { getAccessToken, user } = useAuth()
  const navigate = useNavigate()

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Image file is too large (max 5MB)')
        return
      }
      
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file')
        return
      }
      
      setImage(file)
      setImagePreview(URL.createObjectURL(file))
      setError('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    // TEMPORARY: Skip user check for testing
    // if (!user) {
    //   setError('You must be signed in to create a community')
    //   return
    // }

    if (contractAddress.length < 20) {
      setError('Invalid contract address')
      return
    }

    setLoading(true)

    try {
      // TEMPORARY: Mock token for testing
      const token = 'mock-token-for-testing'
      
      // Step 1: Create the community
      const communityResponse = await axios.post(
        `${API_BASE_URL}/communities`,
        {
          ticker: ticker.trim(),
          coinName: coinName.trim(),
          contractAddress: contractAddress.trim(),
          description: description.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const community = communityResponse.data

      // Step 2: Upload image if provided
      if (image) {
        const formData = new FormData()
        formData.append('image', image)

        await axios.post(
          `${API_BASE_URL}/communities/${community.id}/image`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
          }
        )
      }

      // Navigate to the new community
      navigate(`/community/${community.id}`)
    } catch (error) {
      console.error('Error creating community:', error)
      setError(error.response?.data?.error || 'Failed to create community')
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="create-community">
        <h2>Create a Community</h2>
        <p>You must be <a href="/signin">signed in</a> to create a community.</p>
      </div>
    )
  }

  return (
    <div className="create-community">
      <h2>Create a Community</h2>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="community-form">
        <div className="form-group">
          <label htmlFor="ticker">Ticker Symbol *</label>
          <input
            type="text"
            id="ticker"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
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
          <label htmlFor="contractAddress">Contract Address *</label>
          <input
            type="text"
            id="contractAddress"
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
            required
            disabled={loading}
            placeholder="e.g. 0x..."
            className="ca-input"
          />
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

