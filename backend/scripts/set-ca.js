import 'dotenv/config'
import admin from 'firebase-admin'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const keyPath = path.join(__dirname, '../serviceAccountKey.json')

if (!existsSync(keyPath)) { console.error('serviceAccountKey.json not found'); process.exit(1) }

const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'))
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
const db = admin.firestore()

const COMMUNITY_ID = 'GITAKJ5UCkD2KWtiXm4l'
const CA = '25pqPuC2ATN8DSb4n3LLFHa8bmeYDDhfDzhe69SZpump'

await db.collection('communities').doc(COMMUNITY_ID).update({
  contractAddress: CA,
  contractAddressLower: CA.toLowerCase(),
})

console.log(`✅ CA set on SOLCHAN community`)
console.log(`   ${CA}`)
process.exit(0)
