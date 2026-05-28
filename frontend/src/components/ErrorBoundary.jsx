import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          maxWidth: 600,
          margin: '60px auto',
          padding: 28,
          background: '#16181c',
          border: '1px solid #2f3336',
          borderRadius: 16,
          textAlign: 'center',
          fontFamily: "'Inter', -apple-system, sans-serif",
        }}>
          <h2 style={{ color: '#f4212e', marginBottom: 12, fontSize: 20 }}>Something went wrong</h2>
          <p style={{ fontSize: 14, marginBottom: 20, color: '#71767b' }}>
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px',
              background: '#1d9bf0',
              color: '#fff',
              border: 'none',
              borderRadius: 9999,
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 15,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Refresh Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
