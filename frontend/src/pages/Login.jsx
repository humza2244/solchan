import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const Login = () => {
  const { login, isLoggedIn } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
