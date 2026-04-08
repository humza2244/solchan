import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../services/api.js'
import DOMPurify from 'dompurify'

const UserProfile = () => {
  const { author } = useParams()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadPosts = async () => {
      try {
        setLoading(true)
        const res = await axios.get(`${API_BASE_URL}/users/${encodeURIComponent(author)}/posts`)
        setPosts(res.data)
      } catch (err) {
        console.error('Error loading user posts:', err)
        setError('Failed to load post history')
      } finally {
        setLoading(false)
      }
    }

    if (author) loadPosts()
  }, [author])

  const truncateContent = (content, maxLen = 200) => {
    const clean = DOMPurify.sanitize(content, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
    return clean.length > maxLen ? clean.slice(0, maxLen) + '...' : clean
  }

  const threadCount = posts.filter(p => p.type === 'thread').length
  const replyCount = posts.filter(p => p.type === 'reply').length

  if (loading) {
    return (
      <div className="thread-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <span className="loading-text">Loading profile...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="thread-page">
      <div className="thread-header-nav">
        <Link to="/" className="back-link">← Back to Home</Link>
      </div>

      <div className="user-profile-header">
        <div className="user-profile-avatar">
          {author.charAt(0).toUpperCase()}
        </div>
        <div className="user-profile-info">
          <h2 className="user-profile-name">{author}</h2>
          <div className="user-profile-stats">
            <span>{posts.length} total posts</span>
            <span>{threadCount} threads</span>
            <span>{replyCount} replies</span>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {posts.length === 0 ? (
        <div className="no-threads">
          <p>No posts found for this user.</p>
        </div>
      ) : (
        <div className="user-posts-list">
          {posts.map((post) => (
            <div key={`${post.type}-${post.id}`} className="user-post-card">
              <div className="user-post-meta">
                <span className={`user-post-type ${post.type}`}>
                  {post.type === 'thread' ? '📝 Thread' : '💬 Reply'}
                </span>
                <span className="post-date">
                  {new Date(post.createdAt).toLocaleString()}
                </span>
                <span className="post-number">No. {post.postNumber}</span>
              </div>

              {post.type === 'thread' && post.subject && (
                <div className="user-post-subject">{post.subject}</div>
              )}

              <div className="user-post-content">
                {truncateContent(post.content)}
              </div>

              {post.imageUrl && (
                <div className="user-post-thumb">
                  <img src={post.imageUrl} alt="Post attachment" />
                </div>
              )}

              <div className="user-post-footer">
                {post.type === 'thread' ? (
                  <>
                    <Link to={`/thread/${post.id}`} className="user-post-link">
                      View Thread →
                    </Link>
                    <span className="reply-count-badge">
                      {post.replyCount} {post.replyCount === 1 ? 'reply' : 'replies'}
                    </span>
                  </>
                ) : (
                  <Link to={`/thread/${post.threadId}`} className="user-post-link">
                    View in Thread →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default UserProfile
