// Coin model - represents a memecoin community
export class Coin {
  constructor(data) {
    this.contractAddress = data.contractAddress.toLowerCase() // Normalize to lowercase
    this.name = data.name || null
    this.symbol = data.symbol || null
    this.createdAt = data.createdAt || new Date()
    this.messageCount = data.messageCount || 0
    this.lastMessageAt = data.lastMessageAt || null
  }

  toJSON() {
    return {
      contractAddress: this.contractAddress,
      name: this.name,
      symbol: this.symbol,
      createdAt: this.createdAt,
      messageCount: this.messageCount,
      lastMessageAt: this.lastMessageAt,
    }
  }
}

export default Coin

