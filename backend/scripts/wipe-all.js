import admin from 'firebase-admin'
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sa = JSON.parse(readFileSync(path.join(__dirname, '../serviceAccountKey.json'), 'utf8'))
admin.initializeApp({ credential: admin.credential.cert(sa) })
const db = admin.firestore()

const cols = ['communities', 'threads', 'replies', 'reports', 'bans', 'warnings', 'communityMessages', 'members']
let total = 0

for (const col of cols) {
  const snap = await db.collection(col).get()
  if (snap.empty) { console.log(`  ${col}: empty`); continue }
  for (let i = 0; i < snap.docs.length; i += 500) {
    const batch = db.batch()
    snap.docs.slice(i, i + 500).forEach(d => batch.delete(d.ref))
    await batch.commit()
  }
  total += snap.docs.length
  console.log(`  ${col}: deleted ${snap.docs.length}`)
}

console.log(`\nDONE - deleted ${total} total documents`)
process.exit(0)
