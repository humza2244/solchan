import 'dotenv/config'
import admin from 'firebase-admin'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const keyPath = path.join(__dirname, '../serviceAccountKey.json')

if (!existsSync(keyPath)) {
  console.error('serviceAccountKey.json not found')
  process.exit(1)
}

const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'))
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
const db = admin.firestore()

const COLLECTIONS = [
  'communities',
  'threads',
  'replies',
  'messages',
  'counters',
  'communityMembers',
  'reports',
  'ctoRequests',
]

async function wipeCollection(name) {
  const snap = await db.collection(name).get()
  if (snap.empty) { console.log(`  ${name}: already empty`); return }
  const BATCH_SIZE = 400
  let deleted = 0
  let batch = db.batch()
  let count = 0
  for (const doc of snap.docs) {
    batch.delete(doc.ref)
    count++
    if (count >= BATCH_SIZE) {
      await batch.commit()
      deleted += count
      batch = db.batch()
      count = 0
    }
  }
  if (count > 0) { await batch.commit(); deleted += count }
  console.log(`  ${name}: deleted ${deleted} docs`)
}

console.log('Wiping all data...')
for (const col of COLLECTIONS) await wipeCollection(col)
console.log('Done. Database is clean.')
process.exit(0)
