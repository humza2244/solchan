import 'dotenv/config'
import { query, connectDatabase } from './database.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const resetDatabase = async () => {
  try {
    console.log('🗑️  Resetting database...')
    console.log('⚠️  WARNING: This will delete ALL data!')
    
    // Connect to database
    await connectDatabase()
    
    // Read reset SQL
    const resetSQL = fs.readFileSync(path.join(__dirname, 'reset_database.sql'), 'utf8')
    
    // Execute reset
    const result = await query(resetSQL)
    
    console.log('✅ Database reset complete!')
    console.log('\n📊 Current state:')
    if (result.rows) {
      result.rows.forEach(row => {
        console.log(`   ${row.table_name} ${row.count}`)
      })
    }
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Reset failed:', error)
    process.exit(1)
  }
}

resetDatabase()

