/**
 * OSINT Bidders Detection — Foundation Utils
 *
 * Multi-tier strategy to recover the list of GCs bidding on a tender:
 *   Tier A: PDF parsing of Form of Tender / Specs (when GC was sloppy)
 *   Tier B: Public portal listings (MERX, Biddingo, Bonfire, Bids&Tenders) without login
 *   Tier C: Open web search (council reports, school board minutes, news)
 *
 * This file contains the foundation: query builders, fuzzy matching, confidence scoring.
 * Actual fetch/scraping happens in the page or via Cowork tools — these are pure functions.
 */

/* ─────────── Tier C — Search Query Builders ─────────── */

/**
 * Build OSINT search queries for a tender. Returns an array of query strings
 * that have proven useful for finding GC bidder lists in public records.
 */
export function buildOsintQueries({ projectName, owner, location, year }) {
  if (!projectName) return []
  const q = (s) => `"${s.trim()}"`
  const yr = year || new Date().getFullYear()
  const queries = []

  // Direct council/staff report searches
  queries.push(`${q(projectName)} "list of bidders"`)
  queries.push(`${q(projectName)} prequalified`)
  queries.push(`${q(projectName)} ${q('staff report')}`)
  queries.push(`${q(projectName)} ${q('council report')}`)
  queries.push(`${q(projectName)} tender award`)

  // Public procurement portals
  queries.push(`${q(projectName)} site:merx.com`)
  queries.push(`${q(projectName)} site:biddingo.com`)
  queries.push(`${q(projectName)} site:bidsandtenders.ca`)
  queries.push(`${q(projectName)} site:bonfirehub.com`)
  queries.push(`${q(projectName)} site:buyandsell.gc.ca`)

  // Municipal/regional sites
  queries.push(`${q(projectName)} site:toronto.ca`)
  queries.push(`${q(projectName)} site:peelregion.ca`)
  queries.push(`${q(projectName)} site:halton.ca`)
  queries.push(`${q(projectName)} site:york.ca`)
  queries.push(`${q(projectName)} site:mississauga.ca`)
  queries.push(`${q(projectName)} site:brampton.ca`)
  queries.push(`${q(projectName)} site:hamilton.ca`)

  // School board sites
  queries.push(`${q(projectName)} site:tdsb.on.ca`)
  queries.push(`${q(projectName)} site:tcdsb.org`)
  queries.push(`${q(projectName)} site:peelschools.org`)
  queries.push(`${q(projectName)} site:hdsb.ca`)

  // Construction industry news
  queries.push(`${q(projectName)} site:dailycommercialnews.com`)
  queries.push(`${q(projectName)} site:onsitemag.com`)

  // Owner-specific queries
  if (owner) {
    queries.push(`${q(owner)} ${q(projectName)} bidders`)
    queries.push(`${q(owner)} ${q(projectName)} contractor selection`)
  }

  // Location + project type
  if (location) {
    queries.push(`${q(projectName)} ${location} tender`)
  }

  // PDF-specific (council reports often PDFs)
  queries.push(`${q(projectName)} filetype:pdf`)

  // Year-bound recent
  queries.push(`${q(projectName)} ${yr} bidders`)

  return queries
}

/**
 * Build queries for a specific public portal's public-side search.
 */
export function buildPortalQuery(portal, { projectName, owner }) {
  const enc = encodeURIComponent
  switch (portal) {
    case 'merx':
      return `https://www.merx.com/public/solicitations/open?keywords=${enc(projectName)}`
    case 'biddingo':
      return `https://www.biddingo.com/search?q=${enc(projectName)}`
    case 'bidsandtenders':
      return `https://www.bidsandtenders.ca/Module/Tenders/en/Search?keywords=${enc(projectName)}`
    case 'bonfire':
      return `https://app.bonfirehub.com/projects/search?q=${enc(projectName)}`
    case 'buyandsell':
      return `https://buyandsell.gc.ca/procurement-data/search/site/${enc(projectName)}`
    case 'ontariobuyers':
      return `https://www.ontario.ca/page/search?query=${enc(projectName)}`
    default:
      return null
  }
}

/* ─────────── Bidders List Pattern Detection ─────────── */

/**
 * Patterns that indicate a list of bidders in PDF text or HTML.
 */
export const BIDDERS_LIST_PATTERNS = [
  /list\s+of\s+bidders/i,
  /bidders?\s+(?:for|list)/i,
  /list\s+of\s+(?:pre-?qualified|approved)\s+(?:bidders|contractors)/i,
  /prequalified\s+bidders?/i,
  /tendering\s+(?:contractors|firms)/i,
  /general\s+contractors?\s+(?:bidding|invited|listed)/i,
  /bid\s+received\s+from/i,
  /contractors?\s+submitting\s+bids?/i,
  /following\s+(?:firms|contractors|bidders)\s+(?:have|will)\s+bid/i,
]

/**
 * Given a text block, extract candidate company names that follow a "list of bidders" pattern.
 * Heuristic: after matching a header pattern, capture lines that look like company names.
 */
export function extractBiddersFromText(text) {
  if (!text || typeof text !== 'string') return []
  const candidates = []

  for (const pattern of BIDDERS_LIST_PATTERNS) {
    const match = text.match(pattern)
    if (!match) continue

    // Get text after the match — up to 3000 chars
    const idx = match.index + match[0].length
    const chunk = text.slice(idx, idx + 3000)

    // Split into lines and look for company-name-like lines
    const lines = chunk.split(/\n|;|\.(?=\s+[A-Z])/)
    for (const line of lines) {
      const cleaned = line.trim().replace(/^\d+[\.\)]\s*/, '').replace(/^[•\-\*]\s*/, '')
      if (looksLikeCompanyName(cleaned)) {
        candidates.push(cleaned)
        if (candidates.length >= 30) break
      }
    }
    if (candidates.length > 0) break
  }

  // Deduplicate (case-insensitive)
  const seen = new Set()
  return candidates.filter((c) => {
    const k = c.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/**
 * Heuristic: does this line look like a company name?
 */
function looksLikeCompanyName(line) {
  if (!line || line.length < 3 || line.length > 100) return false
  // Must start with letter
  if (!/^[A-Z]/.test(line)) return false
  // Common company suffixes
  const hasSuffix = /\b(Inc\.?|Ltd\.?|Limited|Corp\.?|Corporation|LLC|LLP|Construction|Contracting|Building|Builders?|Group|Co\.?|Company|Constructors?|Industries|Enterprises|Ironworks?|Steel|Fabricators?)\b/i.test(line)
  // Or 2+ capitalized words
  const capWords = (line.match(/\b[A-Z][a-z]+/g) || []).length
  return hasSuffix || capWords >= 2
}

/* ─────────── Fuzzy GC Matcher ─────────── */

/**
 * Normalize a GC name for comparison: lowercase, strip suffixes, remove punctuation.
 */
export function normalizeGCName(name) {
  if (!name) return ''
  return String(name)
    .toLowerCase()
    .replace(/\b(inc|ltd|limited|corp|corporation|llc|llp|construction|contracting|building|group|co|company|constructors?|industries|enterprises|the)\b\.?/gi, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Compute Levenshtein distance between two strings (for fuzzy matching).
 */
export function levenshtein(a, b) {
  if (a === b) return 0
  if (!a) return b.length
  if (!b) return a.length
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[m][n]
}

/**
 * Match a candidate name against the GC directory.
 * Returns { matched: GC|null, confidence: 0-1, normalizedQuery: string }
 */
export function matchGC(candidateName, gcDirectory) {
  if (!candidateName || !gcDirectory || gcDirectory.length === 0) {
    return { matched: null, confidence: 0, normalizedQuery: '' }
  }
  const normalizedQuery = normalizeGCName(candidateName)
  if (normalizedQuery.length < 2) {
    return { matched: null, confidence: 0, normalizedQuery }
  }

  let bestMatch = null
  let bestScore = Infinity

  for (const gc of gcDirectory) {
    const normalizedGC = normalizeGCName(gc.name)
    if (!normalizedGC) continue
    const dist = levenshtein(normalizedQuery, normalizedGC)
    const maxLen = Math.max(normalizedQuery.length, normalizedGC.length)
    const score = maxLen === 0 ? 1 : dist / maxLen
    if (score < bestScore) {
      bestScore = score
      bestMatch = gc
    }
  }

  // Confidence: 1.0 = exact match, 0 = totally different. Threshold 0.4 = roughly similar.
  const confidence = Math.max(0, 1 - bestScore)
  if (confidence < 0.6) return { matched: null, confidence, normalizedQuery }
  return { matched: bestMatch, confidence, normalizedQuery }
}

/* ─────────── Confidence Aggregation ─────────── */

/**
 * Given a list of bidders found across multiple sources, aggregate them
 * with confidence scoring.
 *
 * sources: array of { name, source, url, foundAt }
 * Returns: array of { name, sources: [], confidence: HIGH|MEDIUM|LOW }
 */
export function aggregateBidders(sources) {
  if (!sources || sources.length === 0) return []
  const grouped = new Map()

  for (const entry of sources) {
    const key = normalizeGCName(entry.name)
    if (!key) continue
    if (!grouped.has(key)) {
      grouped.set(key, { name: entry.name, sources: [], _key: key })
    }
    const g = grouped.get(key)
    if (!g.sources.find((s) => s.source === entry.source)) {
      g.sources.push({ source: entry.source, url: entry.url, foundAt: entry.foundAt })
    }
  }

  return Array.from(grouped.values()).map((g) => ({
    name: g.name,
    sources: g.sources,
    sourceCount: g.sources.length,
    confidence: g.sources.length >= 3 ? 'HIGH' : g.sources.length >= 2 ? 'MEDIUM' : 'LOW',
  }))
}

/* ─────────── Source Templates ─────────── */

export const KNOWN_SOURCES = [
  { id: 'pdf-form-of-tender', label: 'Form of Tender (PDF)', tier: 'A' },
  { id: 'pdf-instructions', label: 'Instructions to Bidders (PDF)', tier: 'A' },
  { id: 'pdf-addendum', label: 'Addendum (PDF)', tier: 'A' },
  { id: 'merx-public', label: 'MERX (public listing)', tier: 'B' },
  { id: 'biddingo-public', label: 'Biddingo (public listing)', tier: 'B' },
  { id: 'bidsandtenders', label: 'Bids&Tenders portal', tier: 'B' },
  { id: 'bonfire', label: 'Bonfire Hub portal', tier: 'B' },
  { id: 'buyandsell', label: 'Federal Procurement (buyandsell.gc.ca)', tier: 'B' },
  { id: 'council-report', label: 'Municipal Council Report', tier: 'C' },
  { id: 'school-board', label: 'School Board Facilities Minutes', tier: 'C' },
  { id: 'hospital-procurement', label: 'Hospital Procurement Filing', tier: 'C' },
  { id: 'industry-news', label: 'Construction Industry News', tier: 'C' },
  { id: 'linkedin', label: 'LinkedIn announcement', tier: 'C' },
  { id: 'manual', label: 'Manual entry', tier: 'D' },
]

/* ─────────── Sweep Helper ─────────── */

/**
 * Plan an OSINT sweep for a tender. Returns a structured plan that the UI
 * can execute step by step.
 */
export function planOsintSweep(tender) {
  const queries = buildOsintQueries({
    projectName: tender.projectName,
    owner: tender.owner,
    location: tender.location,
    year: tender.closingDate ? new Date(tender.closingDate).getFullYear() : null,
  })

  const portalUrls = ['merx', 'biddingo', 'bidsandtenders', 'bonfire', 'buyandsell', 'ontariobuyers']
    .map((p) => ({ portal: p, url: buildPortalQuery(p, { projectName: tender.projectName, owner: tender.owner }) }))
    .filter((x) => x.url)

  return {
    tier_a: {
      label: 'Tier A — Tender Package PDFs',
      action: 'Parse attached PDFs for "List of Bidders" patterns',
      patterns: BIDDERS_LIST_PATTERNS.map((p) => p.toString()),
    },
    tier_b: {
      label: 'Tier B — Public Portals',
      action: 'Open these public-side URLs (no login required)',
      urls: portalUrls,
    },
    tier_c: {
      label: 'Tier C — Open Web Search',
      action: 'Run these search queries (Google, Bing, or custom)',
      queries: queries,
    },
  }
}
