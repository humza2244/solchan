import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

const SignUp = () => {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validate username
    if (!username || username.trim().length < 3) {
      setError('Username must be at least 3 characters')
      return
    }

    if (username.length > 50) {
      setError('Username must be 50 characters or less')
      return
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setError('Username can only contain letters, numbers, underscores, and hyphens')
      return
    }

    // Validate passwords
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      // Step 1: Sign up with Supabase
      const { user, session, error: signUpError } = await signUp(email, password)

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      // Step 2: Create user profile with username
      if (session && session.access_token) {
        try {
          await axios.post(
            `${API_BASE_URL}/profile`,
            { username: username.trim() },
            {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            }
          )
          
          // Success - redirect to home
          alert('Account created successfully! Welcome to solchan.')
          navigate('/')
        } catch (profileError) {
          console.error('Error creating profile:', profileError)
          if (profileError.response?.data?.error === 'Username already taken') {
            setError('Username already taken. Please choose another.')
          } else {
            setError('Account created but failed to set username. Please try signing in.')
          }
          setLoading(false)
        }
      } else {
        // Email verification required
        alert('Account created! Please check your email to verify your account, then sign in.')
        navigate('/signin')
      }
    } catch (error) {
      console.error('Sign up error:', error)
      setError(error.message || 'Failed to create account')
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>solchan</h1>
        <h2>Sign Up</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
              placeholder="Choose a unique username"
              minLength={3}
              maxLength={50}
            />
            <small style={{ fontSize: '11px', color: '#666' }}>
              3-50 characters. Letters, numbers, underscores, and hyphens only.
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              disabled={loading}
            />
          </div>

          <button type="submit" disabled={loading} className="auth-button">
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p className="auth-link">
          Already have an account? <Link to="/signin">Sign In</Link>
        </p>
      </div>
    </div>
  )
}

export default SignUp

