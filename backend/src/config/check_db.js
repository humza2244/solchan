import 'dotenv/config'
import { query, connectDatabase } from './database.js'

const checkDatabase = async () => {
  try {
    await connectDatabase()
    
    const result = await query(`
      SELECT 'Communities' as table_name, COUNT(*) as count FROM communities
      UNION ALL
      SELECT 'Threads', COUNT(*) FROM threads
      UNION ALL
      SELECT 'Replies', COUNT(*) FROM replies
      UNION ALL
      SELECT 'Messages', COUNT(*) FROM messages
      UNION ALL
      SELECT 'User Profiles', COUNT(*) FROM user_profiles
    `)
    
    console.log('\n📊 Database Status:\n')
    result.rows.forEach(row => {
      console.log(`   ${row.table_name.padEnd(20)} ${row.count}`)
    })
    console.log('')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

checkDatabase()

