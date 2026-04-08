import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const Register = () => {
  const { register, isLoggedIn } = useAuth()
  const navigate = useNavigate()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
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

    // Validate
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
      console.error('Registration error:', err)
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists')
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak — use at least 6 characters')
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address')
      } else if (err.response?.data?.error) {
        setError(err.response.data.error)
      } else {
        setError('Registration failed. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="thread-page">
        <div className="create-community" style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#117743' }}>✓ Account Created!</h2>
          <p style={{ margin: '15px 0', lineHeight: 1.6 }}>
            A verification email has been sent to <strong>{email}</strong>.<br />
            Check your inbox (and spam folder) to verify your account.
          </p>
          <p style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>
            You can start posting immediately, but verifying your email will add a ✓ badge to your posts.
          </p>
          <Link to="/" style={{ color: '#0000EE', fontWeight: 'bold' }}>Go to Home →</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="thread-page">
      <div className="create-community">
        <h2>Create an Account</h2>
        <p style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>
          Registration is optional. You can always post as Anonymous without an account.
        </p>

        {error && (
          <div className="error-message">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="community-form">
          <div className="form-group">
            <label htmlFor="reg-username">Username</label>
            <input
              id="reg-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="3-20 characters, letters/numbers/underscores"
              disabled={submitting}
              autoComplete="username"
            />
            <small>This will be your display name on posts</small>
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
            <small>Used for login and verification only — never shared publicly</small>
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
            <label htmlFor="reg-confirm">Confirm Password</label>
            <input
              id="reg-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              disabled={submitting}
              autoComplete="new-password"
            />
          </div>

          <button type="submit" disabled={submitting} className="create-button">
            {submitting ? 'Creating Account...' : 'Create Account'}
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
