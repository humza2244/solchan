import 'dotenv/config'
import { query, connectDatabase } from './database.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Read schema files
const schemaV2SQL = fs.readFileSync(path.join(__dirname, 'schema_v2.sql'), 'utf8')
// Use safe schema that doesn't drop existing data
const schemaV3SQL = fs.readFileSync(path.join(__dirname, 'schema_safe.sql'), 'utf8')
// Add threads schema for 4chan-style threading
const threadsSQL = fs.readFileSync(path.join(__dirname, 'schema_threads.sql'), 'utf8')
// Add KOTH tracking (temporarily disabled to avoid timeout issues)
// const kothSQL = fs.readFileSync(path.join(__dirname, 'schema_koth.sql'), 'utf8')
const schemaSQL = schemaV2SQL + '\n\n' + schemaV3SQL + '\n\n' + threadsSQL // + '\n\n' + kothSQL

export const migrate = async () => {
  try {
    console.log('🔄 Running database migrations...')
    console.log('📂 Loading schema files...')
    
    // Connect to database
    await connectDatabase()
    console.log('✅ Connected to database for migrations')
    
    // Execute the entire schema as one statement
    // This handles functions and triggers properly
    try {
      console.log('📝 Executing schema SQL...')
      await query(schemaSQL)
      console.log('✅ Database migrations completed successfully')
    } catch (error) {
      // If executing as one fails, try the old method but with better parsing
      console.log('⚠️  Single query failed, trying alternative migration method...')
      console.log('Error was:', error.message)
      
      // Better SQL statement splitting that handles functions
      const statements = []
      let currentStatement = ''
      let inFunction = false
      
      const lines = schemaSQL.split('\n')
      
      for (const line of lines) {
        const trimmedLine = line.trim()
        
        // Skip comments and empty lines
        if (trimmedLine.startsWith('--') || trimmedLine === '') {
          continue
        }
        
        currentStatement += line + '\n'
        
        // Check if we're entering a function
        if (trimmedLine.includes('CREATE OR REPLACE FUNCTION') || trimmedLine.includes('CREATE FUNCTION')) {
          inFunction = true
        }
        
        // Check if we're ending a function
        if (inFunction && trimmedLine.includes('$$ LANGUAGE')) {
          inFunction = false
          statements.push(currentStatement.trim())
          currentStatement = ''
          continue
        }
        
        // If not in function and line ends with semicolon, it's end of statement
        if (!inFunction && trimmedLine.endsWith(';')) {
          statements.push(currentStatement.trim())
          currentStatement = ''
        }
      }
      
      // Add any remaining statement
      if (currentStatement.trim()) {
        statements.push(currentStatement.trim())
      }
      
      console.log(`📊 Executing ${statements.length} statements...`)
      
      // Execute each statement
      let successCount = 0
      let skipCount = 0
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await query(statement)
            successCount++
          } catch (error) {
            // Ignore errors for objects that already exist
            // PostgreSQL error codes: 42710 = duplicate_object, 42P07 = duplicate_table
            const isDuplicateError = 
              error.code === '42710' || // Duplicate object (trigger, function, etc.)
              error.code === '42P07' || // Duplicate table
              error.code === '42701' || // Duplicate column
              error.message?.toLowerCase().includes('already exists') ||
              error.message?.toLowerCase().includes('duplicate')
            
            if (!isDuplicateError) {
              console.error('❌ Migration error:', error.message)
              console.error('Statement:', statement.substring(0, 100) + '...')
              throw error
            }
            // Silently skip duplicate errors (idempotent migrations)
            skipCount++
          }
        }
      }
      
      console.log(`✅ Database migrations completed: ${successCount} executed, ${skipCount} skipped (already exist)`)
    }
  } catch (error) {
    console.error('❌ Migration failed:', error)
    console.error('Stack:', error.stack)
    throw error
  }
}

// Run migrations if this file is executed directly
// Check if this file is being run directly (not imported)
const isMainModule = process.argv[1] && (
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/')) ||
  import.meta.url.includes(process.argv[1].replace(/\\/g, '/'))
)

if (isMainModule) {
  migrate()
    .then(() => {
      console.log('Migration script completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Migration script failed:', error)
      process.exit(1)
    })
}

export default migrate

