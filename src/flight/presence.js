// Multiplayer sky: everyone on the site right now is a small paper plane at their cursor.
// Sends only { section, relative x/y, optional 3-letter origin }. Connects only while the tab is visible.
const PLANE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12 22 3 15 21 11.5 13.5Z"/><path d="M11.5 13.5 22 3"/></svg>'

export function presence(url, { origin = '' } = {}) {
  const layer = document.createElement('div')
  layer.className = 'peers'
  layer.setAttribute('aria-hidden', 'true')
  document.body.appendChild(layer)
  const counter = document.querySelector('[data-peers]')
  const peers = new Map()
  let ws = null
  let retry = 1000
  let lastSent = 0
  let pending = null

  const sections = () => [...document.querySelectorAll('[data-section]')]
  const locate = (clientX, clientY) => {
    const pageY = clientY + window.scrollY
    for (const el of sections()) {
      const r = el.getBoundingClientRect()
      const top = r.top + window.scrollY
      if (pageY >= top && pageY < top + r.height) {
        return { t: 'move', s: el.dataset.section, rx: clientX / innerWidth, ry: (pageY - top) / r.height, c: origin }
      }
    }
    return null
  }

  const send = (msg) => {
    if (ws?.readyState === 1 && msg) ws.send(JSON.stringify(msg))
  }
  const onMove = (e) => {
    pending = locate(e.clientX, e.clientY)
    const now = performance.now()
    if (now - lastSent > 120) {
      lastSent = now
      send(pending)
      pending = null
    }
  }

  function connect() {
    if (ws || document.hidden) return
    ws = new WebSocket(url)
    ws.onopen = () => {
      retry = 1000
      send(pending ?? { t: 'move', s: 'top', rx: 0.5, ry: 0.2, c: origin })
    }
    ws.onmessage = (ev) => {
      let m
      try {
        m = JSON.parse(ev.data)
      } catch {
        return
      }
      if (m?.t !== 'move' || !m.id) return
      let p = peers.get(m.id)
      if (!p) {
        const el = document.createElement('div')
        el.className = 'peer'
        el.innerHTML = PLANE + '<span></span>'
        layer.appendChild(el)
        p = { el, x: null, y: null, ang: 0 }
        peers.set(m.id, p)
      }
      Object.assign(p, { s: m.s, rx: m.rx, ry: m.ry, at: performance.now() })
      p.el.querySelector('span').textContent = m.c || ''
    }
    ws.onclose = () => {
      ws = null
      if (!document.hidden) setTimeout(connect, (retry = Math.min(retry * 2, 30000)))
    }
  }

  document.addEventListener('visibilitychange', () => (document.hidden ? ws?.close() : connect()))
  addEventListener('pointermove', onMove, { passive: true })
  connect()

  // Glide each plane towards its latest position and point it along its path.
  const tick = () => {
    requestAnimationFrame(tick)
    const now = performance.now()
    let live = 0
    for (const [id, p] of peers) {
      if (now - p.at > 20000) {
        p.el.remove()
        peers.delete(id)
        continue
      }
      const sec = document.querySelector(`[data-section="${p.s}"]`)
      if (!sec) continue
      live++
      const r = sec.getBoundingClientRect()
      const tx = p.rx * innerWidth
      const ty = r.top + p.ry * r.height
      if (p.x === null) {
        p.x = tx
        p.y = ty
      }
      const dx = tx - p.x
      const dy = ty - p.y
      if (Math.hypot(dx, dy) > 1.5) {
        const turn = ((Math.atan2(dy, dx) * (180 / Math.PI) + 45 - p.ang + 540) % 360) - 180
        p.ang += turn * 0.15
      }
      p.x += dx * 0.12
      p.y += dy * 0.12
      const onScreen = p.y > -40 && p.y < innerHeight + 40
      p.el.style.opacity = onScreen ? String(Math.max(0, 1 - (now - p.at - 12000) / 8000)) : '0'
      p.el.style.transform = `translate(${p.x}px, ${p.y}px)`
      p.el.firstChild.style.transform = `rotate(${p.ang}deg)`
    }
    if (counter) {
      counter.hidden = live === 0
      counter.textContent = live === 1 ? '1 other flying' : `${live} others flying`
    }
  }
  tick()
}
