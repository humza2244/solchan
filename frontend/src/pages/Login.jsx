import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const Login = () => {
  const { login, loginWithGoogle, loginWithTwitter, isLoggedIn } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [twitterLoading, setTwitterLoading] = useState(false)

  if (isLoggedIn) {
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

  const handleGoogleLogin = async () => {
    setError('')
    setGoogleLoading(true)
    try {
      await loginWithGoogle()
      navigate('/')
    } catch (err) {
      console.error('Google login error:', err.code, err.message)
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        // User closed popup -- ignore
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Allow popups for this site and try again.')
      } else {
        setError(`Login failed (${err.code || 'unknown'}). Use email/password instead.`)
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="thread-page">
      <div className="create-community">
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <img src="/mascot.png" alt="CoinTalk" style={{ width: 60, height: 'auto', marginBottom: 8 }} />
          <h2 style={{ fontFamily: 'var(--font-hand)', fontSize: '32px' }}>Login</h2>
        </div>
        <p style={{ fontSize: '12px', color: '#888', marginBottom: '18px', textAlign: 'center' }}>
          Login to post with your username. You can always post anonymously without logging in.
        </p>

        {error && <div className="error-message">{error}</div>}

        <button
          id="login-with-google"
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading || submitting}
          className="google-login-btn"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {googleLoading ? 'Connecting...' : 'Continue with Google'}
        </button>

        <button
          id="login-with-twitter"
          type="button"
          onClick={async () => {
            setError('')
            setTwitterLoading(true)
            try {
              await loginWithTwitter()
              navigate('/')
            } catch (err) {
              if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
                if (err.code === 'auth/invalid-credential' || err.code === 'auth/operation-not-allowed') {
                  setError('X/Twitter login is not yet configured. Use Google or email instead.')
                } else if (err.code === 'auth/popup-blocked') {
                  // Redirect fallback handled in AuthContext
                } else {
                  setError(err.message || 'Login failed. Try again.')
                }
              }
            } finally {
              setTwitterLoading(false)
            }
          }}
          disabled={twitterLoading || submitting}
          className="google-login-btn"
          style={{ background: '#000', color: '#fff', borderColor: '#333' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white" style={{ flexShrink: 0 }}>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          {twitterLoading ? 'Connecting...' : 'Continue with X'}
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
