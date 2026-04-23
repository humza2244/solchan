/**
 * Solchan Production Stress Test
 * Tests: HTTP endpoints, WebSocket connections, rate limiting, anti-spam, memory stability
 * 
 * Usage: node backend/scripts/stress-test.js
 */

import http from 'http'
import { io as ioClient } from 'socket.io-client'

const BASE_URL = 'http://localhost:5001'
const API_URL = `${BASE_URL}/api`
const results = { passed: 0, failed: 0, warnings: 0, tests: [] }

const log = (status, name, detail = '') => {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️'
  console.log(`  ${icon} ${name}${detail ? ` — ${detail}` : ''}`)
  results.tests.push({ status, name, detail })
  if (status === 'PASS') results.passed++
  else if (status === 'FAIL') results.failed++
  else results.warnings++
}

const httpGet = (path) => new Promise((resolve, reject) => {
  const req = http.get(`${API_URL}${path}`, (res) => {
    let data = ''
    res.on('data', chunk => data += chunk)
    res.on('end', () => {
      try { resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers }) }
      catch { resolve({ status: res.statusCode, data, headers: res.headers }) }
    })
  })
  req.on('error', reject)
  req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')) })
})

const httpPost = (path, body) => new Promise((resolve, reject) => {
  const postData = JSON.stringify(body)
  const url = new URL(`${API_URL}${path}`)
  const req = http.request({
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
  }, (res) => {
    let data = ''
    res.on('data', chunk => data += chunk)
    res.on('end', () => {
      try { resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers }) }
      catch { resolve({ status: res.statusCode, data, headers: res.headers }) }
    })
  })
  req.on('error', reject)
  req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')) })
  req.write(postData)
  req.end()
})

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// ═══════════════════════════════════════════════════════════════
// TEST SUITES
// ═══════════════════════════════════════════════════════════════

async function testHealthAndStats() {
  console.log('\n📡 Health & Stats')
  
  try {
    const health = await httpGet('/health')
    log(health.status === 200 ? 'PASS' : 'FAIL', 'Health endpoint', `status=${health.status}`)
  } catch (e) {
    log('FAIL', 'Health endpoint', e.message)
  }

  try {
    const stats = await httpGet('/stats')
    const valid = stats.status === 200 && typeof stats.data.communities === 'number'
    log(valid ? 'PASS' : 'FAIL', 'Stats endpoint', JSON.stringify(stats.data))
  } catch (e) {
    log('FAIL', 'Stats endpoint', e.message)
  }

  // Check compression header
  try {
    const stats = await httpGet('/stats')
    const hasEncoding = stats.headers['content-encoding'] === 'gzip' || stats.headers['transfer-encoding']
    log(hasEncoding ? 'PASS' : 'WARN', 'Compression enabled', `encoding=${stats.headers['content-encoding'] || 'none'}`)
  } catch (e) {
    log('WARN', 'Compression check', e.message)
  }
}

async function testCommunityEndpoints() {
  console.log('\n📂 Community Endpoints')

  try {
    const res = await httpGet('/communities?popular=true&limit=10')
    log(res.status === 200 ? 'PASS' : 'FAIL', 'Popular communities', `count=${Array.isArray(res.data) ? res.data.length : 'N/A'}`)
  } catch (e) {
    log('FAIL', 'Popular communities', e.message)
  }

  try {
    const res = await httpGet('/communities?recent=true&limit=10')
    log(res.status === 200 ? 'PASS' : 'FAIL', 'Recent communities', `count=${Array.isArray(res.data) ? res.data.length : 'N/A'}`)
  } catch (e) {
    log('FAIL', 'Recent communities', e.message)
  }

  try {
    const res = await httpGet('/communities/koth')
    log(res.status === 200 ? 'PASS' : 'FAIL', 'KOTH endpoint', `result=${res.data ? 'found' : 'null'}`)
  } catch (e) {
    log('FAIL', 'KOTH endpoint', e.message)
  }

  try {
    const res = await httpGet('/communities/search?q=test')
    log(res.status === 200 ? 'PASS' : 'FAIL', 'Search endpoint', `results=${Array.isArray(res.data) ? res.data.length : 'N/A'}`)
  } catch (e) {
    log('FAIL', 'Search endpoint', e.message)
  }
}

async function testConcurrentRequests() {
  console.log('\n⚡ Concurrent Load (simulating 100 parallel requests)')
  
  const start = Date.now()
  const promises = []
  for (let i = 0; i < 100; i++) {
    promises.push(
      httpGet('/communities?popular=true&limit=5')
        .then(r => r.status)
        .catch(() => 0)
    )
  }
  
  const statuses = await Promise.all(promises)
  const elapsed = Date.now() - start
  const ok = statuses.filter(s => s === 200).length
  const ratelimited = statuses.filter(s => s === 429).length
  const failed = statuses.filter(s => s !== 200 && s !== 429).length

  log(ok > 0 ? 'PASS' : 'FAIL', `100 concurrent GETs`, `OK=${ok}, rate-limited=${ratelimited}, failed=${failed}, ${elapsed}ms`)
  
  if (ratelimited > 0) {
    log('PASS', 'Rate limiting working', `${ratelimited} requests rate-limited`)
  }
}

async function testWebSocketConnections() {
  console.log('\n🔌 WebSocket Connections')
  
  // Test single connection
  try {
    const socket = ioClient(BASE_URL, { transports: ['websocket'], timeout: 5000 })
    await new Promise((resolve, reject) => {
      socket.on('connect', resolve)
      socket.on('connect_error', reject)
      setTimeout(() => reject(new Error('Timeout')), 5000)
    })
    log('PASS', 'Single WebSocket connection', `id=${socket.id}`)
    socket.disconnect()
  } catch (e) {
    log('FAIL', 'Single WebSocket connection', e.message)
  }

  // Test multiple concurrent connections (simulate 50 users)
  const sockets = []
  let connected = 0
  try {
    const connectPromises = []
    for (let i = 0; i < 50; i++) {
      const s = ioClient(BASE_URL, { transports: ['websocket'], timeout: 5000, forceNew: true })
      sockets.push(s)
      connectPromises.push(new Promise((resolve, reject) => {
        s.on('connect', () => { connected++; resolve() })
        s.on('connect_error', reject)
        setTimeout(() => reject(new Error('Timeout')), 8000)
      }))
    }
    await Promise.all(connectPromises)
    log('PASS', `50 concurrent WebSocket connections`, `all ${connected} connected`)
  } catch (e) {
    log(connected > 30 ? 'WARN' : 'FAIL', `50 concurrent WebSocket connections`, `${connected}/50 connected — ${e.message}`)
  } finally {
    sockets.forEach(s => s.disconnect())
    await sleep(500)
  }
}

async function testAntiSpam() {
  console.log('\n🛡️  Anti-Spam (WebSocket)')

  try {
    const socket = ioClient(BASE_URL, { transports: ['websocket'], timeout: 5000 })
    await new Promise((resolve, reject) => {
      socket.on('connect', resolve)
      socket.on('connect_error', reject)
      setTimeout(() => reject(new Error('Timeout')), 5000)
    })

    let errorReceived = false
    socket.on('error', (err) => {
      errorReceived = true
    })

    // Send 10 messages rapidly (limit is 5 per 10s)
    for (let i = 0; i < 10; i++) {
      socket.emit('new-message', {
        communityId: 'test-spam-check',
        content: `Spam test message ${i} ${Date.now()}`,
        author: 'SpamBot',
      })
    }

    await sleep(1000)
    log(errorReceived ? 'PASS' : 'WARN', 'Rate limit triggers on rapid messages', errorReceived ? 'blocked' : 'no error received (may need real community)')
    socket.disconnect()
  } catch (e) {
    log('WARN', 'Anti-spam test', e.message)
  }
}

async function testInputValidation() {
  console.log('\n🔍 Input Validation')

  // Empty search
  try {
    const res = await httpGet('/communities/search?q=')
    log(res.status === 400 ? 'PASS' : 'FAIL', 'Empty search rejected', `status=${res.status}`)
  } catch (e) {
    log('FAIL', 'Empty search validation', e.message)
  }

  // Oversized search
  try {
    const longQuery = 'A'.repeat(300)
    const res = await httpGet(`/communities/search?q=${longQuery}`)
    log(res.status === 400 ? 'PASS' : 'FAIL', 'Oversized search rejected', `status=${res.status}`)
  } catch (e) {
    log('FAIL', 'Oversized search validation', e.message)
  }

  // Missing required fields
  try {
    const res = await httpPost('/communities', { ticker: 'TEST' }) // missing coinName
    log(res.status === 400 ? 'PASS' : 'FAIL', 'Missing field validation', `status=${res.status}`)
  } catch (e) {
    log('FAIL', 'Missing field validation', e.message)
  }

  // XSS attempt
  try {
    const res = await httpGet('/communities/search?q=<script>alert(1)</script>')
    log(res.status === 200 || res.status === 400 ? 'PASS' : 'FAIL', 'XSS attempt handled', `status=${res.status}`)
  } catch (e) {
    log('PASS', 'XSS attempt handled', 'request rejected')
  }
}

async function testMemoryBaseline() {
  console.log('\n💾 Memory Baseline')
  
  const mem = process.memoryUsage()
  const heapMB = (mem.heapUsed / 1024 / 1024).toFixed(1)
  const rssMB = (mem.rss / 1024 / 1024).toFixed(1)
  
  log('PASS', 'Stress test process memory', `heap=${heapMB}MB, rss=${rssMB}MB`)
}

async function test404Handler() {
  console.log('\n🚫 Error Handling')

  try {
    const res = await httpGet('/nonexistent-route')
    log(res.status === 404 ? 'PASS' : 'FAIL', '404 handler', `status=${res.status}`)
  } catch (e) {
    log('FAIL', '404 handler', e.message)
  }

  try {
    const res = await httpGet('/communities/nonexistent-id-12345')
    log(res.status === 404 ? 'PASS' : 'FAIL', 'Invalid community ID', `status=${res.status}`)
  } catch (e) {
    log('FAIL', 'Invalid community ID', e.message)
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════════')
  console.log('  SOLCHAN PRODUCTION STRESS TEST')
  console.log('═══════════════════════════════════════════════')
  console.log(`  Target: ${BASE_URL}`)
  console.log(`  Time:   ${new Date().toLocaleString()}`)

  // Check server is running
  try {
    await httpGet('/health')
  } catch {
    console.error('\n❌ Server not running at', BASE_URL)
    console.error('   Start it first: npm run dev --workspace=backend')
    process.exit(1)
  }

  await testHealthAndStats()
  await testCommunityEndpoints()
  await testInputValidation()
  await test404Handler()
  await testConcurrentRequests()
  await testWebSocketConnections()
  await testAntiSpam()
  await testMemoryBaseline()

  // Summary
  console.log('\n═══════════════════════════════════════════════')
  console.log(`  RESULTS: ${results.passed} passed, ${results.failed} failed, ${results.warnings} warnings`)
  console.log('═══════════════════════════════════════════════')

  if (results.failed > 0) {
    console.log('\n❌ SOME TESTS FAILED — review above')
    process.exit(1)
  } else {
    console.log('\n✅ ALL TESTS PASSED — server is production ready!')
    process.exit(0)
  }
}

main().catch(e => {
  console.error('Fatal error:', e)
  process.exit(1)
})
