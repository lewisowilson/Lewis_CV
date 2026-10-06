// Procedural topographic contours: a smooth noise field traced into level lines.
// Everything is generated from a seed, so the same map renders identically every visit.
import { contours } from 'd3-contour'

function mulberry32(seed) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Smooth value noise built from a few octaves of interpolated random lattices. */
function valueNoise(w, h, seed, octaves = 4) {
  const rand = mulberry32(seed)
  const out = new Float64Array(w * h)
  let amp = 1
  let total = 0
  for (let o = 0; o < octaves; o++) {
    const cell = Math.max(4, Math.round(Math.max(w, h) / (3 * 2 ** o)))
    const gw = Math.ceil(w / cell) + 2
    const gh = Math.ceil(h / cell) + 2
    const grid = Float64Array.from({ length: gw * gh }, rand)
    for (let y = 0; y < h; y++) {
      const gy = y / cell
      const y0 = Math.floor(gy)
      const ty = gy - y0
      const sy = ty * ty * (3 - 2 * ty)
      for (let x = 0; x < w; x++) {
        const gx = x / cell
        const x0 = Math.floor(gx)
        const tx = gx - x0
        const sx = tx * tx * (3 - 2 * tx)
        const a = grid[y0 * gw + x0]
        const b = grid[y0 * gw + x0 + 1]
        const c = grid[(y0 + 1) * gw + x0]
        const d = grid[(y0 + 1) * gw + x0 + 1]
        out[y * w + x] += amp * (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy)
      }
    }
    total += amp
    amp *= 0.5
  }
  for (let i = 0; i < out.length; i++) out[i] /= total
  return out
}

function ringsToPath(geometries, scale) {
  return geometries.map((g) =>
    g.coordinates
      .flat()
      .map((ring) => 'M' + ring.map(([x, y]) => `${(x * scale).toFixed(1)},${(y * scale).toFixed(1)}`).join('L') + 'Z')
      .join(''),
  )
}

/** A terrain-like field of contour lines covering a w x h box. */
export function terrain({ width, height, seed = 7, levels = 14, resolution = 6 }) {
  const w = Math.ceil(width / resolution)
  const h = Math.ceil(height / resolution)
  const field = valueNoise(w, h, seed)
  const thresholds = Array.from({ length: levels }, (_, i) => 0.25 + (i / levels) * 0.5)
  return ringsToPath(contours().size([w, h]).smooth(true).thresholds(thresholds)(field), resolution)
}

/** A single island: a radial bump distorted by noise, traced as concentric rings. */
export function island({ size = 240, seed = 1, rings = 7, resolution = 3 }) {
  const n = Math.ceil(size / resolution)
  const noise = valueNoise(n, n, seed, 4)
  const warp = valueNoise(n, n, seed + 101, 2)
  const rand = mulberry32(seed * 7)
  // Each island gets its own stretch and tilt so no two read as circles.
  const sx = 0.75 + rand() * 0.5
  const sy = 0.75 + rand() * 0.5
  const tilt = rand() * Math.PI
  const field = new Float64Array(n * n)
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let dx = (x - n / 2) / (n / 2)
      let dy = (y - n / 2) / (n / 2)
      const rx = dx * Math.cos(tilt) - dy * Math.sin(tilt)
      const ry = dx * Math.sin(tilt) + dy * Math.cos(tilt)
      dx = rx / sx + (warp[y * n + x] - 0.5) * 0.9
      dy = ry / sy + (warp[(n - 1 - y) * n + x] - 0.5) * 0.9
      const r = Math.sqrt(dx * dx + dy * dy)
      const falloff = Math.max(0, 1 - r)
      field[y * n + x] = falloff * 0.55 + noise[y * n + x] * 0.75 * falloff
    }
  }
  const thresholds = Array.from({ length: rings }, (_, i) => 0.12 + i * (0.6 / rings))
  return ringsToPath(contours().size([n, n]).smooth(true).thresholds(thresholds)(field), resolution)
}

/** Writes contour paths into an <svg>, one <path> per level, ready for stroke-draw animation. */
export function renderInto(svg, paths, { className = 'contour' } = {}) {
  const ns = 'http://www.w3.org/2000/svg'
  svg.replaceChildren(
    ...paths
      .filter(Boolean)
      .map((d, i) => {
        const p = document.createElementNS(ns, 'path')
        p.setAttribute('d', d)
        p.setAttribute('class', className)
        p.style.setProperty('--i', i)
        return p
      }),
  )
  return [...svg.querySelectorAll('path')]
}
