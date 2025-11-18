// GET /api/boards/:board/threads
export const getBoardThreads = async (req, res) => {
  try {
    const { board } = req.params
    
    // TODO: Replace with actual database query
    // For now, return mock data
    const threads = [
      {
        id: 1,
        subject: 'Test Thread',
        content: 'This is a test thread',
        replyCount: 5,
        createdAt: new Date().toISOString(),
      },
    ]

    res.json(threads)
  } catch (error) {
    console.error('Error fetching board threads:', error)
    res.status(500).json({ error: 'Failed to fetch threads' })
  }
}

