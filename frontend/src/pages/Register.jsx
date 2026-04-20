import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const Register = () => {
  const { register, loginWithX, isLoggedIn } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [xLoading, setXLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  if (isLoggedIn && !success) {
    navigate('/')
    return null
  }

  const validateUsername = (name) => {
    if (name.length < 3 || name.length > 20) return 'Username must be 3-20 characters'
    if (!/^[a-zA-Z0-9_]+$/.test(name)) return 'Username can only contain letters, numbers, and underscores'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password || !username.trim()) {
      setError('All fields are required')
      return
    }

    const usernameError = validateUsername(username.trim())
    if (usernameError) {
      setError(usernameError)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    try {
      setSubmitting(true)
      await register(email.trim(), password, username.trim())
      setSuccess(true)
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists')
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address')
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak')
      } else if (err.message === 'Username already taken') {
        setError('That username is already taken')
      } else {
        setError('Registration failed. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleXRegister = async () => {
    setError('')
    setXLoading(true)
    try {
      await loginWithX()
      navigate('/')
    } catch (err) {
      console.error('X register error:', err.code, err.message)
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        // User closed popup — ignore
      } else if (err.code === 'auth/configuration-not-found' || err.code === 'auth/operation-not-allowed') {
        setError('X login is not enabled yet. Register with email/password instead.')
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked. Allow popups for this site and try again.')
      } else {
        setError(`Registration failed (${err.code || 'unknown'}). Try email/password instead.`)
      }
    } finally {
      setXLoading(false)
    }
  }

  if (success) {
    return (
      <div className="thread-page">
        <div className="create-community">
          <h2>Account Created</h2>
          <p>
            A verification email has been sent to your address. You can continue posting while you verify.
          </p>
          <button className="create-button" onClick={() => navigate('/')}>
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="thread-page">
      <div className="create-community">
        <h2>Create Account</h2>
        <p style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>
          You don't need an account to post. Registration is optional — only needed to post with a persistent username.
        </p>

        {error && <div className="error-message">{error}</div>}

        <button
          id="register-with-x"
          type="button"
          onClick={handleXRegister}
          disabled={xLoading || submitting}
          className="x-login-btn"
        >
          {xLoading ? 'Connecting to X...' : 'Sign up with X (Twitter)'}
        </button>

        <div className="auth-divider">
          <span>or register with email</span>
        </div>

        <form onSubmit={handleSubmit} className="community-form">
          <div className="form-group">
            <label htmlFor="reg-username">Username</label>
            <input
              id="reg-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Letters, numbers, underscores only"
              disabled={submitting}
              maxLength={20}
              autoComplete="username"
            />
            <small>This is your public display name. 3-20 characters.</small>
          </div>

          <div className="form-group">
            <label htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={submitting}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              disabled={submitting}
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-confirm-password">Confirm Password</label>
            <input
              id="reg-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
              disabled={submitting}
              autoComplete="new-password"
            />
          </div>

          <button type="submit" disabled={submitting} className="create-button">
            {submitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ marginTop: '15px', fontSize: '12px', textAlign: 'center' }}>
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  )
}

export default Register
