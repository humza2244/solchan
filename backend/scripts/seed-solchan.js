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

const COMMUNITY_ID = 'GITAKJ5UCkD2KWtiXm4l'
const now = new Date()

const communityData = {
  ticker: 'SOLCHAN',
  tickerLower: 'solchan',
  coinName: 'SOLCHAN',
  coinNameLower: 'solchan',
  contractAddress: null,
  contractAddressLower: null,
  description: 'The official community for $SOLCHAN — the token behind solchan.fun, the anonymous imageboard built for sol memecoin communities. Discuss the project, share alpha, post memes, and help grow the platform.',
  imageUrl: null,
  creatorId: null,
  createdAt: now,
  messageCount: 0,
  uniqueUsersCount: 0,
  lastMessageAt: now, // set to now so CTO doesn't show immediately
  hasBeenKoth: true,  // crown it KOTH
  becameKothAt: now,
  moderators: [],
  rules: '1. No spam\n2. No doxxing\n3. Everything else goes',
  ctoStatus: null,
}

await db.collection('communities').doc(COMMUNITY_ID).set(communityData)
console.log(`✅ Created SOLCHAN community with ID: ${COMMUNITY_ID}`)
console.log(`👑 Set as King of the Hill`)
console.log(`🌐 https://solchan.fun/community/${COMMUNITY_ID}`)
process.exit(0)
