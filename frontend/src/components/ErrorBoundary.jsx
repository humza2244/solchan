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
          padding: 20,
          background: '#F0E0D6',
          border: '1px solid #D9BFB7',
          textAlign: 'center',
          fontFamily: 'Arial, Helvetica, sans-serif',
        }}>
          <h2 style={{ color: '#AF0A0F', marginBottom: 10 }}>Something went wrong</h2>
          <p style={{ fontSize: 13, marginBottom: 15 }}>
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 20px',
              background: '#AF0A0F',
              color: '#FFF',
              border: '1px solid #800000',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: 13,
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
