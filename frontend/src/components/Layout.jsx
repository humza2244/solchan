import { Link } from 'react-router-dom'

const Layout = ({ children }) => {
  return (
    <div className="layout">
      <header className="header">
        <div className="container">
          <nav className="nav">
            <Link to="/">Home</Link>
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
