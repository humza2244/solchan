import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { API_BASE_URL } from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'

const NewThread = () => {
  const { communityId } = useParams()
  const navigate = useNavigate()
  const { isLoggedIn, displayName } = useAuth()
  
  const [name, setName] = useState(isLoggedIn ? displayName : 'Anonymous')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file size and type
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB')
        return
      }
      
      if (!file.type.startsWith('image/')) {
        setError('File must be an image')
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
    
    if (!subject.trim()) {
      setError('Subject is required')
      return
    }
    
    if (!content.trim()) {
      setError('Content is required')
      return
    }

    try {
      setSubmitting(true)

      // Create thread first
      const threadResponse = await axios.post(
        `${API_BASE_URL}/communities/${communityId}/threads`,
        {
          subject: subject.trim(),
          content: content.trim(),
          author: name.trim() || 'Anonymous',
        }
      )

      const threadId = threadResponse.data.id

      // Upload image if provided
      if (image) {
        const formData = new FormData()
        formData.append('image', image)

        await axios.post(
          `${API_BASE_URL}/threads/${threadId}/image`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        )
      }

      // Redirect to the new thread
      navigate(`/thread/${threadId}`)
    } catch (error) {
      console.error('Error creating thread:', error)
      setError(error.response?.data?.error || 'Failed to create thread')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="thread-page">
      <div className="thread-header-nav">
        <Link to={`/community/${communityId}`} className="back-link">← Back to Community</Link>
        <h2>Start a New Thread</h2>
      </div>

      {error && (
        <div className="error-message" style={{ background: '#ffeeee', padding: '10px', margin: '10px 0', border: '1px solid #ff0000' }}>
          {error}
        </div>
      )}

      <div className="post-form-container">
        <form onSubmit={handleSubmit} className="post-form">
          <div className="form-row">
            <div className="form-label">Name</div>
            <div className="form-input-group">
              <input
                type="text"
                value={isLoggedIn ? displayName : name}
                onChange={(e) => setName(e.target.value)}
                className="form-input"
                placeholder="Anonymous"
                disabled={submitting || isLoggedIn}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-label">Subject *</div>
            <div className="form-input-group">
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="form-input"
                placeholder="Enter thread subject..."
                required
                disabled={submitting}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-label">Comment *</div>
            <div className="form-input-group">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="form-textarea"
                placeholder="Enter your message..."
                required
                disabled={submitting}
                rows={8}
              />
              <div className="formatting-help">
                <details>
                  <summary className="formatting-help-toggle">Formatting help</summary>
                  <div className="formatting-help-content">
                    <code>&gt;greentext</code> — quote text<br/>
                    <code>**bold**</code> — <strong>bold text</strong><br/>
                    <code>*italic*</code> — <em>italic text</em><br/>
                    <code>~~spoiler~~</code> — spoiler text<br/>
                    <code>`code`</code> — inline code<br/>
                    <code>&gt;&gt;1234</code> — reply link
                  </div>
                </details>
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-label">File</div>
            <div className="form-input-group">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                disabled={submitting}
              />
              {imagePreview && (
                <div style={{ marginTop: 10 }}>
                  <img src={imagePreview} alt="Preview" style={{ maxWidth: 200, maxHeight: 200 }} />
                </div>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-label"></div>
            <div className="form-input-group">
              <button type="submit" disabled={submitting} className="post-button">
                {submitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NewThread

