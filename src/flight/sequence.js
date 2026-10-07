// Scroll-scrubbed image sequence on a <canvas> (the approach Apple uses for product pages).
// Frames load progressively, nearest-loaded frame is drawn, and drawing is cover-fit with DPR.

// Film look, applied to every frame on the GPU: split-tone grade, halation around highlights,
// luminance-weighted grain that keeps moving (24 fps), soft vignette and a whisper of edge fringing.
const FILM_VS = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; vUv.y = 1.0 - vUv.y; gl_Position = vec4(aPos, 0.0, 1.0); }`
const FILM_FS = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uScale;   // cover-fit: how much of the image is visible
uniform vec2 uRes;
uniform float uTime;
uniform float uGrain;
uniform float uWarm;  // 1 = golden split-tone, 0 = neutral (fog)
in vec2 vUv;
out vec4 o;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec3 tap(vec2 uv) { return texture(uTex, (uv - 0.5) * uScale + 0.5).rgb; }
void main() {
  vec2 c = vUv - 0.5;
  float edge = dot(c, c);
  // Edge fringing: tiny RGB offset that only exists towards the corners.
  vec2 ca = c * edge * 0.012;
  vec3 col = vec3(tap(vUv + ca).r, tap(vUv).g, tap(vUv - ca).b);
  // Halation: bright areas bloom a warm, survey-orange glow into their surroundings.
  vec3 glow = vec3(0.0);
  vec2 px = 1.0 / uRes;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7853982;
    vec3 s = tap(vUv + vec2(cos(a), sin(a)) * px * 9.0);
    glow += max(s - 0.72, 0.0);
  }
  col += glow * mix(vec3(0.9, 0.95, 1.0), vec3(1.0, 0.42, 0.18), uWarm) * 0.16;
  // Split-tone grade: cool shadows, warm highlights, gentle S-curve.
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(col, mix(col * vec3(0.94, 1.0, 1.06), col * vec3(1.05, 1.0, 0.94), smoothstep(0.25, 0.8, l)), uWarm);
  col = mix(col, col * col * (3.0 - 2.0 * col), 0.18);
  // Grain: stronger in the shadows, like film; re-seeded 24 times a second.
  float g = hash(gl_FragCoord.xy + floor(uTime * 24.0) * 17.0) - 0.5;
  col += g * uGrain * (1.15 - l);
  // Vignette.
  col *= 1.0 - edge * 0.55;
  o = vec4(col, 1.0);
}`

export class FrameSequence {
  constructor(canvas, { base, count, poster, film = false }) {
    this.canvas = canvas
    this.gl = film ? this.initFilm(canvas) : null
    this.ctx = this.gl ? null : canvas.getContext('2d', { alpha: false })
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

  initFilm(canvas) {
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: false })
    if (!gl) return null
    const sh = (type, src) => {
      const s = gl.createShader(type)
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null
    }
    const vs = sh(gl.VERTEX_SHADER, FILM_VS)
    const fs = sh(gl.FRAGMENT_SHADER, FILM_FS)
    if (!vs || !fs) return null
    const prog = gl.createProgram()
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null
    gl.useProgram(prog)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'aPos')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    this.tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, this.tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    this.u = Object.fromEntries(['uTex', 'uScale', 'uRes', 'uTime', 'uGrain', 'uWarm'].map((n) => [n, gl.getUniformLocation(prog, n)]))
    gl.uniform1f(this.u.uGrain, matchMedia('(max-width: 760px)').matches ? 0.045 : 0.06)
    gl.uniform1f(this.u.uWarm, 1)
    // Grain keeps moving while the canvas is on screen, at film rate.
    this.visible = false
    new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting
      if (this.visible) this.loop()
    }).observe(canvas)
    return gl
  }

  loop() {
    if (this.looping) return
    this.looping = true
    let last = 0
    const step = (now) => {
      if (!this.visible || document.hidden) return (this.looping = false)
      requestAnimationFrame(step)
      if (now - last < 1000 / 24) return
      last = now
      this.render()
    }
    requestAnimationFrame(step)
  }

  render() {
    const gl = this.gl
    if (!gl || !this.texSize) return
    const { width: cw, height: ch } = this.canvas
    gl.viewport(0, 0, cw, ch)
    // Cover-fit: scale UVs so the image fills the canvas without stretching.
    const ia = this.texSize[0] / this.texSize[1]
    const ca = cw / ch
    gl.uniform2f(this.u.uScale, ca < ia ? ca / ia : 1, ca < ia ? 1 : ia / ca)
    gl.uniform2f(this.u.uRes, cw, ch)
    gl.uniform1f(this.u.uTime, performance.now() / 1000)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  /** Film grade warmth: 1 golden, 0 neutral. */
  setWarmth(w) {
    if (!this.gl) return
    this.gl.uniform1f(this.u.uWarm, w)
    this.render()
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
    if (this.gl) {
      const gl = this.gl
      gl.bindTexture(gl.TEXTURE_2D, this.tex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img)
      this.texSize = [img.naturalWidth, img.naturalHeight]
      return this.render()
    }
    const { width: cw, height: ch } = this.canvas
    const iw = img.naturalWidth
    const ih = img.naturalHeight
    const scale = Math.max(cw / iw, ch / ih)
    const w = iw * scale
    const h = ih * scale
    this.ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h)
  }
}
