// The continuous world: a LiDAR-surveyed archipelago behind the dark sections.
// The camera flies over it as you scroll, banking with scroll speed and drifting toward the cursor.
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, PerspectiveCamera, Points, Scene, ShaderMaterial, WebGLRenderer } from 'three'

function makeNoise(seed) {
  let s = seed
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  const perm = Array.from({ length: 512 }, () => rand())
  const lerp = (a, b, t) => a + (b - a) * t
  const fade = (t) => t * t * (3 - 2 * t)
  const at = (x, y) => perm[((x & 255) + ((y & 255) * 17)) & 511]
  return (x, y) => {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const xf = fade(x - xi)
    const yf = fade(y - yi)
    return lerp(lerp(at(xi, yi), at(xi + 1, yi), xf), lerp(at(xi, yi + 1), at(xi + 1, yi + 1), xf), yf)
  }
}

const vertex = /* glsl */ `
  attribute float aH;
  attribute float aR;
  uniform float uTime;
  uniform float uPixel;
  uniform vec3 uCam;
  varying float vH;
  varying float vFog;
  varying float vPulse;
  varying float vR;
  void main() {
    vec3 p = position;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float depth = -mv.z;
    // Survey pulses: rings expanding from points ahead of the aircraft.
    float ring = fract(length(p.xz - uCam.xz - vec2(0.0, -60.0)) * 0.025 - uTime * 0.18);
    vPulse = (1.0 - smoothstep(0.0, 0.04, abs(ring - 0.5))) * step(0.02, aH);
    gl_PointSize = max(1.6, mix(1.8, 3.2, aH) * uPixel * (130.0 / depth));
    vH = aH;
    vFog = max(smoothstep(60.0, 210.0, depth), 1.0 - smoothstep(18.0, 55.0, depth));
    vR = aR;
  }
`

const fragment = /* glsl */ `
  uniform vec3 uMist;
  uniform vec3 uSurvey;
  uniform vec3 uDepth;
  uniform float uOpacity;
  varying float vH;
  varying float vFog;
  varying float vPulse;
  varying float vR;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    if (dot(c, c) > 0.25) discard;
    float iso = abs(fract(vH * 10.0 + 0.5) - 0.5);
    float onLine = (1.0 - smoothstep(0.04, 0.08, iso)) * step(0.02, vH);
    vec3 col = mix(uDepth, uMist, smoothstep(0.02, 0.7, vH));
    col = mix(col, uSurvey, onLine * 0.85);
    col += uSurvey * vPulse * 0.7;
    float land = step(0.02, vH);
    float a = mix(0.22, 1.0, land) * (0.75 + vR * 0.25) * (1.0 - vFog) * uOpacity;
    gl_FragColor = vec4(col, a);
    #include <colorspace_fragment>
  }
`

// A Gemini-made elevation model of the archipelago (black sea, grey land rising to white).
// Returns a bilinear sampler over 0..1 coords, or null so the procedural terrain takes over.
async function loadHeights(src) {
  try {
    const img = new Image()
    img.src = src
    await img.decode()
    const W = img.naturalWidth
    const H = img.naturalHeight
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const ctx = c.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0)
    const px = ctx.getImageData(0, 0, W, H).data
    const at = (x, y) => px[(Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))) * 4] / 255
    return (u, v) => {
      const x = u * (W - 1)
      const y = v * (H - 1)
      const xi = Math.floor(x)
      const yi = Math.floor(y)
      const fx = x - xi
      const fy = y - yi
      const top = at(xi, yi) * (1 - fx) + at(xi + 1, yi) * fx
      const bot = at(xi, yi + 1) * (1 - fx) + at(xi + 1, yi + 1) * fx
      return top * (1 - fy) + bot * fy
    }
  } catch {
    return null
  }
}

// Mirror-repeat 0..2 into 0..1..0 so a non-tiling map repeats without seams.
const mirror = (t) => 1 - Math.abs((t % 2) - 1)

export async function createWorld(canvas, { heightmap } = {}) {
  const dem = heightmap ? await loadHeights(heightmap) : null
  const small = matchMedia('(max-width: 760px)').matches
  const N = small ? 260 : 420 // grid resolution across the world
  const SIZE = 340
  const noise = makeNoise(20261006)
  const fbm = (x, y) => {
    let v = 0
    let a = 0.5
    let f = 1
    for (let i = 0; i < 5; i++) {
      v += a * noise(x * f, y * f)
      f *= 2.03
      a *= 0.5
    }
    return v
  }
  const pos = []
  const hs = []
  const rs = []
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const u = i / N
      const v = j / N
      const x = (u - 0.5) * SIZE + (Math.random() - 0.5) * (SIZE / N)
      const z = (v - 0.5) * SIZE + (Math.random() - 0.5) * (SIZE / N)
      // Islands: the surveyed elevation model if we have it, otherwise noise above a sea level.
      const h = dem ? Math.max(0, (dem(mirror(u * 2), mirror(v * 2)) - 0.2) * 1.0) : Math.max(0, (fbm(x * 0.018 + 3.1, z * 0.018 + 7.7) - 0.49) * 2.6)
      if (h <= 0 && (i % 4 || j % 4)) continue
      pos.push(x, h * 26, z)
      hs.push(Math.min(1, h))
      rs.push(Math.random())
    }
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  geo.setAttribute('aH', new BufferAttribute(new Float32Array(hs), 1))
  geo.setAttribute('aR', new BufferAttribute(new Float32Array(rs), 1))

  const material = new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPixel: { value: Math.min(devicePixelRatio, 1.5) },
      uCam: { value: [0, 0, 0] },
      uOpacity: { value: 0 },
      uMist: { value: new Color('#E9EDEB') },
      uSurvey: { value: new Color('#FF5B1F') },
      uDepth: { value: new Color('#1E3A46') },
    },
  })
  const scene = new Scene()
  scene.add(new Points(geo, material))
  const camera = new PerspectiveCamera(50, 1, 0.5, 600)
  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
  const resize = () => {
    renderer.setSize(innerWidth, innerHeight, false)
    camera.aspect = innerWidth / innerHeight
    camera.updateProjectionMatrix()
  }
  addEventListener('resize', resize)
  resize()

  const state = { progress: 0, velocity: 0, opacity: 0, target: 0, mx: 0, tmx: 0, bank: 0 }
  addEventListener('pointermove', (e) => (state.tmx = (e.clientX / innerWidth - 0.5) * 2), { passive: true })

  let running = false
  let last = 0
  const t0 = performance.now()
  const frame = (now) => {
    if (!running) return
    requestAnimationFrame(frame)
    if (now - last < 1000 / 50) return // cap at ~50fps: smooth, and kind to laptops
    last = now
    const t = (now - t0) / 1000
    state.opacity += (state.target - state.opacity) * 0.06
    state.mx += (state.tmx - state.mx) * 0.03
    state.bank += (gsapClamp(state.velocity / 3000) - state.bank) * 0.05
    // Fly a gentle S-curve across the world, constant drift plus scroll-driven travel.
    const travel = state.progress * 260 + t * 1.0
    const z = 130 - (travel % 260)
    const x = Math.sin(travel * 0.016) * 40 + state.mx * 8
    const y = 52 + Math.sin(travel * 0.02) * 5
    camera.position.set(x, y, z)
    camera.up.set(Math.sin(state.bank * 0.35), 1, 0)
    camera.lookAt(x + Math.cos(travel * 0.016) * 14 + state.mx * 10, -4, z - 70)
    material.uniforms.uTime.value = t
    material.uniforms.uCam.value = [x, y, z]
    material.uniforms.uOpacity.value = state.opacity
    renderer.render(scene, camera)
    if (state.target === 0 && state.opacity < 0.01) running = false
  }
  function gsapClamp(v) {
    return Math.max(-1, Math.min(1, v))
  }
  return {
    state,
    show(on) {
      state.target = on ? 0.62 : 0
      if (on && !running) {
        running = true
        requestAnimationFrame(frame)
      }
    },
  }
}
