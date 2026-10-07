// The flight plan in 3D: a surveyed archipelago (Gemini elevation model as a point cloud) with one
// island per CV chapter. Scroll moves the camera along a smooth path, pausing at each island.
import {
  BufferAttribute, BufferGeometry, CatmullRomCurve3, Color, Line, LineBasicMaterial, LineDashedMaterial, PerspectiveCamera, Points,
  Scene, ShaderMaterial, Vector3, WebGLRenderer,
} from 'three'
import { loadHeights, mirror } from './world.js'

const SIZE = 1000
const AMP = 60
const TILE = 2.2

const vertex = /* glsl */ `
  attribute float aH;
  uniform float uPixel;
  uniform float uTime;
  uniform float uSwell;
  varying float vH;
  varying float vFog;
  void main() {
    vec3 p = position;
    if (aH < 0.0) p.y += uSwell * (sin(p.x * 0.05 + uTime) + sin(p.z * 0.04 - uTime * 0.8)) * 1.5;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float depth = -mv.z;
    gl_PointSize = max(1.4, mix(1.7, 3.2, max(aH, 0.0)) * uPixel * (140.0 / depth));
    vH = aH;
    vFog = smoothstep(180.0, 460.0, depth);
  }
`
const fragment = /* glsl */ `
  uniform vec3 uMist;
  uniform vec3 uSurvey;
  uniform vec3 uDepth;
  uniform vec3 uInk;
  varying float vH;
  varying float vFog;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    if (dot(c, c) > 0.25) discard;
    if (vH < 0.0) {
      gl_FragColor = vec4(mix(uDepth, uInk, vFog), 0.3 * (1.0 - vFog));
      #include <colorspace_fragment>
      return;
    }
    float iso = abs(fract(vH * 12.0 + 0.5) - 0.5);
    float onLine = (1.0 - smoothstep(0.03, 0.07, iso)) * step(0.04, vH);
    vec3 col = mix(uDepth, uMist, smoothstep(0.0, 0.8, vH));
    col = mix(col, uSurvey, onLine * 0.7);
    gl_FragColor = vec4(mix(col, uInk, vFog), 1.0 - vFog * 0.92);
    #include <colorspace_fragment>
  }
`

export async function createJourney3D(canvas, count) {
  const dem = await loadHeights('/media/island/archipelago.png')
  if (!dem) return null
  const heightAt = (x, z) => {
    const u = Math.abs((x / SIZE + 0.5) * TILE)
    const v = Math.abs((z / SIZE + 0.5) * TILE)
    return Math.max(0, dem(mirror(u), mirror(v)) - 0.2) * AMP
  }

  // Terrain point cloud: land densely, the sea as a sparse survey grid.
  const N = matchMedia('(max-width: 760px)').matches ? 280 : 440
  const pos = []
  const hs = []
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const x = (i / (N - 1) - 0.5) * SIZE
      const z = (j / (N - 1) - 0.5) * SIZE
      const h = heightAt(x, z)
      if (h < 0.4 && (i % 5 || j % 5)) continue
      pos.push(x, h, z)
      hs.push(h < 0.4 ? -1 : Math.min(1, h / AMP))
    }
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  geo.setAttribute('aH', new BufferAttribute(new Float32Array(hs), 1))
  const ink = new Color('#0B1820')
  const material = new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uPixel: { value: Math.min(devicePixelRatio, 1.5) },
      uTime: { value: 0 },
      uSwell: { value: 0.12 },
      uMist: { value: new Color('#E9EDEB') },
      uSurvey: { value: new Color('#FF5B1F') },
      uDepth: { value: new Color('#2B4A56') },
      uInk: { value: ink },
    },
  })
  const scene = new Scene()
  scene.background = ink
  scene.add(new Points(geo, material))

  // Pick one island per chapter: walk a winding line across the chart, near to far,
  // and take the highest unused peak near each step.
  const peaks = []
  for (let j = 0; j < 48; j++) {
    for (let i = 0; i < 48; i++) {
      const x = (i / 47 - 0.5) * SIZE * 0.86
      const z = (j / 47 - 0.5) * SIZE * 0.86
      const h = heightAt(x, z)
      if (h > 12) peaks.push({ x, z, h })
    }
  }
  const islands = []
  for (let k = 0; k < count; k++) {
    const t = count === 1 ? 0.5 : k / (count - 1)
    const gz = (0.42 - t * 0.84) * SIZE
    const gx = Math.sin(t * Math.PI * 2.3) * SIZE * 0.22
    let best = null
    let bestScore = Infinity
    for (const p of peaks) {
      if (islands.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < 80)) continue
      const score = Math.hypot(p.x - gx, p.z - gz) - p.h * 1.5
      if (score < bestScore) {
        bestScore = score
        best = p
      }
    }
    islands.push(best ?? { x: gx, z: gz, h: 0 })
  }

  // Beacons: a thin line rising from each island; colour shows past / current / ahead.
  const mats = {
    ahead: new LineBasicMaterial({ color: '#5B666C', transparent: true, opacity: 0.6 }),
    current: new LineBasicMaterial({ color: '#FF5B1F' }),
    past: new LineBasicMaterial({ color: '#E9EDEB', transparent: true, opacity: 0.55 }),
  }
  const beacons = islands.map((p) => {
    const g = new BufferGeometry().setFromPoints([new Vector3(p.x, p.h + 2, p.z), new Vector3(p.x, p.h + 34, p.z)])
    const l = new Line(g, mats.ahead)
    scene.add(l)
    return l
  })

  // Camera path: for each island, a viewpoint behind and to the side of the direction of travel.
  const camPts = []
  const lookPts = []
  islands.forEach((p, i) => {
    const prev = islands[Math.max(0, i - 1)]
    const next = islands[Math.min(count - 1, i + 1)]
    const d = new Vector3(next.x - prev.x, 0, next.z - prev.z)
    if (d.lengthSq() < 1) d.set(0, 0, -1)
    d.normalize()
    const right = new Vector3(-d.z, 0, d.x)
    camPts.push(new Vector3(p.x, p.h, p.z).addScaledVector(d, -62).addScaledVector(right, 34).add(new Vector3(0, 34 + p.h * 0.25, 0)))
    lookPts.push(new Vector3(p.x, p.h * 0.6 + 6, p.z))
  })
  // The last stop is an overview: climb high above the middle of the route to see the whole flight plan.
  const mid = islands.reduce((a, p) => a.add(new Vector3(p.x, 0, p.z)), new Vector3()).multiplyScalar(1 / count)
  const span = Math.max(...islands.map((p) => Math.hypot(p.x - mid.x, p.z - mid.z)))
  camPts[count - 1] = new Vector3(mid.x + span * 0.35, span * 1.15 + 80, mid.z + span * 1.1)
  lookPts[count - 1] = new Vector3(mid.x, 0, mid.z)
  const camCurve = new CatmullRomCurve3(camPts, false, 'centripetal')
  const lookCurve = new CatmullRomCurve3(lookPts, false, 'centripetal')

  // The route itself, drawn on the sea between the islands: dashed ahead, solid orange behind.
  const routeCurve = new CatmullRomCurve3(islands.map((p) => new Vector3(p.x, 1.5, p.z)), false, 'centripetal')
  const routePts = routeCurve.getSpacedPoints(count * 40)
  const routeAhead = new Line(new BufferGeometry().setFromPoints(routePts), new LineDashedMaterial({ color: '#7E878C', dashSize: 4, gapSize: 4, transparent: true, opacity: 0.55 }))
  routeAhead.computeLineDistances()
  const routeDone = new Line(new BufferGeometry().setFromPoints(routePts), new LineBasicMaterial({ color: '#FF5B1F' }))
  routeDone.geometry.setDrawRange(0, 0)
  scene.add(routeAhead, routeDone)
  const routeCount = routePts.length

  const camera = new PerspectiveCamera(48, 1, 0.5, 900)
  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect()
    renderer.setSize(width, height, false)
    camera.aspect = width / Math.max(1, height)
    camera.updateProjectionMatrix()
  }
  new ResizeObserver(resize).observe(canvas)
  resize()

  const state = { target: 0, t: 0, active: -1 }
  const look = new Vector3()
  const tmp = new Vector3()
  let running = false
  let last = 0
  const t0 = performance.now()
  let onFrame = () => {}

  const frame = (now) => {
    if (!running) return
    requestAnimationFrame(frame)
    if (now - last < 1000 / 60) return
    last = now
    // Critically damped follow of the scroll target: smooth, never overshoots.
    state.t += (state.target - state.t) * 0.08
    const u = Math.max(0, Math.min(1, state.t))
    routeDone.geometry.setDrawRange(0, Math.round(u * routeCount))
    camCurve.getPointAt(u, camera.position)
    lookCurve.getPointAt(u, look)
    // A whisper of handheld drift.
    const s = (now - t0) / 1000
    camera.position.y += Math.sin(s * 0.7) * 0.6
    camera.lookAt(look.x + Math.sin(s * 0.5) * 0.8, look.y, look.z)
    material.uniforms.uTime.value = s
    renderer.render(scene, camera)
    onFrame(
      islands.map((p) => {
        tmp.set(p.x, p.h + 36, p.z).project(camera)
        return { x: (tmp.x * 0.5 + 0.5) * 100, y: (-tmp.y * 0.5 + 0.5) * 100, visible: tmp.z < 1 }
      }),
    )
  }

  return {
    count,
    // progress 0..1 across the whole journey; the camera dwells at each island.
    setProgress(p) {
      const u = p * (count - 1)
      const i = Math.min(count - 2, Math.floor(u))
      const f = u - i
      const travel = Math.max(0, Math.min(1, (f - 0.35) / 0.55))
      const eased = travel * travel * (3 - 2 * travel)
      state.target = (i + eased) / (count - 1)
    },
    setActive(i) {
      if (i === state.active) return
      state.active = i
      beacons.forEach((b, k) => (b.material = k < i ? mats.past : k === i ? mats.current : mats.ahead))
    },
    setSwell(v) {
      material.uniforms.uSwell.value = Math.max(0.05, Math.min(1, v))
    },
    onFrame(fn) {
      onFrame = fn
    },
    start() {
      if (running) return
      running = true
      requestAnimationFrame(frame)
    },
    stop() {
      running = false
    },
  }
}
