// Vercel Serverless Function: proxies POST /api/gemini → Gemini generateContent.
// The browser never sees the API key — it lives in process.env.GEMINI_API_KEY
// configured in the Vercel project (Settings → Environment Variables).
//
// Request body  (application/json):
//   { model: "gemini-2.5-flash" | "gemini-2.5-pro", contents: [...], generationConfig: {...} }
// Response: forwards Gemini's JSON body and status code verbatim, except for
// validation/rate-limit failures which return a JSON { error: string }.

// Lift the body limit for the proxied PDF page images (~5–15 MB after JPEG @0.85).
export const config = {
  api: { bodyParser: { sizeLimit: '20mb' } },
}

const WINDOW_MS = 60 * 60 * 1000        // 1 hour
const MAX_REQ_PER_HOUR = 60             // per IP
const MAX_BODY_BYTES = 20 * 1024 * 1024 // 20 MB

// In-memory per-instance bucket. Best-effort: a cold start resets the counters,
// and traffic spread across instances under-counts, but it is enough to deflect
// a single misbehaving client. Pruned lazily on each request.
const requestCounts = new Map() // ip -> { count, resetAt }

function pruneExpired() {
  const now = Date.now()
  for (const [ip, bucket] of requestCounts.entries()) {
    if (bucket.resetAt <= now) requestCounts.delete(ip)
  }
}

function clientIp(req) {
  const xff = req.headers['x-forwarded-for']
  if (typeof xff === 'string' && xff.length) return xff.split(',')[0].trim()
  if (Array.isArray(xff) && xff.length) return String(xff[0]).split(',')[0].trim()
  return req.socket?.remoteAddress || 'unknown'
}

async function readJsonBody(req) {
  // Vercel may have already parsed JSON into req.body. Handle string/object/missing.
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string' && req.body.length) {
    try { return JSON.parse(req.body) } catch { return null }
  }
  // Fallback: stream-read (rare path; e.g. if bodyParser is disabled).
  return await new Promise((resolve, reject) => {
    let total = 0
    const chunks = []
    req.on('data', (chunk) => {
      total += chunk.length
      if (total > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Body too large'), { code: 'BODY_TOO_LARGE' }))
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))) }
      catch (e) { reject(e) }
    })
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  // CORS — permit same-origin browsers and Vercel preview URLs.
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Max-Age', '86400')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS')
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({
      error: 'Server misconfiguration: GEMINI_API_KEY is not set. Add it under Vercel → Settings → Environment Variables.',
    })
  }

  // Per-IP rate limit
  pruneExpired()
  const ip = clientIp(req)
  const now = Date.now()
  const bucket = requestCounts.get(ip)
  if (!bucket || bucket.resetAt <= now) {
    requestCounts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
  } else if (bucket.count >= MAX_REQ_PER_HOUR) {
    const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
    res.setHeader('Retry-After', String(retryAfterSec))
    return res.status(429).json({
      error: `Rate limit exceeded: ${MAX_REQ_PER_HOUR} requests per hour per IP. Try again in ${Math.ceil(retryAfterSec / 60)} min.`,
    })
  } else {
    bucket.count += 1
  }

  // Parse and validate body
  let body
  try {
    body = await readJsonBody(req)
  } catch (e) {
    if (e?.code === 'BODY_TOO_LARGE') {
      return res.status(413).json({ error: 'Request body exceeds 20MB limit.' })
    }
    return res.status(400).json({ error: 'Invalid JSON body: ' + (e?.message || 'parse failed') })
  }
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Missing or invalid request body.' })
  }
  const { model, contents, generationConfig } = body
  if (!model || typeof model !== 'string') {
    return res.status(400).json({ error: 'Missing required field: model (string).' })
  }
  if (!contents || !Array.isArray(contents)) {
    return res.status(400).json({ error: 'Missing required field: contents (array).' })
  }
  // Only allow known Gemini models — avoid being a generic Google API proxy.
  const ALLOWED_MODELS = new Set(['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'])
  if (!ALLOWED_MODELS.has(model)) {
    return res.status(400).json({ error: `Unsupported model "${model}". Allowed: ${[...ALLOWED_MODELS].join(', ')}.` })
  }

  const upstreamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, generationConfig }),
    })
    const text = await upstream.text()
    res.status(upstream.status)
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
    return res.send(text)
  } catch (err) {
    return res.status(502).json({ error: 'Upstream Gemini request failed: ' + (err?.message || 'unknown error') })
  }
}
