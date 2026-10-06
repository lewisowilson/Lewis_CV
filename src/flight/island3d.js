// LiDAR island: a point cloud built from a height map that rises from a flat top-down scan
// into 3D terrain, ringed by survey-orange contour bands, with a sweeping survey pulse.
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from 'three'

const vertex = /* glsl */ `
  attribute float aHeight;
  attribute float aRand;
  uniform float uLift;
  uniform float uTime;
  uniform float uPixel;
  uniform float uPulse;
  varying float vHeight;
  varying float vPulse;
  varying float vRand;
  void main() {
    vec3 p = position;
    p.y = aHeight * 1.15 * uLift + aRand * 0.02;
    // Survey pulse: a band travelling across the island that lifts and brightens points.
    float band = 1.0 - smoothstep(0.0, 0.55, abs(p.x - uPulse));
    p.y += band * 0.12 * step(0.02, aHeight);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = mix(1.4, 2.6, aHeight) * (1.0 + band * 0.8);
    gl_PointSize = size * uPixel * (14.0 / -mv.z);
    vHeight = aHeight;
    vPulse = band;
    vRand = aRand;
  }
`

const fragment = /* glsl */ `
  uniform vec3 uMist;
  uniform vec3 uSurvey;
  uniform vec3 uDepth;
  uniform float uOpacity;
  varying float vHeight;
  varying float vPulse;
  varying float vRand;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    if (dot(c, c) > 0.25) discard;
    // Contour bands: points whose height sits on an isoline turn survey orange.
    float iso = abs(fract(vHeight * 9.0 + 0.5) - 0.5);
    float onLine = 1.0 - smoothstep(0.045, 0.09, iso);
    float isLand = step(0.03, vHeight);
    vec3 col = mix(uDepth, uMist, smoothstep(0.03, 0.5, vHeight));
    col = mix(col, uSurvey, onLine * isLand * 0.9);
    col += uSurvey * vPulse * 0.55 * isLand;
    float a = mix(0.18, 0.95, isLand) * (0.75 + vRand * 0.25) * uOpacity;
    gl_FragColor = vec4(col, a);
    #include <colorspace_fragment>
  }
`

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export async function createIsland(canvas, { src, density = 1 }) {
  const img = await loadImage(src)
  const W = Math.round(img.width * density)
  const H = Math.round(img.height * density)
  const ctx = Object.assign(document.createElement('canvas'), { width: W, height: H }).getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0, W, H)
  const data = ctx.getImageData(0, 0, W, H).data

  // Island points everywhere there is land; a sparse survey grid over the water.
  const pos = []
  const heights = []
  const rands = []
  const spanX = 16
  const spanZ = (spanX * H) / W
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const h = data[(y * W + x) * 4] / 255
      const land = h > 0.04
      if (!land && (x % 6 || y % 6)) continue
      const jx = (Math.random() - 0.5) / W
      const jy = (Math.random() - 0.5) / H
      pos.push((x / W - 0.5 + jx) * spanX, 0, (y / H - 0.5 + jy) * spanZ)
      heights.push(land ? h : 0)
      rands.push(Math.random())
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  geometry.setAttribute('aHeight', new BufferAttribute(new Float32Array(heights), 1))
  geometry.setAttribute('aRand', new BufferAttribute(new Float32Array(rands), 1))

  const material = new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uLift: { value: 0 },
      uTime: { value: 0 },
      uPulse: { value: -10 },
      uOpacity: { value: 0 },
      uPixel: { value: Math.min(devicePixelRatio, 1.75) },
      uMist: { value: new Color('#E9EDEB') },
      uSurvey: { value: new Color('#FF5B1F') },
      uDepth: { value: new Color('#1E3A46') },
    },
  })

  const scene = new Scene()
  const points = new Points(geometry, material)
  scene.add(points)
  const camera = new PerspectiveCamera(35, 1, 0.1, 100)
  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75))

  const state = { tilt: 0, lift: 0, opacity: 0, mx: 0, my: 0, tx: 0, ty: 0 }
  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect()
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }
  new ResizeObserver(resize).observe(canvas)
  resize()

  addEventListener('pointermove', (e) => {
    state.tx = (e.clientX / innerWidth - 0.5) * 2
    state.ty = (e.clientY / innerHeight - 0.5) * 2
  }, { passive: true })

  let running = false
  let t0 = performance.now()
  const frame = (now) => {
    if (!running) return
    const t = (now - t0) / 1000
    state.mx += (state.tx - state.mx) * 0.05
    state.my += (state.ty - state.my) * 0.05
    // Camera: straight down (matching the 2D scan) → three-quarter view as tilt goes 0 → 1.
    const fitDist = spanX / (2 * Math.tan((35 * Math.PI) / 360) * camera.aspect)
    // "cover" fit, matching how the 2D scan image fills the viewport, so the hand-over is seamless.
    const dist = Math.min(fitDist, (spanZ / 2) / Math.tan((35 * Math.PI) / 360)) * (1 + state.tilt * 0.15)
    const pitch = (Math.PI / 2) * (1 - state.tilt * 0.62) - state.my * 0.06 * state.tilt
    const yaw = state.tilt * (0.35 + Math.sin(t * 0.15) * 0.08) + state.mx * 0.25 * state.tilt
    camera.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist)
    camera.up.set(0, state.tilt < 0.01 ? 0 : 1, state.tilt < 0.01 ? -1 : 0)
    camera.lookAt(0, state.lift * 0.4, 0)
    material.uniforms.uLift.value = state.lift
    material.uniforms.uOpacity.value = state.opacity
    material.uniforms.uTime.value = t
    material.uniforms.uPulse.value = ((t * 2.2) % 26) - 13
    renderer.render(scene, camera)
    requestAnimationFrame(frame)
  }

  return {
    state,
    start() {
      if (running) return
      running = true
      t0 = performance.now() - 0
      requestAnimationFrame(frame)
    },
    stop() {
      running = false
    },
    count: heights.length,
  }
}
