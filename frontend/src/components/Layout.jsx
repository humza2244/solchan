import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

const Layout = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isLoggedIn, displayName, logout, loading, twitterHandle, linkX, profile } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [linkingX, setLinkingX] = useState(false)
  const [xLinkMsg, setXLinkMsg] = useState('')

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

  const handleLinkX = async (e) => {
    e.preventDefault()
    setLinkingX(true)
    try {
      const handle = await linkX()
      setXLinkMsg(handle ? `@${handle} linked!` : 'X linked!')
      setTimeout(() => setXLinkMsg(''), 3000)
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/configuration-not-found') {
          setXLinkMsg('X login not configured in Firebase')
        } else {
          setXLinkMsg('Failed to link X')
        }
        setTimeout(() => setXLinkMsg(''), 4000)
      }
    } finally {
      setLinkingX(false)
    }
  }

  return (
    <div className="layout">
      <header className="header">
        <div className="container">
          <nav className="nav">
            <Link to="/" onClick={handleHomeClick}>Home</Link>
            <span className="nav-divider">|</span>
            <Link to="/create-community" className="nav-link">Create a Community</Link>
            <span className="nav-divider">|</span>
            <form onSubmit={handleNavSearch} className="nav-search">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="nav-search-input"
              />
            </form>
            <span className="nav-divider">|</span>
            {!loading && (
              isLoggedIn ? (
                <>
                  <Link to={`/user/${encodeURIComponent(displayName)}`} className="nav-user">{displayName}</Link>
                  {twitterHandle ? (
                    <span className="nav-x-handle" title="X account linked">
                      X @{twitterHandle}
                    </span>
                  ) : (
                    xLinkMsg ? (
                      <span className="nav-x-linked">{xLinkMsg}</span>
                    ) : (
                      <button
                        className="nav-link-x-btn"
                        onClick={handleLinkX}
                        disabled={linkingX}
                        title="Connect your X (Twitter) account"
                      >
                        {linkingX ? 'Connecting...' : 'Link X'}
                      </button>
                    )
                  )}
                  <span className="nav-divider">|</span>
                  <a href="#" onClick={handleLogout} className="nav-link">Logout</a>
                </>
              ) : (
                <>
                  <Link to="/login" className="nav-link">Login</Link>
                  <span className="nav-divider">|</span>
                  <Link to="/register" className="nav-link">Register</Link>
                </>
              )
            )}
          </nav>
        </div>
      </header>
      <main className="main">
        <div className="container">
          {children}
        </div>
      </main>
      <footer className="footer">
        <div className="container">
          <div className="footer-links">
            <Link to="/">Home</Link>
            <Link to="/create-community">Create Community</Link>
            <a href="https://github.com/realdoomsman/solchan" target="_blank" rel="noopener noreferrer">GitHub</a>
          </div>
          <p>&copy; {new Date().getFullYear()} solchan</p>
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
