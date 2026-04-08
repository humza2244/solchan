import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import SearchResults from './pages/SearchResults.jsx'
import CreateCommunity from './pages/CreateCommunity.jsx'
import CommunityThreadList from './pages/CommunityThreadList.jsx'
import NewThread from './pages/NewThread.jsx'
import Thread from './pages/Thread.jsx'
import Register from './pages/Register.jsx'
import Login from './pages/Login.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import UserProfile from './pages/UserProfile.jsx'
import NotFound from './pages/NotFound.jsx'

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<SearchResults />} />
              <Route path="/create-community" element={<CreateCommunity />} />
              <Route path="/community/:id" element={<CommunityThreadList />} />
              <Route path="/community/:communityId/new-thread" element={<NewThread />} />
              <Route path="/thread/:id" element={<Thread />} />
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/user/:author" element={<UserProfile />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  )
}

export default App
