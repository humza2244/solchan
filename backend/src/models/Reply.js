// Reply model - represents a reply to a thread
export class Reply {
  constructor(data) {
    this.id = data.id
    this.threadId = data.thread_id || data.threadId
    this.content = data.content
    this.imageUrl = data.image_url || data.imageUrl || null
    this.author = data.author || 'Anonymous'
    this.createdAt = data.created_at || data.createdAt || new Date()
    this.postNumber = parseInt(data.post_number || data.postNumber || 0)
  }

  toJSON() {
    return {
      id: this.id,
      threadId: this.threadId,
      content: this.content,
      imageUrl: this.imageUrl,
      author: this.author,
      createdAt: this.createdAt,
      postNumber: this.postNumber,
    }
  }
}

export default Reply
