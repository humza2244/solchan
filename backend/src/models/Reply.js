// Reply model
// TODO: Implement with your chosen database/ORM

export class Reply {
  constructor(data) {
    this.id = data.id
    this.threadId = data.threadId
    this.board = data.board
    this.content = data.content
    this.createdAt = data.createdAt || new Date()
  }

  // TODO: Add database methods
  // static async findByThreadId(threadId) { ... }
  // async save() { ... }
}

export default Reply

