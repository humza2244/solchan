// Community model - represents a memecoin community
export class Community {
  constructor(data) {
    this.id = data.id
    this.ticker = data.ticker
    this.coinName = data.coin_name || data.coinName
    this.contractAddress = (data.contract_address || data.contractAddress).toLowerCase()
    this.description = data.description || null
    this.imageUrl = data.image_url || data.imageUrl || null
    this.creatorId = data.creator_id || data.creatorId || null
    this.createdAt = data.created_at || data.createdAt || new Date()
    this.messageCount = data.message_count || data.messageCount || 0
    this.uniqueUsersCount = data.unique_users_count || data.uniqueUsersCount || 0
    this.lastMessageAt = data.last_message_at || data.lastMessageAt || null
  }

  toJSON() {
    return {
      id: this.id,
      ticker: this.ticker,
      coinName: this.coinName,
      contractAddress: this.contractAddress,
      description: this.description,
      imageUrl: this.imageUrl,
      creatorId: this.creatorId,
      createdAt: this.createdAt,
      messageCount: this.messageCount,
      uniqueUsersCount: this.uniqueUsersCount,
      lastMessageAt: this.lastMessageAt,
    }
  }
  
  // Calculate popularity score
  getPopularityScore(messages24h = 0) {
    return (
      (this.messageCount * 1) +
      (messages24h * 5) +
      (this.uniqueUsersCount * 10)
    )
  }
}

export default Community

