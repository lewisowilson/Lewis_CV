// Live topographic contour field: isolines of a drifting noise height-field that bend
// around the cursor. Raw WebGL2, one full-screen triangle, a few KB.
const frag = /* glsl */ `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform vec2 uMouse;
uniform float uTime;
uniform float uStrength;
out vec4 outColor;

vec2 hash(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(dot(hash(i), f), dot(hash(i + vec2(1, 0)), f - vec2(1, 0)), u.x),
             mix(dot(hash(i + vec2(0, 1)), f - vec2(0, 1)), dot(hash(i + vec2(1, 1)), f - vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = uv * vec2(uRes.x / uRes.y, 1.0) * 2.2;
  float h = fbm(p + vec2(uTime * 0.012, uTime * 0.006));
  // A soft hill under the cursor pushes the contours outward around it.
  vec2 m = uMouse * vec2(uRes.x / uRes.y, 1.0) * 2.2;
  float d = distance(p, m);
  h += uStrength * 0.22 * exp(-d * d * 2.4);

  float v = h * 26.0;
  float line = 1.0 - min(abs(fract(v - 0.5) - 0.5) / fwidth(v), 1.0);
  float major = 1.0 - step(0.5, abs(mod(floor(v + 0.5), 5.0)));
  vec3 mist = vec3(0.914, 0.929, 0.922);
  vec3 survey = vec3(1.0, 0.357, 0.122);
  vec3 col = mix(mist, survey, major * 0.85);
  float alpha = line * mix(0.16, 0.42, major);
  // Lines near the cursor glow slightly, like a survey instrument picking them up.
  alpha *= 1.0 + uStrength * 1.2 * exp(-d * d * 3.0);
  outColor = vec4(col * alpha, alpha);
}`

const vert = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

export function contourField(canvas) {
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: false, alpha: true })
  if (!gl) return null
  const compile = (type, src) => {
    const s = gl.createShader(type)
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s))
    return s
  }
  const prog = gl.createProgram()
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vert))
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag))
  gl.linkProgram(prog)
  gl.useProgram(prog)
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'aPos')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  const u = Object.fromEntries(['uRes', 'uMouse', 'uTime', 'uStrength'].map((n) => [n, gl.getUniformLocation(prog, n)]))

  const dpr = Math.min(devicePixelRatio || 1, 1.5)
  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect()
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    gl.viewport(0, 0, canvas.width, canvas.height)
  }
  new ResizeObserver(resize).observe(canvas)
  resize()

  const mouse = { x: 0.7, y: 0.3, tx: 0.7, ty: 0.3, s: 0, ts: 0 }
  addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect()
    mouse.tx = (e.clientX - r.left) / r.width
    mouse.ty = 1 - (e.clientY - r.top) / r.height
    mouse.ts = 1
  }, { passive: true })
  document.addEventListener('pointerleave', () => (mouse.ts = 0))

  let running = false
  const start = performance.now()
  const frame = (now) => {
    if (!running) return
    mouse.x += (mouse.tx - mouse.x) * 0.08
    mouse.y += (mouse.ty - mouse.y) * 0.08
    mouse.s += (mouse.ts - mouse.s) * 0.04
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.uniform2f(u.uRes, canvas.width, canvas.height)
    gl.uniform2f(u.uMouse, mouse.x, mouse.y)
    gl.uniform1f(u.uTime, (now - start) / 1000)
    gl.uniform1f(u.uStrength, mouse.s)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    requestAnimationFrame(frame)
  }
  return {
    start() { if (!running) { running = true; requestAnimationFrame(frame) } },
    stop() { running = false },
  }
}
