import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

const Layout = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isLoggedIn, displayName, logout, loading } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [showScrollTop, setShowScrollTop] = useState(false)

  // Ensure dark mode is always off
  useEffect(() => {
    document.body.classList.remove('dark')
    localStorage.removeItem('darkMode')
  }, [])

  // Scroll listener for scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleHomeClick = (e) => {
    if (location.pathname === '/') {
      e.preventDefault()
      window.location.href = '/'
    }
  }

  const handleNavSearch = (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    setSearchQuery('')
  }

  const handleLogout = async (e) => {
    e.preventDefault()
    await logout()
    navigate('/')
  }

  return (
    <div className="layout">
      <header className="header">
        <div className="container">
          <nav className="nav">
            <Link to="/" onClick={handleHomeClick} style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
              <img src="/mascot.png" alt="CoinTalk" style={{ width: 28, height: 28, borderRadius: '50%' }} />
              <span style={{ fontSize: 20, fontWeight: 700, color: '#2a2a2a' }}>CoinTalk</span>
            </Link>
            <span className="nav-divider">·</span>
            <Link to="/create-community" className="nav-link">+ New Board</Link>
            <span className="nav-divider">·</span>
            <form onSubmit={handleNavSearch} className="nav-search">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="nav-search-input"
              />
            </form>
            <span className="nav-divider">·</span>
            {!loading && (
              isLoggedIn ? (
                <>
                  <Link to={`/user/${encodeURIComponent(displayName)}`} className="nav-user">{displayName}</Link>
                  <span className="nav-divider">·</span>
                  <a href="#" onClick={handleLogout} className="nav-link">Logout</a>
                </>
              ) : (
                <>
                  <Link to="/login" className="nav-link">Login</Link>
                  <span className="nav-divider">·</span>
                  <Link to="/register" className="nav-link">Register</Link>
                </>
              )
            )}
          </nav>
        </div>
      </header>

      <main className="main page-fade-in">
        <div className="container">
          {children}
        </div>
      </main>
      <footer className="footer">
        <div className="container">
          <div className="footer-brand">
            <img src="/mascot.png" alt="CoinTalk" className="footer-mascot" />
            <div>
              <strong>CoinTalk</strong>
              <span className="footer-tagline">where degens talk coins</span>
            </div>
          </div>
          <div className="footer-links">
            <Link to="/">Home</Link>
            <Link to="/create-community">Create Board</Link>
          </div>
          <p className="footer-copy">&copy; {new Date().getFullYear()} CoinTalk. All rights reserved.</p>
        </div>
      </footer>

      <button
        className={`scroll-top-btn ${showScrollTop ? 'visible' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        title="Scroll to top"
        aria-label="Scroll to top"
      >
        ↑
      </button>
    </div>
  )
}

export default Layout
