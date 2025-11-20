import { Link, useNavigate, useLocation } from 'react-router-dom'

const Layout = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()

  const handleHomeClick = (e) => {
    if (location.pathname === '/') {
      // If already on home, force reload to clear any state
      e.preventDefault()
      window.location.href = '/'
    }
  }

  return (
    <div className="layout">
      <header className="header">
        <div className="container">
          <nav className="nav">
            <Link to="/" onClick={handleHomeClick}>Home</Link>
            <span className="nav-divider">|</span>
            <span className="nav-ca">CA: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</span>
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
          <p>&copy; 2025 solchan</p>
        </div>
      </footer>
    </div>
  )
}

export default Layout
