import { useState } from 'react'
import { Link } from 'react-router-dom'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../config/firebase.js'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError('')

    try {
      await sendPasswordResetEmail(auth, email.trim())
      setSent(true)
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        setError('No account found with that email.')
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address.')
      } else {
        setError('Failed to send reset email. Try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        <h2 className="auth-title">Reset Password</h2>

        {sent ? (
          <div className="auth-success">
            <p>✓ Password reset email sent to <strong>{email}</strong></p>
            <p style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
              Check your inbox and follow the link to reset your password.
            </p>
            <Link to="/login" className="auth-link" style={{ marginTop: 16, display: 'inline-block' }}>
              ← Back to Login
            </Link>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 14 }}>
              Enter your email and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                />
              </div>

              {error && <div className="auth-error">{error}</div>}

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <div className="auth-footer">
              <Link to="/login" className="auth-link">← Back to Login</Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ForgotPassword
