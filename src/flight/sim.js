// Fly it yourself: a small seaplane over the surveyed archipelago. Each project is a waypoint;
// fly through its orange beam to "land" and open that boarding pass.
import {
  AdditiveBlending, BoxGeometry, BufferAttribute, BufferGeometry, Color, CylinderGeometry, DirectionalLight, DoubleSide,
  Group, HemisphereLight, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, PlaneGeometry, Points,
  RingGeometry, Scene, ShaderMaterial, SphereGeometry, Vector3, WebGLRenderer,
} from 'three'
import { loadHeights, mirror } from './world.js'

const SIZE = 1400
const AMP = 70
const TILE = 3 // the elevation model repeats (mirrored) 3x3 across the chart

const vertex = /* glsl */ `
  attribute float aH;
  uniform float uPixel;
  varying float vH;
  varying float vFog;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float depth = -mv.z;
    gl_PointSize = max(1.4, mix(1.6, 3.0, max(aH, 0.0)) * uPixel * (160.0 / depth));
    vH = aH;
    vFog = smoothstep(260.0, 620.0, depth);
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
      // Sea grid: faint and cool.
      gl_FragColor = vec4(mix(uDepth, uInk, vFog), 0.35 * (1.0 - vFog));
      #include <colorspace_fragment>
      return;
    }
    float iso = abs(fract(vH * 12.0 + 0.5) - 0.5);
    float onLine = (1.0 - smoothstep(0.03, 0.07, iso)) * step(0.04, vH);
    vec3 col = mix(uDepth, uMist, smoothstep(0.0, 0.8, vH));
    col = mix(col, uSurvey, onLine * 0.8);
    gl_FragColor = vec4(mix(col, uInk, vFog), 1.0 - vFog * 0.9);
    #include <colorspace_fragment>
  }
`

function buildPlane() {
  const white = new MeshStandardMaterial({ color: '#E9EDEB', roughness: 0.55, metalness: 0.1 })
  const orange = new MeshStandardMaterial({ color: '#FF5B1F', roughness: 0.5 })
  const dark = new MeshStandardMaterial({ color: '#1E3A46', roughness: 0.7 })
  const g = new Group()
  const body = new Mesh(new CylinderGeometry(0.55, 0.35, 6, 12), white)
  body.rotation.x = Math.PI / 2
  g.add(body)
  const nose = new Mesh(new SphereGeometry(0.56, 12, 8), white)
  nose.position.z = -3
  g.add(nose)
  const stripe = new Mesh(new CylinderGeometry(0.57, 0.5, 0.5, 12), orange)
  stripe.rotation.x = Math.PI / 2
  stripe.position.z = -0.6
  g.add(stripe)
  const wing = new Mesh(new BoxGeometry(11, 0.12, 1.5), white)
  wing.position.set(0, 0.55, -0.6)
  g.add(wing)
  const tips = [-5.4, 5.4].map((x) => {
    const t = new Mesh(new BoxGeometry(0.3, 0.13, 1.5), orange)
    t.position.set(x, 0.55, -0.6)
    return t
  })
  g.add(...tips)
  const tailplane = new Mesh(new BoxGeometry(3.6, 0.1, 0.9), white)
  tailplane.position.set(0, 0.2, 2.8)
  g.add(tailplane)
  const fin = new Mesh(new BoxGeometry(0.1, 1.4, 1), orange)
  fin.position.set(0, 0.8, 2.8)
  g.add(fin)
  for (const x of [-1.2, 1.2]) {
    const float = new Mesh(new CylinderGeometry(0.28, 0.2, 5, 8), dark)
    float.rotation.x = Math.PI / 2
    float.position.set(x, -1.3, -0.3)
    g.add(float)
    const strut = new Mesh(new BoxGeometry(0.08, 1, 0.08), dark)
    strut.position.set(x * 0.7, -0.7, -0.6)
    strut.rotation.z = x > 0 ? -0.5 : 0.5
    g.add(strut)
  }
  const prop = new Mesh(new BoxGeometry(2.2, 0.12, 0.05), dark)
  prop.position.z = -3.5
  g.add(prop)
  g.userData.prop = prop
  return g
}

export async function createSim(root, { waypoints, onArrive, onExit }) {
  const canvas = root.querySelector('canvas')
  const dem = await loadHeights('/media/island/archipelago.png')
  const heightAt = (x, z) => {
    if (!dem) return 0
    const u = Math.abs((x / SIZE + 0.5) * TILE)
    const v = Math.abs((z / SIZE + 0.5) * TILE)
    return Math.max(0, dem(mirror(u), mirror(v)) - 0.2) * AMP
  }

  // Terrain as a surveyed point cloud; water as one dark plane.
  const N = matchMedia('(max-width: 760px)').matches ? 260 : 380
  const pos = []
  const hs = []
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const x = (i / (N - 1) - 0.5) * SIZE
      const z = (j / (N - 1) - 0.5) * SIZE
      const h = heightAt(x, z)
      // Land only, plus a sparse survey grid on the water so the sea still reads as surveyed.
      if (h < 0.4 && (i % 6 || j % 6)) continue
      pos.push(x, h, z)
      hs.push(h < 0.4 ? -1 : Math.min(1, h / AMP))
    }
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  geo.setAttribute('aH', new BufferAttribute(new Float32Array(hs), 1))
  const ink = new Color('#0B1820')
  const terrain = new Points(geo, new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uPixel: { value: Math.min(devicePixelRatio, 1.5) },
      uMist: { value: new Color('#E9EDEB') },
      uSurvey: { value: new Color('#FF5B1F') },
      uDepth: { value: new Color('#2B4A56') },
      uInk: { value: ink },
    },
  }))
  const scene = new Scene()
  scene.background = ink
  scene.add(terrain)
  const water = new Mesh(new PlaneGeometry(SIZE * 1.6, SIZE * 1.6), new MeshBasicMaterial({ color: '#0E2029' }))
  water.rotation.x = -Math.PI / 2
  water.position.y = -0.2
  scene.add(water)
  scene.add(new HemisphereLight('#E9EDEB', '#0B1820', 1.4))
  const sun = new DirectionalLight('#ffd9b8', 1.6)
  sun.position.set(-1, 2, 1)
  scene.add(sun)

  // Waypoints: four high points spread across the chart, each with a beam and a pulsing ring.
  const candidates = []
  for (let j = 0; j < 36; j++) {
    for (let i = 0; i < 36; i++) {
      const x = (i / 35 - 0.5) * SIZE * 0.8
      const z = (j / 35 - 0.5) * SIZE * 0.8
      candidates.push({ x, z, h: heightAt(x, z) })
    }
  }
  candidates.sort((a, b) => b.h - a.h)
  const spots = []
  for (const c of candidates) {
    if (spots.length === waypoints.length) break
    if (spots.every((s) => Math.hypot(s.x - c.x, s.z - c.z) > 300)) spots.push(c)
  }
  const beamMat = new MeshBasicMaterial({ color: '#FF5B1F', transparent: true, opacity: 0.14, blending: AdditiveBlending, depthWrite: false, side: DoubleSide })
  const wps = spots.map((s, i) => {
    const beam = new Mesh(new CylinderGeometry(7, 9, 220, 24, 1, true), beamMat)
    beam.position.set(s.x, s.h + 110, s.z)
    const ring = new Mesh(new RingGeometry(14, 16, 48), beamMat.clone())
    ring.rotation.x = -Math.PI / 2
    ring.position.set(s.x, s.h + 1, s.z)
    scene.add(beam, ring)
    return { ...waypoints[i], x: s.x, z: s.z, h: s.h, beam, ring, visited: false }
  })

  const plane = buildPlane()
  scene.add(plane)
  const camera = new PerspectiveCamera(62, 1, 0.5, 900)
  const renderer = new WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
  const resize = () => {
    renderer.setSize(innerWidth, innerHeight, false)
    camera.aspect = innerWidth / innerHeight
    camera.updateProjectionMatrix()
  }
  addEventListener('resize', resize)
  resize()

  // Arcade flight model.
  const s = { x: 0, y: 60, z: SIZE * 0.42, yaw: 0, pitch: 0, roll: 0, speed: 32, paused: false }
  const keys = new Set()
  const drag = { on: false, x: 0, y: 0, dx: 0, dy: 0 }
  const onKey = (e) => {
    if (e.key === 'Escape') return exit()
    const k = e.key.toLowerCase()
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' ', 'shift'].includes(k)) {
      e.preventDefault()
      e.type === 'keydown' ? keys.add(k) : keys.delete(k)
    }
  }
  const onDown = (e) => {
    if (e.target.closest('button')) return
    drag.on = true
    drag.x = e.clientX
    drag.y = e.clientY
  }
  const onMove = (e) => {
    if (!drag.on) return
    drag.dx = Math.max(-1, Math.min(1, (e.clientX - drag.x) / 120))
    drag.dy = Math.max(-1, Math.min(1, (e.clientY - drag.y) / 120))
  }
  const onUp = () => Object.assign(drag, { on: false, dx: 0, dy: 0 })
  addEventListener('keydown', onKey)
  addEventListener('keyup', onKey)
  canvas.addEventListener('pointerdown', onDown)
  addEventListener('pointermove', onMove)
  addEventListener('pointerup', onUp)

  const hud = {
    alt: root.querySelector('[data-sim-alt]'),
    spd: root.querySelector('[data-sim-spd]'),
    hdg: root.querySelector('[data-sim-hdg]'),
    next: root.querySelector('[data-sim-next]'),
    arrow: root.querySelector('.sim__arrow'),
    msg: root.querySelector('[data-sim-msg]'),
  }
  let msgTimer = 0
  const say = (text, secs = 2.5) => {
    hud.msg.textContent = text
    hud.msg.classList.add('is-on')
    msgTimer = secs
  }
  say('Fly through an orange beam to land at a waypoint', 4)

  const fwd = new Vector3()
  const camPos = new Vector3(s.x, s.y + 8, s.z + 22)
  let last = performance.now()
  let raf = 0
  let running = true
  const frame = (now) => {
    if (!running) return
    raf = requestAnimationFrame(frame)
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    if (!s.paused) {
      const left = keys.has('arrowleft') || keys.has('a')
      const right = keys.has('arrowright') || keys.has('d')
      const up = keys.has('arrowup') || keys.has('w')
      const down = keys.has('arrowdown') || keys.has('s')
      const boost = keys.has(' ') || keys.has('shift') || root.classList.contains('is-boost')
      const turn = (right ? 1 : 0) - (left ? 1 : 0) + drag.dx
      const climb = (up ? 1 : 0) - (down ? 1 : 0) - drag.dy
      s.roll += (turn * 0.75 - s.roll) * Math.min(1, dt * 3)
      s.pitch += (climb * 0.38 - s.pitch) * Math.min(1, dt * 2.5)
      s.yaw -= s.roll * dt * 1.1
      s.speed += ((boost ? 52 : 32) - s.speed) * Math.min(1, dt * 1.5)
      fwd.set(-Math.sin(s.yaw) * Math.cos(s.pitch), Math.sin(s.pitch), -Math.cos(s.yaw) * Math.cos(s.pitch))
      s.x += fwd.x * s.speed * dt
      s.y += fwd.y * s.speed * dt
      s.z += fwd.z * s.speed * dt
      // Ground and ceiling: skim the water on the floats, pull up over rock.
      const ground = Math.max(heightAt(s.x, s.z) + 4, 2.2)
      if (s.y < ground) {
        if (heightAt(s.x, s.z) > 1) say('Pull up!', 1.2)
        s.y = ground
        s.pitch = Math.max(s.pitch, 0.05)
      }
      s.y = Math.min(s.y, 180)
      // Edge of the chart: turn back towards the middle.
      const edge = SIZE * 0.47
      if (Math.abs(s.x) > edge || Math.abs(s.z) > edge) {
        s.x = Math.max(-edge, Math.min(edge, s.x))
        s.z = Math.max(-edge, Math.min(edge, s.z))
        s.yaw += dt * 1.6
        say('Edge of the chart. Turning back.', 1.4)
      }
      // Arrivals.
      for (const w of wps) {
        if (!w.visited && Math.hypot(s.x - w.x, s.z - w.z) < 12 && s.y < w.h + 220) {
          w.visited = true
          w.beam.material = w.beam.material.clone()
          w.beam.material.opacity = 0.08
          s.paused = true
          onArrive(w, wps.filter((v) => v.visited).length, wps.length)
        }
      }
    }
    plane.position.set(s.x, s.y, s.z)
    plane.rotation.set(s.pitch, s.yaw, -s.roll, 'YXZ')
    plane.userData.prop.rotation.z += dt * 40
    const back = new Vector3(Math.sin(s.yaw) * 22, 7, Math.cos(s.yaw) * 22)
    camPos.lerp(new Vector3(s.x, s.y, s.z).add(back), Math.min(1, dt * 3))
    camera.position.copy(camPos)
    camera.lookAt(s.x - Math.sin(s.yaw) * 10, s.y + 2, s.z - Math.cos(s.yaw) * 10)
    const t = now / 1000
    for (const w of wps) {
      const p = 1 + ((t * 0.6) % 1) * 1.6
      w.ring.scale.setScalar(p)
      w.ring.material.opacity = (w.visited ? 0.05 : 0.4) * (1 - (p - 1) / 1.6)
    }
    // HUD.
    hud.alt.textContent = String(Math.round(s.y * 3)).padStart(3, '0')
    hud.spd.textContent = String(Math.round(s.speed * 2.2)).padStart(3, '0')
    hud.hdg.textContent = String(Math.round((((-s.yaw * 180) / Math.PI) % 360 + 360) % 360)).padStart(3, '0')
    const next = wps.filter((w) => !w.visited).sort((a, b) => Math.hypot(s.x - a.x, s.z - a.z) - Math.hypot(s.x - b.x, s.z - b.z))[0]
    if (next) {
      const bearing = Math.atan2(-(next.x - s.x), -(next.z - s.z))
      hud.arrow.style.transform = `rotate(${((s.yaw - bearing) * 180) / Math.PI}deg)`
      hud.next.textContent = `${next.code} · ${Math.round(Math.hypot(s.x - next.x, s.z - next.z) * 3)} m`
    } else {
      hud.next.textContent = 'All waypoints visited'
    }
    if (msgTimer > 0 && (msgTimer -= dt) <= 0) hud.msg.classList.remove('is-on')
    renderer.render(scene, camera)
  }
  raf = requestAnimationFrame(frame)

  function exit() {
    running = false
    cancelAnimationFrame(raf)
    removeEventListener('keydown', onKey)
    removeEventListener('keyup', onKey)
    removeEventListener('pointermove', onMove)
    removeEventListener('pointerup', onUp)
    removeEventListener('resize', resize)
    renderer.dispose()
    geo.dispose()
    onExit()
  }

  return {
    resume() {
      s.paused = false
      last = performance.now()
    },
    exit,
  }
}
