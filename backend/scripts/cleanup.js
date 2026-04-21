/**
 * Cleanup script: Delete all communities, threads, replies, and CTO requests from Firestore
 * Run with: node backend/scripts/cleanup.js
 */
import admin from 'firebase-admin'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let serviceAccount = null

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
} else {
  const keyPath = path.join(__dirname, '../serviceAccountKey.json')
  if (existsSync(keyPath)) {
    serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'))
  }
}

if (!serviceAccount) {
  console.error('No Firebase credentials found')
  process.exit(1)
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
const db = admin.firestore()

const deleteCollection = async (name) => {
  const snap = await db.collection(name).get()
  if (snap.empty) {
    console.log(`  ${name}: empty (nothing to delete)`)
    return 0
  }
  
  const batch = db.batch()
  snap.docs.forEach(doc => batch.delete(doc.ref))
  await batch.commit()
  console.log(`  ${name}: deleted ${snap.size} documents`)
  return snap.size
}

const main = async () => {
  console.log('Cleaning up Firestore...\n')
  
  let total = 0
  total += await deleteCollection('communities')
  total += await deleteCollection('threads')
  total += await deleteCollection('replies')
  total += await deleteCollection('ctoRequests')
  total += await deleteCollection('communityMembers')
  
  console.log(`\nDone. Deleted ${total} total documents.`)
  process.exit(0)
}

main().catch(err => {
  console.error('Cleanup failed:', err.message)
  process.exit(1)
})
