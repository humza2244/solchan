import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

/**
 * XLinkPrompt — shown after a new X/Twitter OAuth login.
 * Asks the user to pick a username before creating their profile.
 */
const XLinkPrompt = ({ onComplete, onCancel }) => {
  const { registerWithX } = useAuth()
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const validate = (name) => {
    if (name.length < 3 || name.length > 20) return 'Username must be 3–20 characters'
    if (!/^[a-zA-Z0-9_]+$/.test(name)) return 'Letters, numbers, and underscores only'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const trimmed = username.trim()
    const err = validate(trimmed)
    if (err) { setError(err); return }

    try {
      setSubmitting(true)
      await registerWithX(trimmed)
      onComplete?.()
    } catch (err) {
      if (err.message === 'Username already taken') {
        setError('That username is taken — try another')
      } else {
        setError(err.message || 'Failed to create profile')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="x-link-overlay">
      <div className="x-link-modal">
        <div className="x-link-header">
          <span className="x-logo">𝕏</span>
          <h3>Welcome! Choose a Username</h3>
          <p>Your X account is connected. Pick a username to use on solchan.</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="community-form">
          <div className="form-group">
            <label htmlFor="x-username">Username</label>
            <input
              id="x-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="3–20 chars, letters/numbers/underscores"
              disabled={submitting}
              autoFocus
              autoComplete="username"
            />
            <small>This will appear on your posts</small>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={submitting} className="create-button" style={{ flex: 1 }}>
              {submitting ? 'Creating...' : 'Continue'}
            </button>
            {onCancel && (
              <button type="button" onClick={onCancel} className="thread-action-btn" style={{ flex: 0 }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default XLinkPrompt
