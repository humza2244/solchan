import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import SignIn from './pages/SignIn.jsx'
import SignUp from './pages/SignUp.jsx'
import CreateCommunity from './pages/CreateCommunity.jsx'
import Community from './pages/Community.jsx'

// Protected route component - TEMPORARILY DISABLED FOR TESTING
function ProtectedRoute({ children }) {
  // TEMPORARY: Skip auth check for testing
  return children
  
  /* ORIGINAL CODE - UNCOMMENT WHEN READY
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div>Loading...</div>
  }
  
  if (!user) {
    return <Navigate to="/signin" replace />
  }
  
  return children
  */
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route
              path="/create-community"
              element={
                <ProtectedRoute>
                  <CreateCommunity />
                </ProtectedRoute>
              }
            />
            <Route path="/community/:id" element={<Community />} />
            {/* Keep old route for backwards compatibility */}
            <Route path="/coin/:contractAddress" element={<Community />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  )
}

export default App

