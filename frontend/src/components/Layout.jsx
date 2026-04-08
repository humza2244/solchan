import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

const Layout = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isLoggedIn, displayName, logout, loading } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true')

  useEffect(() => {
    document.body.classList.toggle('dark', darkMode)
    localStorage.setItem('darkMode', darkMode)
  }, [darkMode])

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
            <button
              className="dark-mode-toggle"
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? 'Light mode' : 'Dark mode'}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <span className="nav-divider">|</span>
            {!loading && (
              isLoggedIn ? (
                <>
                  <span className="nav-user">{displayName}</span>
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
          <p>&copy; {new Date().getFullYear()} solchan</p>
        </div>
      </footer>
    </div>
  )
}

export default Layout

