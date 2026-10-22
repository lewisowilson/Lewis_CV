// POST /mcp: a read-only MCP server (Streamable HTTP, JSON responses, stateless) so anyone can add
// Lewis's public CV to their own Claude as a custom connector. Data is the live https://lewis-wilson.com/profile.json
// (refreshed every 5 minutes), so site pushes reach it without a redeploy; the copy bundled at deploy is the fallback.
import { readFileSync } from 'node:fs'
import https from 'node:https'

const VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05']
const SECTIONS = ['looking_for', 'contact', 'education', 'experience', 'projects', 'skills', 'achievements']
const MAX_BODY = 64 * 1024

const PROFILE_URL = 'https://lewis-wilson.com/profile.json'
const TTL_MS = 5 * 60 * 1000

let bundled = null
const loadProfile = () => (bundled ??= JSON.parse(readFileSync(new URL('./profile.json', import.meta.url), 'utf8')))

let cached = null // { profile, at }

/** GET a JSON document with node:https (global fetch can leave Lambda's first invocation with an unsettled promise). */
const getJson = (url) =>
  new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 2000, headers: { accept: 'application/json' } }, (res) => {
      if (res.statusCode !== 200) {
        res.resume()
        return reject(new Error(`status ${res.statusCode}`))
      }
      let raw = ''
      res.setEncoding('utf8')
      res.on('data', (c) => (raw += c))
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw))
        } catch (e) {
          reject(e)
        }
      })
      res.on('error', reject)
    })
    req.on('timeout', () => req.destroy(new Error('timeout')))
    req.on('error', reject)
  })

/** The live profile.json, cached for TTL_MS; on any failure the last good copy, else the bundled one. */
export async function liveProfile(get = getJson, now = Date.now()) {
  if (cached && now - cached.at < TTL_MS) return cached.profile
  try {
    const profile = await get(PROFILE_URL)
    if (!profile || typeof profile !== 'object' || !Array.isArray(profile.projects)) throw new Error('malformed')
    cached = { profile, at: now }
    return profile
  } catch (e) {
    console.warn('profile.json fetch failed, using fallback:', e.message)
    return cached?.profile ?? loadProfile()
  }
}
export const resetProfileCache = () => (cached = null)

const TOOLS = [
  {
    name: 'get_profile',
    title: 'Lewis Wilson: full CV',
    description: "Lewis Wilson's whole public CV: headline, what he is looking for, contact, education, experience, projects, skills and achievements.",
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'get_section',
    title: 'Lewis Wilson: one CV section',
    description: "One section of Lewis Wilson's public CV.",
    inputSchema: {
      type: 'object',
      properties: { section: { type: 'string', enum: SECTIONS, description: 'Which section to return' } },
      required: ['section'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'search_profile',
    title: 'Search Lewis Wilson’s CV',
    description: "Find the entries in Lewis Wilson's public CV that mention a word or phrase (case-insensitive), e.g. 'actuar', 'Python', 'Exeter'.",
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', minLength: 2, maxLength: 100 } },
      required: ['query'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
]

const INSTRUCTIONS =
  "Public, read-only CV data for Lewis Wilson (lewis-wilson.com). Use get_profile for an overview, get_section for one part, search_profile to check a specific skill or experience. Quote facts as given; do not infer grades, dates or roles that are not listed. To contact Lewis, use the email in the contact section."

const text = (value) => ({ content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }] })
const toolError = (message) => ({ content: [{ type: 'text', text: message }], isError: true })

function callTool(name, args, profile) {
  if (name === 'get_profile') {
    const { $comment: _c, ...rest } = profile
    return text(rest)
  }
  if (name === 'get_section') {
    if (!SECTIONS.includes(args?.section)) return toolError(`section must be one of: ${SECTIONS.join(', ')}`)
    return text({ [args.section]: profile[args.section] })
  }
  if (name === 'search_profile') {
    const q = typeof args?.query === 'string' ? args.query.trim().toLowerCase() : ''
    if (q.length < 2 || q.length > 100) return toolError('query must be 2-100 characters')
    const hits = []
    for (const section of SECTIONS) {
      const value = profile[section]
      // Grouped sections ({ group: [items] }, like skills) are searched one group at a time.
      const grouped = value && !Array.isArray(value) && typeof value === 'object' && Object.values(value).every(Array.isArray)
      const entries = Array.isArray(value) ? value : grouped ? Object.entries(value).map(([group, items]) => ({ group, items })) : [value]
      for (const entry of entries) if (JSON.stringify(entry).toLowerCase().includes(q)) hits.push({ section, entry })
    }
    if (profile.headline.toLowerCase().includes(q)) hits.unshift({ section: 'headline', entry: profile.headline })
    return text(hits.length ? hits : `Nothing in the CV mentions "${args.query}".`)
  }
  return null
}

const ok = (id, result) => ({ jsonrpc: '2.0', id, result })
const err = (id, code, message) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } })

/** One JSON-RPC message in, one response out (or null for a notification). */
export function handleMessage(msg, profile = loadProfile()) {
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return err(msg?.id, -32600, 'Invalid Request')
  const isNotification = msg.id === undefined || msg.id === null
  if (isNotification) return null
  switch (msg.method) {
    case 'initialize': {
      const asked = msg.params?.protocolVersion
      return ok(msg.id, {
        protocolVersion: VERSIONS.includes(asked) ? asked : VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'lewis-wilson-cv', title: 'Lewis Wilson CV', version: '1.0.0', websiteUrl: 'https://lewis-wilson.com' },
        instructions: INSTRUCTIONS,
      })
    }
    case 'ping':
      return ok(msg.id, {})
    case 'tools/list':
      return ok(msg.id, { tools: TOOLS })
    case 'tools/call': {
      const result = callTool(msg.params?.name, msg.params?.arguments ?? {}, profile)
      return result ? ok(msg.id, result) : err(msg.id, -32602, `Unknown tool: ${msg.params?.name}`)
    }
    default:
      return err(msg.id, -32601, `Method not found: ${msg.method}`)
  }
}

/** HTTP layer: POST only, JSON body (single message or batch). */
export function handleHttp({ method, body, contentType }, profile) {
  const json = (status, value) => ({ status, headers: { 'content-type': 'application/json' }, body: JSON.stringify(value) })
  if (method === 'GET') return { status: 405, headers: { allow: 'POST' }, body: '' } // no server-initiated stream
  if (method === 'DELETE') return { status: 405, headers: { allow: 'POST' }, body: '' } // stateless: no sessions to end
  if (method !== 'POST') return { status: 405, headers: { allow: 'POST' }, body: '' }
  if (contentType && !contentType.includes('application/json')) return json(415, err(null, -32700, 'Content-Type must be application/json'))
  if (!body || body.length > MAX_BODY) return json(400, err(null, -32700, 'Parse error'))
  let parsed
  try {
    parsed = JSON.parse(body)
  } catch {
    return json(400, err(null, -32700, 'Parse error'))
  }
  if (Array.isArray(parsed)) {
    if (parsed.length === 0 || parsed.length > 20) return json(400, err(null, -32600, 'Invalid Request'))
    const out = parsed.map((m) => handleMessage(m, profile)).filter(Boolean)
    return out.length ? json(200, out) : { status: 202, headers: {}, body: '' }
  }
  const out = handleMessage(parsed, profile)
  return out ? json(200, out) : { status: 202, headers: {}, body: '' }
}

export async function handler(event) {
  const raw = event.body ?? ''
  const body = event.isBase64Encoded ? Buffer.from(raw, 'base64').toString('utf8') : raw
  const headers = Object.fromEntries(Object.entries(event.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]))
  const r = handleHttp({ method: event.requestContext?.http?.method ?? 'POST', body, contentType: headers['content-type'] }, await liveProfile())
  return { statusCode: r.status, headers: { 'cache-control': 'no-store', ...r.headers }, body: r.body }
}
