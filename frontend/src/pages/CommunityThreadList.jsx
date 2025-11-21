import { useParams, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

const CommunityThreadList = () => {
  const { id } = useParams()
  const [community, setCommunity] = useState(null)
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)

  // Load community info and threads
  useEffect(() => {
    const loadCommunityAndThreads = async () => {
      try {
        setLoading(true)
        
        // Load community info
        const communityResponse = await axios.get(`${API_BASE_URL}/communities/${id}`)
        setCommunity(communityResponse.data.community)
        
        // Load threads with preview
        const threadsResponse = await axios.get(
          `${API_BASE_URL}/communities/${id}/threads?preview=true&limit=50`
        )
        setThreads(threadsResponse.data)
      } catch (error) {
        console.error('Error loading community:', error)
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      loadCommunityAndThreads()
    }
  }, [id])

  if (loading) {
    return (
      <div className="thread-page">
        <p>Loading community...</p>
      </div>
    )
  }

  if (!community) {
    return (
      <div className="thread-page">
        <p>Community not found</p>
      </div>
    )
  }

  return (
    <div className="thread-page">
      <div className="thread-header-nav">
        <Link to="/" className="back-link">← Back to Home</Link>
        <div className="thread-title">
          {community.imageUrl && (
            <img src={community.imageUrl} alt={community.coinName} style={{ width: 32, height: 32, marginRight: 8, borderRadius: 4 }} />
          )}
          {community.ticker} - {community.coinName}
        </div>
        <div className="thread-ca">{community.contractAddress}</div>
        {community.description && <p style={{ fontSize: 12, color: '#666', marginTop: 5 }}>{community.description}</p>}
        <div style={{ marginTop: 10 }}>
          <Link to={`/community/${id}/new-thread`} className="create-thread-btn">
            [Start a New Thread]
          </Link>
        </div>
      </div>

      {threads.length === 0 ? (
        <div className="no-threads">
          <p>No threads yet. Be the first to start one!</p>
          <Link to={`/community/${id}/new-thread`} className="create-thread-btn">
            [Start a New Thread]
          </Link>
        </div>
      ) : (
        <div className="threads-list">
          {threads.map((thread) => (
            <div key={thread.id} className="thread-preview">
              {/* OP Post - No box */}
              <div className="op-post">
                <div className="post-header">
                  <span className="post-subject">{thread.subject}</span>
                  <span className="post-name">{thread.author}</span>
                  <span className="post-date">
                    {new Date(thread.createdAt).toLocaleString()}
                  </span>
                  <span className="post-number">
                    No. {thread.postNumber}
                  </span>
                </div>
                {thread.imageUrl && (
                  <div className="op-image">
                    <img src={thread.imageUrl} alt="Thread image" />
                  </div>
                )}
                <div className="op-content">
                  <p>{thread.content}</p>
                </div>
                <div className="thread-stats">
                  <Link to={`/thread/${thread.id}`} className="reply-link">
                    Reply
                  </Link>
                  <span className="reply-count">{thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}</span>
                </div>
              </div>

              {/* Recent Replies Preview */}
              {thread.recentReplies && thread.recentReplies.length > 0 && (
                <div className="replies-preview">
                  {thread.recentReplies.map((reply) => (
                    <div key={reply.id} className="reply-box">
                      <div className="post-header">
                        <span className="post-name">{reply.author}</span>
                        <span className="post-date">
                          {new Date(reply.createdAt).toLocaleString()}
                        </span>
                        <span className="post-number">
                          No. {reply.postNumber}
                        </span>
                      </div>
                      {reply.imageUrl && (
                        <div className="reply-image">
                          <img src={reply.imageUrl} alt="Reply image" />
                        </div>
                      )}
                      <div className="reply-content">
                        <p>{reply.content}</p>
                      </div>
                    </div>
                  ))}
                  {thread.replyCount > thread.recentReplies.length && (
                    <Link to={`/thread/${thread.id}`} className="view-all-link">
                      View all {thread.replyCount} replies →
                    </Link>
                  )}
                </div>
              )}
              <hr className="thread-divider" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CommunityThreadList

