import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import CreateCommunity from './pages/CreateCommunity.jsx'
import Community from './pages/Community.jsx'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create-community" element={<CreateCommunity />} />
          <Route path="/community/:id" element={<Community />} />
          {/* Keep old route for backwards compatibility */}
          <Route path="/coin/:contractAddress" element={<Community />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App

