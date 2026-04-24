import https from 'https'
import http from 'http'

const BASE = 'https://solchan-backend-zup0.onrender.com'
const CONCURRENT = 50
const TOTAL_REQUESTS = 500

const endpoints = [
  '/api/communities',
  '/api/communities/koth',
]

let completed = 0
let failed = 0
let totalTime = 0
const latencies = []
const startTime = Date.now()

function makeRequest(endpoint) {
  return new Promise((resolve) => {
    const start = Date.now()
    const url = new URL(endpoint, BASE)
    const mod = url.protocol === 'https:' ? https : http
    
    const req = mod.get(url.toString(), (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        const elapsed = Date.now() - start
        latencies.push(elapsed)
        totalTime += elapsed
        if (res.statusCode >= 200 && res.statusCode < 400) {
          completed++
        } else {
          failed++
          console.error(`  [${res.statusCode}] ${endpoint}`)
        }
        resolve()
      })
    })
    
    req.on('error', (err) => {
      failed++
      const elapsed = Date.now() - start
      latencies.push(elapsed)
      totalTime += elapsed
      resolve()
    })
    
    req.setTimeout(10000, () => {
      failed++
      req.destroy()
      resolve()
    })
  })
}

async function runBatch(batchSize) {
  const promises = []
  for (let i = 0; i < batchSize; i++) {
    const ep = endpoints[Math.floor(Math.random() * endpoints.length)]
    promises.push(makeRequest(ep))
  }
  await Promise.all(promises)
}

async function main() {
  console.log(`🔥 Stress test: ${TOTAL_REQUESTS} requests, ${CONCURRENT} concurrent`)
  console.log(`   Target: ${BASE}`)
  console.log('')
  
  let sent = 0
  while (sent < TOTAL_REQUESTS) {
    const batch = Math.min(CONCURRENT, TOTAL_REQUESTS - sent)
    await runBatch(batch)
    sent += batch
    process.stdout.write(`  Progress: ${sent}/${TOTAL_REQUESTS} (${completed} ok, ${failed} fail)\r`)
  }
  
  console.log('')
  console.log('')
  
  latencies.sort((a, b) => a - b)
  const p50 = latencies[Math.floor(latencies.length * 0.5)]
  const p95 = latencies[Math.floor(latencies.length * 0.95)]
  const p99 = latencies[Math.floor(latencies.length * 0.99)]
  const avg = Math.round(totalTime / latencies.length)
  const wallTime = Date.now() - startTime
  const rps = Math.round((completed / wallTime) * 1000)
  
  console.log('📊 Results:')
  console.log(`   Total:     ${completed + failed} requests`)
  console.log(`   Success:   ${completed}`)
  console.log(`   Failed:    ${failed}`)
  console.log(`   Wall time: ${(wallTime / 1000).toFixed(1)}s`)
  console.log(`   RPS:       ~${rps}`)
  console.log(`   Avg:       ${avg}ms`)
  console.log(`   P50:       ${p50}ms`)
  console.log(`   P95:       ${p95}ms`)
  console.log(`   P99:       ${p99}ms`)
  
  if (failed > TOTAL_REQUESTS * 0.05) {
    console.log('\n❌ FAIL: Error rate > 5%')
    process.exit(1)
  } else if (p95 > 5000) {
    console.log('\n⚠️  WARN: P95 latency > 5s')
  } else {
    console.log('\n✅ PASS: Backend is handling load well')
  }
}

main()
