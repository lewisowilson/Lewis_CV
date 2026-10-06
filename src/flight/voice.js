// Lewis's voice pitch: contour rings ripple around the portrait in time with his voice.
// Only appears once /media/voice/pitch.mp3 exists; captions come from pitch.vtt if present.
const SRC = '/media/voice/pitch.mp3'
const VTT = '/media/voice/pitch.vtt'

export async function voicePitch(figure) {
  const btn = figure.querySelector('[data-voice]')
  const ok = await fetch(SRC, { method: 'HEAD' }).then((r) => r.ok && /audio/.test(r.headers.get('content-type') ?? ''), () => false)
  if (!ok) return
  btn.hidden = false
  const label = btn.querySelector('[data-voice-label]')
  const canvas = figure.querySelector('.voice__rings')
  const caption = figure.querySelector('.voice__caption')
  const ctx2d = canvas.getContext('2d')
  const audio = new Audio()
  audio.src = SRC
  audio.preload = 'none'
  const hasVtt = await fetch(VTT, { method: 'HEAD' }).then((r) => r.ok, () => false)
  if (hasVtt) {
    const track = document.createElement('track')
    track.kind = 'captions'
    track.src = VTT
    track.default = true
    audio.appendChild(track)
    audio.textTracks[0].mode = 'hidden'
    audio.textTracks[0].addEventListener('cuechange', (e) => {
      caption.textContent = [...(e.target.activeCues ?? [])].map((c) => c.text).join(' ')
    })
  }
  let analyser = null
  let data = null
  let raf = 0
  let level = 0
  const draw = () => {
    raf = requestAnimationFrame(draw)
    const dpr = Math.min(devicePixelRatio, 2)
    const { width, height } = canvas.getBoundingClientRect()
    if (canvas.width !== Math.round(width * dpr)) {
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
    }
    analyser.getByteFrequencyData(data)
    let sum = 0
    for (let i = 2; i < 40; i++) sum += data[i]
    level += (sum / (38 * 255) - level) * 0.25
    const w = canvas.width
    const h = canvas.height
    ctx2d.clearRect(0, 0, w, h)
    const t = performance.now() / 1000
    for (let r = 0; r < 7; r++) {
      const base = Math.min(w, h) * (0.32 + r * 0.075)
      ctx2d.beginPath()
      for (let a = 0; a <= 64; a++) {
        const ang = (a / 64) * Math.PI * 2
        const wobble = Math.sin(ang * 3 + t * 1.3 + r) * 0.5 + Math.sin(ang * 5 - t * 0.9 + r * 2) * 0.5
        const rad = base * (1 + wobble * level * (0.08 + r * 0.02))
        const x = w / 2 + Math.cos(ang) * rad
        const y = h * 0.45 + Math.sin(ang) * rad * 1.15
        a ? ctx2d.lineTo(x, y) : ctx2d.moveTo(x, y)
      }
      ctx2d.strokeStyle = r % 3 === 0 ? `rgba(255, 91, 31, ${0.25 + level * 0.7})` : `rgba(233, 237, 235, ${0.1 + level * 0.35})`
      ctx2d.lineWidth = dpr * (r % 3 === 0 ? 1.4 : 1)
      ctx2d.stroke()
    }
  }
  const stop = () => {
    cancelAnimationFrame(raf)
    figure.classList.remove('is-speaking')
    label.textContent = 'Hear Lewis · 30 s'
    caption.textContent = ''
    ctx2d.clearRect(0, 0, canvas.width, canvas.height)
  }
  audio.addEventListener('ended', stop)
  btn.addEventListener('click', async () => {
    if (!audio.paused) {
      audio.pause()
      return stop()
    }
    if (!analyser) {
      const ac = new AudioContext()
      const srcNode = ac.createMediaElementSource(audio)
      analyser = ac.createAnalyser()
      analyser.fftSize = 256
      data = new Uint8Array(analyser.frequencyBinCount)
      srcNode.connect(analyser)
      analyser.connect(ac.destination)
    }
    await audio.play()
    figure.classList.add('is-speaking')
    label.textContent = 'Pause'
    draw()
  })
}
