/**
 * DANGER: Wipes all threads, replies, reports, and bans from Firestore.
 * Communities and user profiles are PRESERVED.
 * Run with: node backend/scripts/wipe-content.js
 */
import admin from 'firebase-admin'
import { readFileSync } from 'fs'
import { createRequire } from 'module'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load service account
const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json')
let serviceAccount
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))
} catch {
  console.error('firebase-service-account.json not found. Please ensure it exists at backend/firebase-service-account.json')
  process.exit(1)
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const db = admin.firestore()

const deleteCollection = async (collectionName) => {
  const snap = await db.collection(collectionName).get()
  if (snap.empty) {
    console.log(`  ${collectionName}: empty (skipped)`)
    return 0
  }
  
  // Delete in batches of 500
  let deleted = 0
  const chunks = []
  for (let i = 0; i < snap.docs.length; i += 500) {
    chunks.push(snap.docs.slice(i, i + 500))
  }
  
  for (const chunk of chunks) {
    const batch = db.batch()
    chunk.forEach(doc => batch.delete(doc.ref))
    await batch.commit()
    deleted += chunk.length
  }
  
  console.log(`  ${collectionName}: deleted ${deleted} documents`)
  return deleted
}

const resetCommunityCounts = async () => {
  const snap = await db.collection('communities').get()
  if (snap.empty) return
  
  const batches = []
  const docs = snap.docs
  for (let i = 0; i < docs.length; i += 500) {
    const batch = db.batch()
    docs.slice(i, i + 500).forEach(doc => {
      batch.update(doc.ref, {
        messageCount: 0,
        uniqueUsersCount: 0,
        lastMessageAt: null,
      })
    })
    batches.push(batch.commit())
  }
  await Promise.all(batches)
  console.log(`  communities: reset ${docs.length} message counts`)
}

const main = async () => {
  console.log('\n=== CoinTalk Content Wipe ===')
  console.log('Deleting all threads, replies, reports, bans...\n')

  const collections = ['threads', 'replies', 'reports', 'bans', 'warnings', 'communityMessages']
  
  let total = 0
  for (const col of collections) {
    total += await deleteCollection(col)
  }

  await resetCommunityCounts()

  console.log(`\nDone! Deleted ${total} total documents.`)
  console.log('Communities and user profiles preserved.')
  process.exit(0)
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
