// Scroll-scrubbed image sequence on a <canvas> (the approach Apple uses for product pages).
// Frames load progressively, nearest-loaded frame is drawn, and drawing is cover-fit with DPR.

export class FrameSequence {
  constructor(canvas, { base, count, poster }) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d', { alpha: false })
    this.count = count
    this.urls = Array.from({ length: count }, (_, i) => `${base}/f${String(i + 1).padStart(3, '0')}.webp`)
    this.frames = new Array(count)
    this.current = 0
    this.poster = poster
    this.resize = this.resize.bind(this)
    new ResizeObserver(this.resize).observe(canvas)
    this.resize()
  }

  /** Loads every frame, first ones first, a few at a time so the page stays responsive. */
  async load(concurrency = 6) {
    const order = [...this.urls.keys()]
    let next = 0
    const worker = async () => {
      while (next < order.length) {
        const i = order[next++]
        const img = new Image()
        img.decoding = 'async'
        img.src = this.urls[i]
        try {
          await img.decode()
          this.frames[i] = img
          if (i === this.current || (i === 0 && !this.drawnOnce)) this.draw(this.current)
        } catch {
          /* a missing frame just falls back to its nearest neighbour */
        }
      }
    }
    await Promise.all(Array.from({ length: concurrency }, worker))
  }

  /** Swap to another frame set (e.g. a different sky) and reload, keeping the current position. */
  setBase(base) {
    this.urls = Array.from({ length: this.count }, (_, i) => `${base}/f${String(i + 1).padStart(3, '0')}.webp`)
    const keep = this.frames
    this.frames = new Array(this.count)
    // Keep showing the old frames until the new ones arrive, so there's no blank flash.
    this.fallback = keep
    return this.load().then(() => {
      this.fallback = null
      this.draw(this.current, true)
    })
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const { width, height } = this.canvas.getBoundingClientRect()
    this.canvas.width = Math.round(width * dpr)
    this.canvas.height = Math.round(height * dpr)
    this.draw(this.current, true)
  }

  nearest(i) {
    if (this.frames[i]) return this.frames[i]
    if (this.fallback?.[i]) return this.fallback[i]
    for (let d = 1; d < this.count; d++) {
      if (this.frames[i - d]) return this.frames[i - d]
      if (this.frames[i + d]) return this.frames[i + d]
    }
    return this.poster?.complete ? this.poster : null
  }

  /** progress 0..1 → frame */
  seek(progress) {
    const i = Math.min(this.count - 1, Math.max(0, Math.round(progress * (this.count - 1))))
    if (i !== this.current) this.draw(i)
  }

  draw(i, force = false) {
    const img = this.nearest(i)
    if (!img) return
    if (!force && i === this.current && this.drawnOnce) return
    this.current = i
    this.drawnOnce = true
    const { width: cw, height: ch } = this.canvas
    const iw = img.naturalWidth
    const ih = img.naturalHeight
    const scale = Math.max(cw / iw, ch / ih)
    const w = iw * scale
    const h = ih * scale
    this.ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h)
  }
}
