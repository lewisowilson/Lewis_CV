// Local stand-in for the AWS site API: same handlers, in-memory storage, plain WebSocket relay.
// Run: npm run dev  (http://127.0.0.1:8787, ws://127.0.0.1:8787/sky)
import { createServer } from 'node:http'
import { WebSocketServer } from 'ws'
import { marketState } from '../lambda/market.mjs'
import { handlePassRequest } from '../lambda/pass.mjs'
import { sanitise } from '../lambda/sky.mjs'

const PORT = 8787
const requests = []
const rates = new Map()

const cors = (res, origin) => {
  res.setHeader('access-control-allow-origin', origin || '*')
  res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS')
  res.setHeader('access-control-allow-headers', 'content-type')
}
const send = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(body))
}

const server = createServer(async (req, res) => {
  cors(res, req.headers.origin)
  if (req.method === 'OPTIONS') return res.writeHead(204).end()
  if (req.method === 'GET' && req.url === '/market') return send(res, 200, await marketState())
  if (req.method === 'POST' && req.url === '/pass-request') {
    let body = ''
    for await (const chunk of req) body += chunk
    const r = await handlePassRequest(
      { body, ip: req.socket.remoteAddress },
      {
        putRequest: async (item) => requests.push(item),
        bumpRate: async (k) => rates.set(k, (rates.get(k) ?? 0) + 1).get(k),
        notify: async (subject, message) => console.log(`\n[email to Lewis] ${subject}\n${message}\n`),
      },
    )
    return send(res, r.status, r.body)
  }
  send(res, 404, { error: 'not found' })
})

const wss = new WebSocketServer({ server, path: '/sky' })
let seq = 0
wss.on('connection', (ws) => {
  ws.id = 'dev' + String(++seq).padStart(5, '0')
  ws.on('message', (raw) => {
    let msg
    try {
      msg = sanitise(JSON.parse(raw))
    } catch {
      msg = null
    }
    if (!msg) return
    const data = JSON.stringify({ ...msg, id: ws.id, n: wss.clients.size })
    for (const c of wss.clients) if (c !== ws && c.readyState === 1) c.send(data)
  })
})

server.listen(PORT, '127.0.0.1', () => console.log(`site-api dev on http://127.0.0.1:${PORT}`))
