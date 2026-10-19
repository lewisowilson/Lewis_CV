import { test } from 'node:test'
import assert from 'node:assert/strict'
import { handlePassRequest, validate } from './pass.mjs'
import { sanitise } from './sky.mjs'
import { marketState } from './market.mjs'

const deps = () => {
  const stored = []
  const mails = []
  const rates = new Map()
  return {
    stored,
    mails,
    putRequest: async (i) => stored.push(i),
    bumpRate: async (k) => rates.set(k, (rates.get(k) ?? 0) + 1).get(k),
    notify: async (s, m) => mails.push([s, m]),
  }
}
const good = { name: 'Ada Lovelace', company: 'Analytical Ltd', line1: '1 Engine Row', city: 'London', postcode: 'N1 1AA', country: 'UK' }

test('pass request: stores, emails, sets a 120-day expiry', async () => {
  const d = deps()
  const r = await handlePassRequest({ body: JSON.stringify(good), ip: '1.2.3.4', now: new Date('2026-10-07T10:00:00Z') }, d)
  assert.equal(r.status, 200)
  assert.equal(d.stored.length, 1)
  assert.equal(d.stored[0].ttl, Math.floor(Date.parse('2026-10-07T10:00:00Z') / 1000) + 120 * 86400)
  assert.match(d.mails[0][1], /1 Engine Row/)
})

test('pass request: honeypot is silently dropped', async () => {
  const d = deps()
  const r = await handlePassRequest({ body: JSON.stringify({ ...good, website: 'spam' }), ip: 'x' }, d)
  assert.equal(r.status, 200)
  assert.equal(d.stored.length, 0)
})

test('pass request: missing address and over-long fields are rejected', () => {
  assert.match(validate({ ...good, line1: '' }).error, /address/)
  assert.match(validate({ ...good, note: 'x'.repeat(301) }).error, /too long/)
})

test('pass request: fourth request in a day from one IP is rate limited', async () => {
  const d = deps()
  for (let i = 0; i < 3; i++) assert.equal((await handlePassRequest({ body: JSON.stringify(good), ip: '9.9.9.9' }, d)).status, 200)
  assert.equal((await handlePassRequest({ body: JSON.stringify(good), ip: '9.9.9.9' }, d)).status, 429)
})

test('sky: only well-formed moves pass, values clamped, no extra fields', () => {
  assert.deepEqual(sanitise({ t: 'move', rx: 1.7, ry: -2, s: 'work', c: 'LON', name: 'x' }), { t: 'move', rx: 1, ry: 0, s: 'work', c: 'LON' })
  assert.equal(sanitise({ t: 'move', rx: 0.5, ry: 0.5, s: '<script>' }), null)
  assert.equal(sanitise({ t: 'chat', text: 'hi' }), null)
  assert.equal(sanitise({ t: 'move', rx: 0.5, ry: 0.5, s: 'work', c: 'lon' }).c, '')
})

test('market: computes a sea state from 5-minute closes, and degrades gracefully', async () => {
  const closes = Array.from({ length: 60 }, (_, i) => 10000 * (1 + 0.001 * Math.sin(i)))
  const fake = async () => ({
    ok: true,
    json: async () => ({ chart: { result: [{ meta: { regularMarketPrice: 10000, regularMarketChangePercent: 0.4, regularMarketTime: 1791300000, currentTradingPeriod: { regular: { start: 0, end: 1 } } }, indicators: { quote: [{ close: closes }] } }] } }),
  })
  const s = await marketState(fake)
  assert.ok(s.douglas >= 0 && s.douglas <= 6)
  assert.equal(s.index, 'FTSE 100')
})

// ——— MCP (read-only CV for other people's Claude) ———
import { handleHttp, handleMessage } from './mcp.mjs'

const profile = {
  name: 'Lewis Wilson',
  headline: 'Maths with Economics student',
  looking_for: { when: '2027-28' },
  contact: { email: 'a@b.c' },
  education: [{ institution: 'University of Exeter' }],
  experience: [{ role: 'Trainee Actuary placement', organisation: 'Reassure Insurance' }],
  projects: [{ name: 'Flatmate' }],
  skills: ['Python', 'SQL'],
  achievements: ['Duke of Edinburgh Gold Award'],
}
const rpc = (method, params, id = 1) => handleMessage({ jsonrpc: '2.0', id, method, params }, profile)

test('mcp: initialize echoes a supported protocol version and falls back to the newest', () => {
  assert.equal(rpc('initialize', { protocolVersion: '2025-06-18' }).result.protocolVersion, '2025-06-18')
  const r = rpc('initialize', { protocolVersion: '1999-01-01' }).result
  assert.equal(r.protocolVersion, '2025-11-25')
  assert.deepEqual(r.capabilities, { tools: { listChanged: false } })
})

test('mcp: lists three read-only tools and answers them', () => {
  const tools = rpc('tools/list').result.tools
  assert.deepEqual(tools.map((t) => t.name), ['get_profile', 'get_section', 'search_profile'])
  assert.ok(tools.every((t) => t.annotations.readOnlyHint))
  const section = JSON.parse(rpc('tools/call', { name: 'get_section', arguments: { section: 'skills' } }).result.content[0].text)
  assert.deepEqual(section, { skills: ['Python', 'SQL'] })
  const hits = JSON.parse(rpc('tools/call', { name: 'search_profile', arguments: { query: 'ACTUAR' } }).result.content[0].text)
  assert.equal(hits[0].section, 'experience')
  assert.match(rpc('tools/call', { name: 'search_profile', arguments: { query: 'zebra' } }).result.content[0].text, /Nothing/)
})

test('mcp: bad tools, sections and methods give errors, notifications get 202', () => {
  assert.equal(rpc('tools/call', { name: 'delete_everything' }).error.code, -32602)
  assert.equal(rpc('tools/call', { name: 'get_section', arguments: { section: 'salary' } }).result.isError, true)
  assert.equal(rpc('resources/list').error.code, -32601)
  assert.equal(handleHttp({ method: 'POST', body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) }, profile).status, 202)
  assert.equal(handleHttp({ method: 'POST', body: '{nope' }, profile).status, 400)
  assert.equal(handleHttp({ method: 'GET' }, profile).status, 405)
  const batch = handleHttp({ method: 'POST', body: JSON.stringify([{ jsonrpc: '2.0', id: 1, method: 'ping' }, { jsonrpc: '2.0', method: 'notifications/initialized' }]) }, profile)
  assert.equal(JSON.parse(batch.body).length, 1)
})
