// Thread model - represents a thread (OP post) in a community
export class Thread {
  constructor(data) {
    this.id = data.id
    this.communityId = data.community_id || data.communityId
    this.subject = data.subject
    this.content = data.content
    this.imageUrl = data.image_url || data.imageUrl || null
    this.author = data.author || 'Anonymous'
    this.createdAt = data.created_at || data.createdAt || new Date()
    this.lastBumpAt = data.last_bump_at || data.lastBumpAt || this.createdAt
    this.replyCount = parseInt(data.reply_count || data.replyCount || 0)
    this.postNumber = parseInt(data.post_number || data.postNumber || 0)
    this.isPinned = data.is_pinned || data.isPinned || false
  }

  toJSON() {
    return {
      id: this.id,
      communityId: this.communityId,
      subject: this.subject,
      content: this.content,
      imageUrl: this.imageUrl,
      author: this.author,
      createdAt: this.createdAt,
      lastBumpAt: this.lastBumpAt,
      replyCount: this.replyCount,
      postNumber: this.postNumber,
      isPinned: this.isPinned,
    }
  }
}

export default Thread
