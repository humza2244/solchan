/**
 * CoinTalk PRODUCTION Stress Test
 * Hits the live backend with concurrent HTTP + WebSocket load
 * Simulates real user patterns at scale
 */

import https from 'https'
import http from 'http'
import { io as ioClient } from 'socket.io-client'

const PROD_URL = 'https://solchan-backend-zup0.onrender.com'
const API = `${PROD_URL}/api`

const results = { passed: 0, failed: 0, warnings: 0 }
const timings = []

const log = (status, name, detail = '') => {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️'
  console.log(`  ${icon} ${name}${detail ? ` — ${detail}` : ''}`)
  if (status === 'PASS') results.passed++
  else if (status === 'FAIL') results.failed++
  else results.warnings++
}

const httpGet = (path, timeoutMs = 15000) => new Promise((resolve, reject) => {
  const start = Date.now()
  const url = new URL(`${API}${path}`)
  const client = url.protocol === 'https:' ? https : http
  const req = client.get(url.toString(), (res) => {
    let data = ''
    res.on('data', chunk => data += chunk)
    res.on('end', () => {
      const elapsed = Date.now() - start
      timings.push({ path, elapsed, status: res.statusCode })
      try { resolve({ status: res.statusCode, data: JSON.parse(data), elapsed, headers: res.headers }) }
      catch { resolve({ status: res.statusCode, data, elapsed, headers: res.headers }) }
    })
  })
  req.on('error', (e) => { timings.push({ path, elapsed: Date.now() - start, status: 0 }); reject(e) })
  req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('Timeout')) })
})

const httpPost = (path, body, timeoutMs = 15000) => new Promise((resolve, reject) => {
  const start = Date.now()
  const postData = JSON.stringify(body)
  const url = new URL(`${API}${path}`)
  const client = url.protocol === 'https:' ? https : http
  const req = client.request({
    hostname: url.hostname, port: url.port || 443, path: url.pathname,
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
  }, (res) => {
    let data = ''
    res.on('data', chunk => data += chunk)
    res.on('end', () => {
      const elapsed = Date.now() - start
      timings.push({ path, elapsed, status: res.statusCode })
      try { resolve({ status: res.statusCode, data: JSON.parse(data), elapsed }) }
      catch { resolve({ status: res.statusCode, data, elapsed }) }
    })
  })
  req.on('error', (e) => { timings.push({ path, elapsed: Date.now() - start, status: 0 }); reject(e) })
  req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('Timeout')) })
  req.write(postData)
  req.end()
})

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// ═══════════════════════════════════════════════════════════════
// PHASE 1: Endpoint Verification
// ═══════════════════════════════════════════════════════════════
async function phase1_endpoints() {
  console.log('\n━━━ PHASE 1: Endpoint Verification ━━━')

  const endpoints = [
    ['/health', 'Health'],
    ['/stats', 'Stats'],
    ['/communities?popular=true&limit=10', 'Popular communities'],
    ['/communities?recent=true&limit=10', 'Recent communities'],
    ['/communities/koth', 'King of the Hill'],
    ['/communities/search?q=sol', 'Search'],
  ]

  for (const [path, name] of endpoints) {
    try {
      const res = await httpGet(path)
      log(res.status === 200 ? 'PASS' : 'WARN', name, `${res.status} in ${res.elapsed}ms`)
    } catch (e) {
      log('FAIL', name, e.message)
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// PHASE 2: Input Validation & Security
// ═══════════════════════════════════════════════════════════════
async function phase2_security() {
  console.log('\n━━━ PHASE 2: Security & Validation ━━━')

  // Empty search
  try {
    const r = await httpGet('/communities/search?q=')
    log(r.status === 400 ? 'PASS' : 'FAIL', 'Empty search rejected', `status=${r.status}`)
  } catch (e) { log('FAIL', 'Empty search', e.message) }

  // Oversized search
  try {
    const r = await httpGet(`/communities/search?q=${'A'.repeat(300)}`)
    log(r.status === 400 ? 'PASS' : 'FAIL', 'Oversized search rejected', `status=${r.status}`)
  } catch (e) { log('FAIL', 'Oversized search', e.message) }

  // XSS attempt
  try {
    const r = await httpGet('/communities/search?q=%3Cscript%3Ealert(1)%3C/script%3E')
    log(r.status !== 500 ? 'PASS' : 'FAIL', 'XSS attempt handled', `status=${r.status}`)
  } catch (e) { log('PASS', 'XSS attempt blocked', e.message) }

  // SQL injection attempt
  try {
    const r = await httpGet("/communities/search?q='; DROP TABLE communities; --")
    log(r.status !== 500 ? 'PASS' : 'FAIL', 'SQL injection handled', `status=${r.status}`)
  } catch (e) { log('PASS', 'SQL injection blocked', e.message) }

  // Invalid community ID
  try {
    const r = await httpGet('/communities/nonexistent-fake-id-12345')
    log(r.status === 404 ? 'PASS' : 'FAIL', 'Invalid community → 404', `status=${r.status}`)
  } catch (e) { log('FAIL', 'Invalid community handling', e.message) }

  // Invalid thread ID
  try {
    const r = await httpGet('/threads/nonexistent-fake-thread-12345')
    log(r.status === 404 ? 'PASS' : 'FAIL', 'Invalid thread → 404', `status=${r.status}`)
  } catch (e) { log('FAIL', 'Invalid thread handling', e.message) }

  // Missing required fields on create
  try {
    const r = await httpPost('/communities', { ticker: 'TEST' })
    log(r.status === 400 || r.status === 401 ? 'PASS' : 'FAIL', 'Missing fields rejected', `status=${r.status}`)
  } catch (e) { log('FAIL', 'Missing fields validation', e.message) }
}

// ═══════════════════════════════════════════════════════════════
// PHASE 3: Concurrent HTTP Load
// ═══════════════════════════════════════════════════════════════
async function phase3_httpLoad() {
  console.log('\n━━━ PHASE 3: Concurrent HTTP Load ━━━')

  // Wave 1: 50 concurrent reads
  const start50 = Date.now()
  const wave1 = await Promise.all(
    Array.from({ length: 50 }, (_, i) =>
      httpGet(`/communities?popular=true&limit=5`)
        .then(r => ({ ok: r.status === 200, status: r.status, elapsed: r.elapsed }))
        .catch(() => ({ ok: false, status: 0, elapsed: Date.now() - start50 }))
    )
  )
  const ok50 = wave1.filter(r => r.ok).length
  const rate50 = wave1.filter(r => r.status === 429).length
  const avg50 = Math.round(wave1.reduce((s, r) => s + r.elapsed, 0) / wave1.length)
  log(ok50 > 30 ? 'PASS' : ok50 > 0 ? 'WARN' : 'FAIL',
    `50 concurrent GETs`, `${ok50} OK, ${rate50} rate-limited, avg ${avg50}ms`)

  await sleep(2000) // cooldown for rate limiter

  // Wave 2: 100 concurrent reads
  const start100 = Date.now()
  const wave2 = await Promise.all(
    Array.from({ length: 100 }, (_, i) =>
      httpGet(`/stats`)
        .then(r => ({ ok: r.status === 200, status: r.status, elapsed: r.elapsed }))
        .catch(() => ({ ok: false, status: 0, elapsed: Date.now() - start100 }))
    )
  )
  const ok100 = wave2.filter(r => r.ok).length
  const rate100 = wave2.filter(r => r.status === 429).length
  const avg100 = Math.round(wave2.reduce((s, r) => s + r.elapsed, 0) / wave2.length)
  log(ok100 > 50 ? 'PASS' : ok100 > 0 ? 'WARN' : 'FAIL',
    `100 concurrent GETs`, `${ok100} OK, ${rate100} rate-limited, avg ${avg100}ms`)

  await sleep(2000)

  // Wave 3: 200 concurrent reads (sustained burst)
  const start200 = Date.now()
  const wave3 = await Promise.all(
    Array.from({ length: 200 }, (_, i) =>
      httpGet(`/health`)
        .then(r => ({ ok: r.status === 200, status: r.status, elapsed: r.elapsed }))
        .catch(() => ({ ok: false, status: 0, elapsed: Date.now() - start200 }))
    )
  )
  const ok200 = wave3.filter(r => r.ok).length
  const rate200 = wave3.filter(r => r.status === 429).length
  const totalTime200 = Date.now() - start200
  log(ok200 > 100 ? 'PASS' : ok200 > 0 ? 'WARN' : 'FAIL',
    `200 concurrent GETs`, `${ok200} OK, ${rate200} rate-limited, total ${totalTime200}ms`)
}

// ═══════════════════════════════════════════════════════════════
// PHASE 4: WebSocket Stress
// ═══════════════════════════════════════════════════════════════
async function phase4_websocket() {
  console.log('\n━━━ PHASE 4: WebSocket Connections ━━━')

  // Single connection test
  try {
    const s = ioClient(PROD_URL, { transports: ['websocket'], timeout: 10000 })
    await new Promise((resolve, reject) => {
      s.on('connect', resolve)
      s.on('connect_error', reject)
      setTimeout(() => reject(new Error('Timeout')), 10000)
    })
    log('PASS', 'Single WebSocket', `id=${s.id}`)
    s.disconnect()
  } catch (e) {
    log('FAIL', 'Single WebSocket', e.message)
  }

  await sleep(1000)

  // 50 concurrent connections
  let sockets = []
  let connected = 0
  try {
    const start = Date.now()
    const promises = Array.from({ length: 50 }, () => {
      const s = ioClient(PROD_URL, { transports: ['websocket'], timeout: 10000, forceNew: true })
      sockets.push(s)
      return new Promise((resolve, reject) => {
        s.on('connect', () => { connected++; resolve() })
        s.on('connect_error', (e) => reject(e))
        setTimeout(() => reject(new Error('Timeout')), 12000)
      })
    })
    await Promise.allSettled(promises)
    const elapsed = Date.now() - start
    log(connected >= 40 ? 'PASS' : connected >= 20 ? 'WARN' : 'FAIL',
      `50 concurrent WebSockets`, `${connected}/50 connected in ${elapsed}ms`)
  } catch (e) {
    log('FAIL', '50 concurrent WebSockets', `${connected}/50 — ${e.message}`)
  }

  // Room join test — all sockets join a room
  let roomJoined = 0
  for (const s of sockets) {
    if (s.connected) {
      s.emit('join-community', 'stress-test-room')
      roomJoined++
    }
  }
  log(roomJoined > 0 ? 'PASS' : 'WARN', `Room join broadcast`, `${roomJoined} sockets joined room`)

  await sleep(2000)

  // 100 concurrent connections
  let sockets100 = []
  let connected100 = 0
  try {
    const start = Date.now()
    const promises = Array.from({ length: 100 }, () => {
      const s = ioClient(PROD_URL, { transports: ['websocket'], timeout: 12000, forceNew: true })
      sockets100.push(s)
      return new Promise((resolve, reject) => {
        s.on('connect', () => { connected100++; resolve() })
        s.on('connect_error', (e) => reject(e))
        setTimeout(() => reject(new Error('Timeout')), 15000)
      })
    })
    await Promise.allSettled(promises)
    const elapsed = Date.now() - start
    log(connected100 >= 80 ? 'PASS' : connected100 >= 50 ? 'WARN' : 'FAIL',
      `100 concurrent WebSockets`, `${connected100}/100 connected in ${elapsed}ms`)
  } catch (e) {
    log('FAIL', '100 concurrent WebSockets', `${connected100}/100 — ${e.message}`)
  }

  // Cleanup all sockets
  for (const s of [...sockets, ...sockets100]) { try { s.disconnect() } catch {} }
  await sleep(1000)
}

// ═══════════════════════════════════════════════════════════════
// PHASE 5: Rate Limiting Verification
// ═══════════════════════════════════════════════════════════════
async function phase5_rateLimiting() {
  console.log('\n━━━ PHASE 5: Rate Limiting ━━━')

  // Rapid write attempts (should get rate-limited after ~30)
  let writeOk = 0
  let writeLimited = 0
  let writeErr = 0
  for (let i = 0; i < 50; i++) {
    try {
      const r = await httpPost('/communities', {
        ticker: `SPAM${i}`, coinName: `Spam Coin ${i}`, contractAddress: `fake${i}`
      })
      if (r.status === 429) writeLimited++
      else if (r.status >= 200 && r.status < 300) writeOk++
      else writeErr++
    } catch { writeErr++ }
  }
  log(writeLimited > 0 ? 'PASS' : 'WARN',
    'Write rate limiting', `${writeOk} OK, ${writeLimited} rate-limited, ${writeErr} rejected`)

  await sleep(2000)

  // WebSocket spam test
  try {
    const s = ioClient(PROD_URL, { transports: ['websocket'], timeout: 10000 })
    await new Promise((resolve, reject) => {
      s.on('connect', resolve)
      s.on('connect_error', reject)
      setTimeout(() => reject(new Error('Timeout')), 10000)
    })

    let errorCount = 0
    s.on('error', () => errorCount++)

    // Blast 20 messages rapidly (limit is 5/10s)
    for (let i = 0; i < 20; i++) {
      s.emit('new-message', {
        communityId: 'stress-test',
        content: `Spam message ${i} ${Date.now()}`,
        author: 'StressBot'
      })
    }
    await sleep(2000)
    log(errorCount > 0 ? 'PASS' : 'WARN',
      'WebSocket spam blocked', `${errorCount} messages rejected`)
    s.disconnect()
  } catch (e) {
    log('WARN', 'WebSocket spam test', e.message)
  }
}

// ═══════════════════════════════════════════════════════════════
// PHASE 6: Sustained Load (simulates real traffic pattern)
// ═══════════════════════════════════════════════════════════════
async function phase6_sustained() {
  console.log('\n━━━ PHASE 6: Sustained Load (30s) ━━━')

  const duration = 30_000
  const start = Date.now()
  let totalRequests = 0
  let successCount = 0
  let errorCount = 0
  let rateLimited = 0

  const endpoints = ['/health', '/stats', '/communities?popular=true&limit=5', '/communities?recent=true&limit=5']

  // Send 10 concurrent requests every 500ms for 30 seconds
  while (Date.now() - start < duration) {
    const batch = Array.from({ length: 10 }, () => {
      const path = endpoints[Math.floor(Math.random() * endpoints.length)]
      totalRequests++
      return httpGet(path, 10000)
        .then(r => { if (r.status === 200) successCount++; else if (r.status === 429) rateLimited++; else errorCount++ })
        .catch(() => errorCount++)
    })
    await Promise.all(batch)
    await sleep(500)
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  const rps = (totalRequests / (elapsed)).toFixed(1)

  log(successCount > totalRequests * 0.5 ? 'PASS' : 'WARN',
    `Sustained load: ${elapsed}s`, `${totalRequests} total, ${successCount} OK, ${rateLimited} rate-limited, ${errorCount} errors, ~${rps} req/s`)
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log('╔═══════════════════════════════════════════════╗')
  console.log('║  COINTALK PRODUCTION STRESS TEST               ║')
  console.log('╚═══════════════════════════════════════════════╝')
  console.log(`  Target:  ${PROD_URL}`)
  console.log(`  Time:    ${new Date().toLocaleString()}`)

  // Warmup ping
  try {
    const warmup = await httpGet('/health')
    console.log(`  Warmup:  ${warmup.elapsed}ms (${warmup.status})`)
  } catch {
    console.error('\n❌ Server not reachable at', PROD_URL)
    process.exit(1)
  }

  await phase1_endpoints()
  await phase2_security()
  await phase3_httpLoad()
  await phase4_websocket()
  await phase5_rateLimiting()
  await phase6_sustained()

  // Timing summary
  console.log('\n━━━ TIMING SUMMARY ━━━')
  const byPath = {}
  for (const t of timings) {
    const key = t.path.split('?')[0]
    if (!byPath[key]) byPath[key] = []
    byPath[key].push(t.elapsed)
  }
  for (const [path, times] of Object.entries(byPath)) {
    const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length)
    const max = Math.max(...times)
    const min = Math.min(...times)
    const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)] || max
    console.log(`  ${path.padEnd(40)} avg=${avg}ms  p95=${p95}ms  min=${min}ms  max=${max}ms  (${times.length} reqs)`)
  }

  // Final
  console.log('\n╔═══════════════════════════════════════════════╗')
  console.log(`║  RESULTS: ${String(results.passed).padStart(2)} passed, ${String(results.failed).padStart(2)} failed, ${String(results.warnings).padStart(2)} warnings     ║`)
  console.log('╚═══════════════════════════════════════════════╝')

  if (results.failed > 0) {
    console.log('\n❌ SOME TESTS FAILED — review above')
  } else if (results.warnings > 2) {
    console.log('\n⚠️  Tests passed with warnings — review above')
  } else {
    console.log('\n🚀 ALL CLEAR — production is battle-ready!')
  }

  process.exit(results.failed > 0 ? 1 : 0)
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
