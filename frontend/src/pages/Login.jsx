import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import XLinkPrompt from '../components/XLinkPrompt.jsx'

const Login = () => {
  const { login, loginWithX, isLoggedIn } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [xLoading, setXLoading] = useState(false)
  const [showXPrompt, setShowXPrompt] = useState(false)

  if (isLoggedIn && !showXPrompt) {
    navigate('/')
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Email and password are required')
      return
    }

    try {
      setSubmitting(true)
      await login(email.trim(), password)
      navigate('/')
    } catch (err) {
      console.error('Login error:', err)
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password')
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Try again later.')
      } else {
        setError('Login failed. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleXLogin = async () => {
    setError('')
    setXLoading(true)
    try {
      const result = await loginWithX()
      if (result.needsUsername) {
        setShowXPrompt(true)
      } else {
        navigate('/')
      }
    } catch (err) {
      console.error('X login error:', err.code, err.message)
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        // User closed popup — ignore
      } else if (err.code === 'auth/configuration-not-found' || err.code === 'auth/operation-not-allowed') {
        setError('X login is not enabled yet. Use email/password login instead.')
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Allow popups for this site and try again.')
      } else {
        setError(`Login failed (${err.code || 'unknown error'}). Use email/password instead.`)
      }
    } finally {
      setXLoading(false)
    }
  }

  if (showXPrompt) {
    return (
      <XLinkPrompt
        onComplete={() => navigate('/')}
        onCancel={() => setShowXPrompt(false)}
      />
    )
  }

  return (
    <div className="thread-page">
      <div className="create-community">
        <h2>Login</h2>
        <p style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>
          Login to post with your username. You can always post as Anonymous without logging in.
        </p>

        {error && (
          <div className="error-message">{error}</div>
        )}

        {/* X Login Button */}
        <button
          id="login-with-x"
          type="button"
          onClick={handleXLogin}
          disabled={xLoading || submitting}
          className="x-login-btn"
        >
          {xLoading ? 'Connecting to X...' : 'Continue with X (Twitter)'}
        </button>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <form onSubmit={handleSubmit} className="community-form">
          <div className="form-group">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={submitting}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              disabled={submitting}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" disabled={submitting} className="create-button">
            {submitting ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p style={{ marginTop: '15px', fontSize: '12px', textAlign: 'center' }}>
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
        <p style={{ marginTop: '6px', fontSize: '12px', textAlign: 'center' }}>
          <Link to="/forgot-password">Forgot password?</Link>
        </p>
      </div>
    </div>
  )
}

export default Login
