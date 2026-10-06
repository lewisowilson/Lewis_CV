// Cloud deck: one signature transition. Between the dawn flight and the first page section,
// the camera punches down through a bank of cloud; scroll drives it both ways.
const FS = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uP;     // 0..1 through the cloud bank
uniform float uTime;
uniform vec3 uTint;
out vec4 o;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; } return v; }
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = uv * vec2(uRes.x / uRes.y, 1.0) * 2.2;
  // Clouds rush upward as we descend, plus a slow drift.
  p.y -= uP * 3.5;
  p.x += uTime * 0.02;
  float d = fbm(p + fbm(p * 1.7 + uTime * 0.03));
  // Density peaks mid-transition; edges of the bank are wispy.
  // Coverage peaks sharply at the middle: wisps, a brief white-out, wisps.
  float cover = pow(sin(uP * 3.14159), 4.0);
  float a = clamp((d - (1.0 - cover * 1.15)) * 3.2, 0.0, 1.0);
  vec3 col = mix(uTint * 0.82, vec3(0.96, 0.97, 0.97), d);
  o = vec4(col, a);
}`
const VS = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

export function cloudDeck(canvas) {
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: false })
  if (!gl) return null
  const sh = (t, s) => {
    const x = gl.createShader(t)
    gl.shaderSource(x, s)
    gl.compileShader(x)
    return x
  }
  const prog = gl.createProgram()
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS))
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null
  gl.useProgram(prog)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'aPos')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
  const u = Object.fromEntries(['uRes', 'uP', 'uTime', 'uTint'].map((n) => [n, gl.getUniformLocation(prog, n)]))
  gl.uniform3f(u.uTint, 0.86, 0.89, 0.9)
  let p = 0
  let raf = 0
  const scale = 0.5 // clouds are soft: render at half resolution
  const resize = () => {
    canvas.width = Math.round(innerWidth * scale)
    canvas.height = Math.round(innerHeight * scale)
    gl.viewport(0, 0, canvas.width, canvas.height)
  }
  addEventListener('resize', resize)
  resize()
  const frame = (now) => {
    raf = 0
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.uniform2f(u.uRes, canvas.width, canvas.height)
    gl.uniform1f(u.uP, p)
    gl.uniform1f(u.uTime, now / 1000)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    if (p > 0 && p < 1) raf = requestAnimationFrame(frame)
  }
  return {
    set(progress) {
      p = progress
      canvas.style.visibility = p > 0 && p < 1 ? 'visible' : 'hidden'
      if (!raf && p > 0 && p < 1) raf = requestAnimationFrame(frame)
    },
    get inside() {
      return p > 0.2 && p < 0.8
    },
  }
}
