// Message model - represents a chat message in a community
export class Message {
  constructor(data) {
    this.id = data.id || Date.now().toString()
    this.postNumber = data.post_number || data.postNumber || parseInt(this.id)
    this.communityId = data.community_id || data.communityId
    this.content = data.content
    this.userId = data.user_id || data.userId || null
    this.author = data.author || 'Anonymous'
    this.createdAt = data.created_at || data.createdAt || new Date()
  }

  toJSON() {
    return {
      id: this.id,
      postNumber: this.postNumber,
      communityId: this.communityId,
      content: this.content,
      userId: this.userId,
      author: this.author,
      createdAt: this.createdAt,
    }
  }
}

export default Message

