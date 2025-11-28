import pkg from 'pg'
const { Pool } = pkg
import dotenv from 'dotenv'

dotenv.config()

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
  statement_timeout: 30000, // Max query execution time: 30 seconds
  query_timeout: 30000, // Max time to wait for query: 30 seconds
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false // Required for Supabase pooler connections
  } : false
})

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err)
  process.exit(-1)
})

// Test database connection
export const connectDatabase = async () => {
  try {
    const client = await pool.connect()
    console.log('✅ Database connected successfully')
    client.release()
    return pool
  } catch (error) {
    console.error('❌ Database connection error:', error)
    throw error
  }
}

// Query helper function
export const query = async (text, params) => {
  const start = Date.now()
  try {
    const res = await pool.query(text, params)
    const duration = Date.now() - start
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text, duration, rows: res.rowCount })
    }
    return res
  } catch (error) {
    console.error('Database query error:', error)
    throw error
  }
}

// Get a client from the pool for transactions
export const getClient = async () => {
  const client = await pool.connect()
  const query = client.query
  const release = client.release
  
  // Set a timeout of 5 seconds, after which we will log this client's last query
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!')
    console.error(`The last executed query on this client was: ${client.lastQuery}`)
  }, 5000)
  
  // Monkey patch the query method to log the query when a client is checked out
  client.query = (...args) => {
    client.lastQuery = args
    return query.apply(client, args)
  }
  
  client.release = () => {
    // Clear our timeout
    clearTimeout(timeout)
    // Set the methods back to their old un-monkey-patched values
    client.query = query
    client.release = release
    return release.apply(client)
  }
  
  return client
}

export default {
  pool,
  connectDatabase,
  query,
  getClient,
}
