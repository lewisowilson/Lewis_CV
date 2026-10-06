// Night sky: a starfield and slow aurora curtains, drawn in one fragment shader.
const frag = /* glsl */ `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uOn;
out vec4 outColor;

float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 45758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y);

  // Stars: sparse, twinkling, fading towards the horizon.
  vec2 g = floor(p * 220.0);
  float s = step(0.9965, hash(g)) * (0.5 + 0.5 * sin(uTime * 2.0 + hash(g + 3.1) * 40.0));
  float stars = s * smoothstep(0.45, 0.9, uv.y);

  // Aurora: vertical curtains whose base wanders with noise.
  float t = uTime * 0.035;
  float base = 0.52 + 0.08 * sin(p.x * 1.7 + t * 3.0) + 0.06 * fbm(vec2(p.x * 1.4, t));
  float h = uv.y - base;
  float curtain = fbm(vec2(p.x * 3.2 + t * 2.0, t * 0.6)) * fbm(vec2(p.x * 9.0 - t, uv.y * 0.6));
  float band = smoothstep(-0.02, 0.06, h) * exp(-max(h, 0.0) * 4.2) * curtain * 2.4;
  vec3 green = vec3(0.24, 0.95, 0.6);
  vec3 teal = vec3(0.1, 0.6, 0.75);
  vec3 violet = vec3(0.55, 0.3, 0.8);
  vec3 col = mix(green, teal, smoothstep(0.0, 0.25, h)) + violet * smoothstep(0.18, 0.42, h) * 0.35;
  vec3 aur = col * band;
  // Fade out at the horizon so it sits behind the islands.
  float horizon = smoothstep(0.36, 0.5, uv.y);
  vec3 outc = (aur * horizon + vec3(stars)) * uOn;
  float a = clamp(max(max(outc.r, outc.g), outc.b), 0.0, 1.0);
  outColor = vec4(outc, a);
}`

const vert = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

export function aurora(canvas) {
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, alpha: true, antialias: false })
  if (!gl) return null
  const sh = (type, src) => {
    const s = gl.createShader(type)
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s))
    return s
  }
  const prog = gl.createProgram()
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vert))
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, frag))
  gl.linkProgram(prog)
  gl.useProgram(prog)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'aPos')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  const u = { res: gl.getUniformLocation(prog, 'uRes'), time: gl.getUniformLocation(prog, 'uTime'), on: gl.getUniformLocation(prog, 'uOn') }
  const dpr = Math.min(devicePixelRatio || 1, 1.25)
  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect()
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    gl.viewport(0, 0, canvas.width, canvas.height)
  }
  new ResizeObserver(resize).observe(canvas)
  resize()
  let running = false
  let on = 0
  let target = 0
  const t0 = performance.now()
  const frame = (now) => {
    if (!running) return
    on += (target - on) * 0.03
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.uniform2f(u.res, canvas.width, canvas.height)
    gl.uniform1f(u.time, (now - t0) / 1000)
    gl.uniform1f(u.on, on)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    if (target === 0 && on < 0.002) {
      running = false
      return
    }
    requestAnimationFrame(frame)
  }
  const start = () => {
    if (!running) {
      running = true
      requestAnimationFrame(frame)
    }
  }
  return {
    show(v) {
      target = v ? 1 : 0
      if (v) start()
      else if (running === false && on > 0) start()
    },
    pause() {
      running = false
    },
    resume() {
      if (target > 0 || on > 0.002) start()
    },
  }
}
