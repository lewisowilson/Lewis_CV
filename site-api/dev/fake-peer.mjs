// Simulates another visitor for local testing: flies a slow circle over the hero for ~25 s.
import WebSocket from 'ws'
const ws = new WebSocket('ws://127.0.0.1:8787/sky')
ws.on('open', () => {
  let t = 0
  const iv = setInterval(() => {
    t += 0.1
    ws.send(JSON.stringify({ t: 'move', s: 'top', rx: 0.5 + Math.cos(t) * 0.2, ry: 0.18 + Math.sin(t) * 0.06, c: 'CHE' }))
    if (t > 25) {
      clearInterval(iv)
      ws.close()
    }
  }, 100)
})
