/**
 * Firebase configuration for Solchan
 * 
 * If serviceAccountKey.json exists in backend/ → uses real Cloud Firestore
 * If FIREBASE_SERVICE_ACCOUNT env var is set → uses real Cloud Firestore
 * Otherwise → falls back to persistent file-backed local store
 */

import admin from 'firebase-admin'
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let db = null
let usingRealFirebase = false

// ── FieldValue (works for both real + local) ─────────────────────
export const FieldValue = {
  increment: (n) => {
    if (usingRealFirebase) return admin.firestore.FieldValue.increment(n)
    return { _type: 'increment', _value: n }
  },
  serverTimestamp: () => {
    if (usingRealFirebase) return admin.firestore.FieldValue.serverTimestamp()
    return new Date()
  },
  delete: () => {
    if (usingRealFirebase) return admin.firestore.FieldValue.delete()
    return { _type: 'delete' }
  },
}

// ── Date helper ──────────────────────────────────────────────────
export const toDate = (value) => {
  if (!value) return null
  if (value.toDate) return value.toDate()
  if (value instanceof Date) return value
  return new Date(value)
}

// ── Initialize ───────────────────────────────────────────────────
export const initializeFirebase = () => {
  if (db) return db

  let serviceAccount = null

  // Check env var first
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    } catch (e) {
      console.error('⚠️  Invalid FIREBASE_SERVICE_ACCOUNT JSON')
    }
  }

  // Then check for file
  if (!serviceAccount) {
    const keyPath = path.join(__dirname, '../../serviceAccountKey.json')
    if (existsSync(keyPath)) {
      try {
        serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'))
      } catch (e) {
        console.error('⚠️  Invalid serviceAccountKey.json')
      }
    }
  }

  if (serviceAccount) {
    // ── Real Firebase Cloud Firestore ──
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      })
      db = admin.firestore()
      db.settings({ ignoreUndefinedProperties: true })
      usingRealFirebase = true
      console.log('🔥 Connected to Firebase Cloud Firestore')
      console.log(`   Project: ${serviceAccount.project_id}`)
      return db
    } catch (e) {
      console.error('⚠️  Firebase init failed, falling back to local store:', e.message)
    }
  }

  // ── Local file-backed store (dev fallback) ──
  db = createLocalStore()
  console.log('🔥 Persistent local Firestore initialized')
  console.log(`💾 Data file: ${DATA_FILE}`)
  return db
}

export const getDb = () => {
  if (!db) return initializeFirebase()
  return db
}

// ══════════════════════════════════════════════════════════════════
// LOCAL FILE-BACKED STORE (no Firebase credentials needed)
// ══════════════════════════════════════════════════════════════════

const DATA_FILE = path.join(__dirname, '../../data/db.json')
const dataDir = path.dirname(DATA_FILE)

let collections = new Map()

const ensureDataDir = () => {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
}

const restoreDates = (obj) => {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj)) return new Date(obj)
  if (Array.isArray(obj)) return obj.map(restoreDates)
  if (typeof obj === 'object') {
    const r = {}
    for (const [k, v] of Object.entries(obj)) r[k] = restoreDates(v)
    return r
  }
  return obj
}

const loadFromDisk = () => {
  try {
    ensureDataDir()
    if (existsSync(DATA_FILE)) {
      const raw = JSON.parse(readFileSync(DATA_FILE, 'utf8'))
      collections = new Map()
      for (const [name, docs] of Object.entries(raw)) {
        const m = new Map()
        for (const [id, data] of Object.entries(docs)) m.set(id, restoreDates(data))
        collections.set(name, m)
      }
      const total = Array.from(collections.values()).reduce((s, m) => s + m.size, 0)
      console.log(`📂 Loaded ${total} documents from disk`)
    }
  } catch (e) {
    console.error('⚠️  Error loading data:', e.message)
    collections = new Map()
  }
}

let saveTimer = null
const saveToDisk = () => {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      ensureDataDir()
      const obj = {}
      for (const [name, docs] of collections.entries()) obj[name] = Object.fromEntries(docs)
      writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2))
    } catch (e) {
      console.error('⚠️  Error saving data:', e.message)
    }
  }, 100)
}

const getCol = (name) => {
  if (!collections.has(name)) collections.set(name, new Map())
  return collections.get(name)
}

const rv = (val) => {
  if (val instanceof Date) return val.getTime()
  return val
}

class DocRef {
  constructor(col, id) { this._c = col; this._id = id }
  async get() { return new DocSnap(this._id, getCol(this._c).get(this._id) || null) }
  async set(data, opts = {}) {
    const col = getCol(this._c)
    col.set(this._id, opts.merge ? { ...(col.get(this._id) || {}), ...data } : { ...data })
    saveToDisk()
  }
  async update(data) {
    const col = getCol(this._c)
    const existing = col.get(this._id)
    if (!existing) throw new Error(`Doc ${this._c}/${this._id} not found`)
    const resolved = {}
    for (const [k, v] of Object.entries(data)) {
      if (v && v._type === 'increment') resolved[k] = (existing[k] || 0) + v._value
      else if (v && v._type === 'delete') { /* skip */ }
      else resolved[k] = v
    }
    col.set(this._id, { ...existing, ...resolved })
    saveToDisk()
  }
  async delete() { getCol(this._c).delete(this._id); saveToDisk() }
}

class DocSnap {
  constructor(id, d) { this.id = id; this._d = d; this.exists = d != null }
  data() { return this._d ? { ...this._d } : undefined }
}

class Query {
  constructor(c) { this._c = c; this._f = []; this._o = []; this._l = null }
  where(f, op, v) { const q = this._clone(); q._f.push({ f, op, v }); return q }
  orderBy(f, d = 'asc') { const q = this._clone(); q._o.push({ f, d }); return q }
  limit(n) { const q = this._clone(); q._l = n; return q }
  async get() {
    const col = getCol(this._c)
    let res = []
    for (const [id, data] of col.entries()) {
      let ok = true
      for (const { f, op, v } of this._f) {
        const dv = rv(data[f]), fv = rv(v)
        if (op === '==' && dv !== fv) ok = false
        else if (op === '!=' && dv === fv) ok = false
        else if (op === '>' && !(dv > fv)) ok = false
        else if (op === '>=' && !(dv >= fv)) ok = false
        else if (op === '<' && !(dv < fv)) ok = false
        else if (op === '<=' && !(dv <= fv)) ok = false
        else if (op === 'in' && (!Array.isArray(v) || !v.includes(data[f]))) ok = false
        if (!ok) break
      }
      if (ok) res.push(new DocSnap(id, { ...data }))
    }
    if (this._o.length) {
      res.sort((a, b) => {
        for (const { f, d } of this._o) {
          const av = rv(a.data()[f]), bv = rv(b.data()[f])
          if (av == null && bv == null) continue
          if (av == null) return d === 'asc' ? -1 : 1
          if (bv == null) return d === 'asc' ? 1 : -1
          if (av < bv) return d === 'asc' ? -1 : 1
          if (av > bv) return d === 'asc' ? 1 : -1
        }
        return 0
      })
    }
    if (this._l != null) res = res.slice(0, this._l)
    return new QSnap(res)
  }
  _clone() { const q = new Query(this._c); q._f = [...this._f]; q._o = [...this._o]; q._l = this._l; return q }
}

class QSnap {
  constructor(docs) { this.docs = docs; this.empty = !docs.length; this.size = docs.length }
  forEach(cb) { this.docs.forEach(cb) }
}

class ColRef extends Query {
  constructor(n) { super(n); this._n = n }
  doc(id) { return new DocRef(this._n, id) }
  async add(data) {
    const id = randomUUID()
    getCol(this._n).set(id, { ...data })
    saveToDisk()
    return new DocRef(this._n, id)
  }
}

class Tx {
  constructor() { this._ops = [] }
  async get(ref) { return await ref.get() }
  set(ref, data, opts) { this._ops.push(() => ref.set(data, opts)); return this }
  update(ref, data) { this._ops.push(() => ref.update(data)); return this }
  delete(ref) { this._ops.push(() => ref.delete()); return this }
  async _commit() { for (const op of this._ops) await op() }
}

class LocalFirestore {
  collection(n) { return new ColRef(n) }
  async runTransaction(fn) { const t = new Tx(); await fn(t); await t._commit() }
  settings() {}
}

const createLocalStore = () => {
  loadFromDisk()
  return new LocalFirestore()
}

export default { initializeFirebase, getDb, toDate, FieldValue }
