// Thread model
// TODO: Implement with your chosen database/ORM
// Examples: Mongoose (MongoDB), Sequelize (SQL), Prisma, etc.

export class Thread {
  constructor(data) {
    this.id = data.id
    this.board = data.board
    this.subject = data.subject
    this.content = data.content
    this.replyCount = data.replyCount || 0
    this.createdAt = data.createdAt || new Date()
  }

  // TODO: Add database methods
  // static async findById(id) { ... }
  // static async findByBoard(board) { ... }
  // async save() { ... }
}

export default Thread

