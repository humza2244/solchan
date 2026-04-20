import { Link } from 'react-router-dom'

const NotFound = () => {
  return (
    <div className="not-found" style={{
      textAlign: 'center',
      padding: '80px 20px',
      maxWidth: 500,
      margin: '0 auto',
    }}>
      <div style={{ fontSize: 64, marginBottom: 10 }}>🔍</div>
      <h1 style={{ fontSize: 48, color: '#AF0A0F', marginBottom: 8, fontWeight: 800 }}>404</h1>
      <h2 style={{ fontSize: 18, marginBottom: 16, color: '#34345C' }}>Page Not Found</h2>
      <p style={{ fontSize: 14, color: '#666', marginBottom: 24, lineHeight: 1.6 }}>
        The page you're looking for doesn't exist, has been moved, or the community was deleted.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link to="/" style={{
          display: 'inline-block',
          padding: '10px 20px',
          background: '#800000',
          color: '#fff',
          borderRadius: 6,
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: 14,
          transition: 'background 0.2s',
        }}>
          ← Back to Home
        </Link>
        <Link to="/create-community" style={{
          display: 'inline-block',
          padding: '10px 20px',
          background: '#E5E9F0',
          color: '#34345C',
          borderRadius: 6,
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: 14,
          border: '1px solid #B7C5D9',
        }}>
          Create a Community
        </Link>
      </div>
    </div>
  )
}

export default NotFound
