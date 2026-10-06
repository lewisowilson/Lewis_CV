// Career terrain: real milestones as peaks in a 3D topographic landscape, grouped into ranges.
// Height is a visual weight, not a score. Hovering or focusing a marker lights its peak.
import {
  BufferAttribute,
  Color,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector3,
  WebGLRenderer,
} from 'three'

export const RANGES = [
  { name: 'Academic', x: -30, z: -6 },
  { name: 'Building', x: -10, z: 10 },
  { name: 'Work', x: 10, z: -10 },
  { name: 'Sport & Expedition', x: 30, z: 6 },
  { name: 'Certifications', x: 0, z: -22 },
]

// [range index, label, detail, height 0..1, dx, dz]
export const PEAKS = [
  [0, 'BSc Maths with Economics', 'University of Exeter, 2025-2029. Placement year 2027-28.', 1.0, 0, 0],
  [0, 'A* Economics', 'A-Level, Royal Grammar School, 2025.', 0.9, -6, 5],
  [0, 'A-Levels: Maths A, Physics A', 'Royal Grammar School, 2023-2025.', 0.62, 5, 6],
  [0, '11 GCSEs', 'Weydon School, average grade 7.', 0.38, -2, -7],
  [1, 'Co-founded The Construx Group', 'Web Director, Jan-Sept 2026.', 1.0, 0, 0],
  [1, 'Booking & reservations platform', 'Next.js, AWS Amplify, DynamoDB.', 0.82, 7, 4],
  [1, 'Claude ↔ Codex agent bridge', 'Two agents cross-checking each other.', 0.72, -6, 5],
  [1, '"Hybrid by Design" whitepaper', '20 pages, 49 primary sources, for Space01.', 0.66, 5, -6],
  [1, 'TutorTime', 'Tutor management app, React + Supabase.', 0.58, -6, -5],
  [2, 'Reassure: actuarial placement', 'Pricing calculator, code and data tables.', 0.74, 0, 0],
  [2, 'MDF Tuition: A-Level tutor', 'Economics & Maths, March 2025 onwards.', 0.62, 6, 4],
  [2, 'Space01: product placement', 'Built a digital product in a week, 2022.', 0.48, -5, 5],
  [2, 'Business club leader', 'Weydon School, 2022-2023.', 0.36, 4, -6],
  [3, 'British Champion 2023', 'Taekwondo, U18 sparring.', 1.08, 0, 0],
  [3, 'English Silver 2022 & 2024', 'National Bronze 2023.', 0.72, 6, -4],
  [3, 'Duke of Edinburgh Gold', 'Including a 4-day Brecon Beacons expedition.', 0.76, -6, 4],
  [3, 'Scotland, coast to coast', 'Planned and led it on foot, unsupported, at 15.', 0.66, 5, 6],
  [3, 'Canoe expeditions', 'Remote Sweden and Finland.', 0.56, -5, -6],
  [3, 'NASA / KCL Physics Camp', "King's College London.", 0.46, 9, 2],
  [4, 'Hugging Face: AI Agents', 'Sept 2026.', 0.42, -9, 0],
  [4, 'Harvard CS50: SQL', '2026.', 0.42, -3, 2],
  [4, 'PyTorch fundamentals', '2026.', 0.4, 3, -1],
  [4, 'Kaggle: Intro to Deep Learning', '2026.', 0.4, 9, 1],
]

const SIZE_X = 190
const SIZE_Z = 150
const AMP = 11

export function heightAt(x, z, peaks) {
  let h = 0
  for (const p of peaks) {
    const dx = x - p.x
    const dz = z - p.z
    h += p.h * Math.exp(-(dx * dx + dz * dz) / (2 * p.r * p.r))
  }
  // Gentle ridges joining each range's peaks, plus a little terrain noise.
  h += 0.012 * Math.sin(x * 0.31) * Math.cos(z * 0.27) + 0.006 * Math.sin(x * 0.9 + z * 0.7)
  return Math.max(0, h)
}

const vertex = /* glsl */ `
  varying float vH;
  varying vec3 vWorld;
  varying float vDepth;
  void main() {
    vH = position.y / ${AMP.toFixed(1)};
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vec4 mv = viewMatrix * world;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`

const fragment = /* glsl */ `
  uniform vec3 uInk;
  uniform vec3 uDepthCol;
  uniform vec3 uMist;
  uniform vec3 uSurvey;
  uniform vec3 uHover;
  uniform float uHoverOn;
  uniform float uReveal;
  uniform float uTime;
  varying float vH;
  varying vec3 vWorld;
  varying float vDepth;
  void main() {
    // Shading from screen-space normals: faces turned to the light are lifted slightly.
    vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
    float light = clamp(dot(n, normalize(vec3(-0.4, 0.9, 0.3))), 0.0, 1.0);
    vec3 base = mix(uInk, uDepthCol, smoothstep(0.0, 0.9, vH) * 0.9) * (0.55 + 0.6 * light);

    // Contours: minor every 1/24 of height, index every 5th in survey orange.
    float v = vH * 24.0;
    float minor = 1.0 - min(abs(fract(v - 0.5) - 0.5) / fwidth(v), 1.0);
    float majorMask = 1.0 - step(0.5, abs(mod(floor(v + 0.5), 5.0)));
    vec3 col = base;
    col = mix(col, uMist, minor * 0.13 * step(0.015, vH));
    col = mix(col, uSurvey, minor * majorMask * 0.85 * step(0.015, vH));

    // Hovered peak: a glowing ring of contours around it.
    float d = distance(vWorld.xz, uHover.xz);
    float halo = uHoverOn * (1.0 - smoothstep(0.0, 9.0, d));
    col = mix(col, uSurvey, minor * halo * 0.9);
    col += uSurvey * halo * 0.06;

    // Reveal sweeps outward from the centre; fog melts the far edge into the page.
    float reveal = smoothstep(uReveal * 70.0 - 6.0, uReveal * 70.0, length(vWorld.xz));
    float fog = max(smoothstep(80.0, 150.0, vDepth), smoothstep(46.0, 70.0, length(vWorld.xz * vec2(0.8, 1.15))));
    col = mix(col, uInk, max(fog, reveal));
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`

export function createCareerTerrain(canvas, { onFrame } = {}) {
  const peaks = PEAKS.map(([r, label, detail, h, dx, dz]) => ({
    range: r,
    label,
    detail,
    h,
    x: RANGES[r].x + dx,
    z: RANGES[r].z + dz,
    r: 2.6 + h * 1.6,
  }))

  const small = matchMedia('(max-width: 760px)').matches
  const geo = new PlaneGeometry(SIZE_X, SIZE_Z, small ? 200 : 380, small ? 158 : 300)
  geo.rotateX(-Math.PI / 2)
  const pos = geo.getAttribute('position')
  for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i), peaks) * AMP)
  geo.setAttribute('position', new BufferAttribute(pos.array, 3))

  const material = new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      uInk: { value: new Color('#0B1820') },
      uDepthCol: { value: new Color('#1E3A46') },
      uMist: { value: new Color('#E9EDEB') },
      uSurvey: { value: new Color('#FF5B1F') },
      uHover: { value: new Vector3(0, 0, 0) },
      uHoverOn: { value: 0 },
      uReveal: { value: 0 },
      uTime: { value: 0 },
    },
  })
  material.extensions = { derivatives: true }

  const scene = new Scene()
  scene.add(new Mesh(geo, material))
  const camera = new PerspectiveCamera(32, 1, 0.1, 400)
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' })
  renderer.setClearColor('#0B1820')
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 1.75))

  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect()
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }
  new ResizeObserver(resize).observe(canvas)
  resize()

  const state = { orbit: 0, pointerX: 0, pointerY: 0, px: 0, py: 0, hover: -1, hoverOn: 0, reveal: 0 }
  canvas.parentElement.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect()
    state.pointerX = ((e.clientX - r.left) / r.width - 0.5) * 2
    state.pointerY = ((e.clientY - r.top) / r.height - 0.5) * 2
  }, { passive: true })

  const v = new Vector3()
  const project = (p) => {
    v.set(p.x, heightAt(p.x, p.z, peaks) * AMP + 0.6, p.z).project(camera)
    return { x: (v.x * 0.5 + 0.5) * 100, y: (-v.y * 0.5 + 0.5) * 100, visible: v.z < 1 }
  }

  let running = false
  const t0 = performance.now()
  const frame = (now) => {
    if (!running) return
    const t = (now - t0) / 1000
    state.px += (state.pointerX - state.px) * 0.05
    state.py += (state.pointerY - state.py) * 0.05
    const angle = -0.55 + state.orbit * 0.9 + state.px * 0.18 + Math.sin(t * 0.08) * 0.04
    const dist = small ? 118 : 96
    const elev = 0.62 - state.py * 0.06
    camera.position.set(Math.sin(angle) * dist * Math.cos(elev), Math.sin(elev) * dist, Math.cos(angle) * dist * Math.cos(elev))
    camera.lookAt(0, 3, 0)
    state.hoverOn += ((state.hover >= 0 ? 1 : 0) - state.hoverOn) * 0.12
    if (state.hover >= 0) material.uniforms.uHover.value.set(peaks[state.hover].x, 0, peaks[state.hover].z)
    material.uniforms.uHoverOn.value = state.hoverOn
    material.uniforms.uReveal.value = state.reveal
    material.uniforms.uTime.value = t
    renderer.render(scene, camera)
    onFrame?.(peaks.map(project))
    requestAnimationFrame(frame)
  }

  return {
    peaks,
    state,
    start() { if (!running) { running = true; requestAnimationFrame(frame) } },
    stop() { running = false },
  }
}
