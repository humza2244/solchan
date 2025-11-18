import { useParams, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getThread } from '../services/api.js'

const Thread = () => {
  const { board, threadId } = useParams()
  const [thread, setThread] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchThread = async () => {
      try {
        const data = await getThread(board, threadId)
        setThread(data)
      } catch (error) {
        console.error('Error fetching thread:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchThread()
  }, [board, threadId])

  if (loading) {
    return <div className="thread"><p>Loading...</p></div>
  }

  if (!thread) {
    return <div className="thread"><p>Thread not found</p></div>
  }

  return (
    <div className="thread">
      <div className="thread-header">
        <Link to={`/${board}`} className="back-link">← Back to /{board}/</Link>
      </div>
      <h2>{thread.subject || 'No subject'}</h2>
      <div className="op-post">
        <p>{thread.content}</p>
        <span>Posted: {new Date(thread.createdAt).toLocaleString()}</span>
      </div>
      <div className="replies">
        <h3>Replies</h3>
        {thread.replies && thread.replies.length > 0 ? (
          thread.replies.map((reply) => (
            <div key={reply.id} className="reply">
              <p>{reply.content}</p>
              <span>{new Date(reply.createdAt).toLocaleString()}</span>
            </div>
          ))
        ) : (
          <p>No replies yet</p>
        )}
      </div>
    </div>
  )
}

export default Thread

