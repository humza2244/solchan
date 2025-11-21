import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import CreateCommunity from './pages/CreateCommunity.jsx'
import CommunityThreadList from './pages/CommunityThreadList.jsx'
import NewThread from './pages/NewThread.jsx'
import Thread from './pages/Thread.jsx'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create-community" element={<CreateCommunity />} />
          <Route path="/community/:id" element={<CommunityThreadList />} />
          <Route path="/community/:communityId/new-thread" element={<NewThread />} />
          <Route path="/thread/:id" element={<Thread />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App

