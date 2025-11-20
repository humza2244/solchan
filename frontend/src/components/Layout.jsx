import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Layout = ({ children }) => {
  const { user, signOut } = useAuth()
  // TEMP: Disable profile fetching until Railway auth is fixed
  // const { profile } = useUserProfile()
  const profile = null

  const handleSignOut = async () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      await signOut()
    }
  }

  return (
    <div className="layout">
      <header className="header">
        <div className="container">
          <nav className="nav">
            <Link to="/">Home</Link>
            <span className="nav-separator">-</span>
            {user ? (
              <>
                <span className="nav-user">
                  {profile?.username || user.email}
                </span>
                <span className="nav-separator">-</span>
                <button onClick={handleSignOut} className="nav-button">
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/signin">Sign In</Link>
                <span className="nav-separator">-</span>
                <Link to="/signup">Sign Up</Link>
              </>
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
          <p>&copy; 2024 solchan</p>
        </div>
      </footer>
    </div>
  )
}

export default Layout
