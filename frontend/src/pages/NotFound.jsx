import { Link } from 'react-router-dom'

const NotFound = () => {
  return (
    <div className="not-found">
      <h1>404</h1>
      <h2>Page Not Found</h2>
      <p>The page you're looking for doesn't exist or has been moved.</p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link to="/" style={{
          display: 'inline-block',
          padding: '10px 24px',
          background: '#1d9bf0',
          color: '#fff',
          borderRadius: 9999,
          textDecoration: 'none',
          fontWeight: 700,
          fontSize: 14,
        }}>
          Back to Home
        </Link>
        <Link to="/create-community" style={{
          display: 'inline-block',
          padding: '10px 24px',
          background: '#16181c',
          color: '#e7e9ea',
          borderRadius: 9999,
          textDecoration: 'none',
          fontWeight: 700,
          fontSize: 14,
          border: '1px solid #2f3336',
        }}>
          Create a Community
        </Link>
      </div>
    </div>
  )
}

export default NotFound
