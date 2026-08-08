import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const DIST = join(ROOT, 'dist')
const INDEX_FILE = join(DIST, 'index.html')
const PORT = Number.parseInt(process.env.PORT ?? '8080', 10)
const HOST = process.env.HOST ?? '0.0.0.0'
const UPSTREAM_ENDPOINT = 'https://economic-calendar.tradingview.com/events'
const MAX_RANGE_MS = 10 * 24 * 60 * 60 * 1000
const CACHE_TTL_MS = 30_000
const RATE_WINDOW_MS = 60_000
const RATE_LIMIT = 90

const responseCache = new Map()
const requestBuckets = new Map()

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

const setSecurityHeaders = response => {
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('X-Frame-Options', 'DENY')
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
}

const sendJson = (response, statusCode, payload, headers = {}) => {
  const body = JSON.stringify(payload)
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...headers,
  })
  response.end(body)
}

const clientAddress = request => {
  const forwarded = request.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim()
  return request.socket.remoteAddress ?? 'unknown'
}

const withinRateLimit = request => {
  const now = Date.now()
  const key = clientAddress(request)
  const current = requestBuckets.get(key)

  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    requestBuckets.set(key, { count: 1, startedAt: now })
    return true
  }

  current.count += 1
  return current.count <= RATE_LIMIT
}

const validDate = value => Boolean(value) && Number.isFinite(new Date(value).getTime())

const handleEconomicCalendar = async (request, response, url) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD')
    sendJson(response, 405, { status: 'error', message: 'Method not allowed' })
    return
  }

  if (!withinRateLimit(request)) {
    sendJson(response, 429, { status: 'error', message: 'Too many calendar requests' }, {
      'Retry-After': '60',
      'Cache-Control': 'no-store',
    })
    return
  }

  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  if (!validDate(from) || !validDate(to)) {
    sendJson(response, 400, { status: 'error', message: 'Invalid calendar date range' })
    return
  }

  const fromTime = new Date(from).getTime()
  const toTime = new Date(to).getTime()
  if (toTime < fromTime || toTime - fromTime > MAX_RANGE_MS) {
    sendJson(response, 400, { status: 'error', message: 'Calendar range exceeds 10 days' })
    return
  }

  const params = new URLSearchParams({
    from: new Date(fromTime).toISOString(),
    to: new Date(toTime).toISOString(),
    countries: 'US',
  })
  const cacheKey = params.toString()
  const cached = responseCache.get(cacheKey)

  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    sendJson(response, 200, cached.payload, { 'Cache-Control': 'public, max-age=15' })
    return
  }

  try {
    const upstreamResponse = await fetch(`${UPSTREAM_ENDPOINT}?${cacheKey}`, {
      headers: {
        Accept: 'application/json',
        Origin: 'https://www.tradingview.com',
        Referer: 'https://www.tradingview.com/',
        'User-Agent': 'Mozilla/5.0 (compatible; HY-Freedom-OS/1.0)',
      },
      signal: AbortSignal.timeout(10_000),
    })

    if (!upstreamResponse.ok) throw new Error(`Upstream response ${upstreamResponse.status}`)
    const payload = await upstreamResponse.json()
    responseCache.set(cacheKey, { createdAt: Date.now(), payload })
    sendJson(response, 200, payload, { 'Cache-Control': 'public, max-age=15' })
  } catch (error) {
    sendJson(response, 502, {
      status: 'error',
      message: error instanceof Error ? error.message : 'Economic calendar upstream unavailable',
    }, { 'Cache-Control': 'no-store' })
  }
}

const safeStaticPath = pathname => {
  let decoded
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return null
  }

  const relative = normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, '').replace(/^[/\\]+/, '')
  const path = join(DIST, relative)
  return path.startsWith(`${DIST}/`) || path === DIST ? path : null
}

const serveFile = (request, response, path, cacheControl) => {
  const size = statSync(path).size
  response.writeHead(200, {
    'Content-Type': MIME_TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream',
    'Content-Length': size,
    'Cache-Control': cacheControl,
  })

  if (request.method === 'HEAD') {
    response.end()
    return
  }
  createReadStream(path).pipe(response)
}

if (!existsSync(INDEX_FILE)) {
  console.error('Freedom OS production build not found. Run npm run build first.')
  process.exit(1)
}

const server = createServer(async (request, response) => {
  setSecurityHeaders(response)
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)

  if (url.pathname === '/healthz') {
    sendJson(response, 200, { status: 'ok', service: 'freedom-os' }, { 'Cache-Control': 'no-store' })
    return
  }

  if (url.pathname === '/api/economic-calendar') {
    await handleEconomicCalendar(request, response, url)
    return
  }

  if (url.pathname.startsWith('/api/')) {
    sendJson(response, 404, { status: 'error', message: 'API endpoint not found' })
    return
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' })
    response.end('Method not allowed')
    return
  }

  const candidate = safeStaticPath(url.pathname)
  if (candidate && existsSync(candidate) && statSync(candidate).isFile()) {
    const immutable = url.pathname.startsWith('/assets/')
    const noCache = url.pathname === '/sw.js' || url.pathname === '/index.html'
    serveFile(request, response, candidate,
      immutable ? 'public, max-age=31536000, immutable' : noCache ? 'no-cache' : 'public, max-age=3600')
    return
  }

  // Vue Router uses history mode, so all non-file routes return the app shell.
  serveFile(request, response, INDEX_FILE, 'no-cache')
})

server.listen(PORT, HOST, () => {
  console.log(`Freedom OS listening on ${HOST}:${PORT}`)
})

const shutdown = signal => {
  console.log(`${signal} received; closing Freedom OS.`)
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 10_000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
