import { useParams, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getBoardThreads } from '../services/api.js'

const Board = () => {
  const { board } = useParams()
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchThreads = async () => {
      try {
        const data = await getBoardThreads(board)
        setThreads(data)
      } catch (error) {
        console.error('Error fetching threads:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchThreads()
  }, [board])

  if (loading) {
    return <div className="board"><p>Loading...</p></div>
  }

  return (
    <div className="board">
      <h2>/{board}/</h2>
      <div className="threads-list">
        {threads.length === 0 ? (
          <p>No threads yet. Be the first to post!</p>
        ) : (
          threads.map((thread) => (
            <Link key={thread.id} to={`/${board}/${thread.id}`} className="thread-preview">
              <h3>{thread.subject || 'No subject'}</h3>
              <p>{thread.content}</p>
              <span>Replies: {thread.replyCount || 0}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

export default Board

