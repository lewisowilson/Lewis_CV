// Opt-in sound, all synthesised (no files): wind that follows scroll speed, plus small foley.
// Off by default; the toggle remembers the visitor's choice. Nothing plays before a click.
let ac = null
let master = null
let wind = null

function pinkNoise(ctx, seconds = 4) {
  const len = ctx.sampleRate * seconds
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + w * 0.0555179
    b1 = 0.99332 * b1 + w * 0.0750759
    b2 = 0.969 * b2 + w * 0.153852
    b3 = 0.8665 * b3 + w * 0.3104856
    b4 = 0.55 * b4 + w * 0.5329522
    b5 = -0.7616 * b5 - w * 0.016898
    d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
    b6 = w * 0.115926
  }
  return buf
}

function start() {
  ac = new AudioContext()
  master = ac.createGain()
  master.gain.value = 0
  master.connect(ac.destination)
  // Wind: looping pink noise through a band-pass whose pitch and level ride the scroll speed.
  const src = ac.createBufferSource()
  src.buffer = pinkNoise(ac)
  src.loop = true
  const band = ac.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = 380
  band.Q.value = 0.7
  const low = ac.createBiquadFilter()
  low.type = 'lowpass'
  low.frequency.value = 2400
  const g = ac.createGain()
  g.gain.value = 0.25
  src.connect(band).connect(low).connect(g).connect(master)
  src.start()
  wind = { band, low, g }
}

// Short synthesised foley.
function burst({ dur = 0.05, freq = 3000, type = 'highpass', gain = 0.3, q = 1 } = {}) {
  if (!ac || master.gain.value < 0.01) return
  const t = ac.currentTime
  const src = ac.createBufferSource()
  src.buffer = pinkNoise(ac, dur + 0.05)
  const f = ac.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  const g = ac.createGain()
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f).connect(g).connect(master)
  src.start(t)
  src.stop(t + dur + 0.05)
}
function tone(freq, dur = 0.6, gain = 0.08) {
  if (!ac || master.gain.value < 0.01) return
  const t = ac.currentTime
  const o = ac.createOscillator()
  o.type = 'sine'
  o.frequency.value = freq
  const g = ac.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(master)
  o.start(t)
  o.stop(t + dur + 0.05)
}

const SFX = {
  flap: () => burst({ dur: 0.03, freq: 2600, gain: 0.25 }),
  tear: () => {
    for (let i = 0; i < 6; i++) setTimeout(() => burst({ dur: 0.05, freq: 1800 + i * 300, type: 'bandpass', q: 2, gain: 0.35 }), i * 28)
  },
  paper: () => burst({ dur: 0.18, freq: 1200, type: 'bandpass', q: 0.8, gain: 0.2 }),
  stamp: () => burst({ dur: 0.12, freq: 180, type: 'lowpass', gain: 0.8 }),
  chime: () => {
    tone(660, 0.9)
    setTimeout(() => tone(880, 1.1), 160)
  },
}

export function sfx(name) {
  SFX[name]?.()
}

// Called every frame-ish with scroll velocity (px/s) and whether the view is "in cloud".
export function updateWind(velocity, muffled = false) {
  if (!wind) return
  const v = Math.min(1, Math.abs(velocity) / 4000)
  const t = ac.currentTime
  wind.band.frequency.setTargetAtTime(320 + v * 900, t, 0.25)
  wind.g.gain.setTargetAtTime(0.18 + v * 0.55, t, 0.25)
  wind.low.frequency.setTargetAtTime(muffled ? 500 : 2400, t, 0.4)
}

export function setupAudio(button) {
  let on = false
  try {
    on = localStorage.getItem('lw-sound') === 'on'
  } catch {
    on = false
  }
  const apply = () => {
    button.setAttribute('aria-pressed', String(on))
    button.querySelector('[data-sound-label]').textContent = on ? 'Sound on' : 'Sound off'
    if (!ac) return
    master.gain.setTargetAtTime(on ? 0.6 : 0, ac.currentTime, 0.4)
    if (on) ac.resume()
  }
  const enable = () => {
    if (!ac) start()
    apply()
  }
  button.addEventListener('click', () => {
    on = !on
    try {
      localStorage.setItem('lw-sound', on ? 'on' : 'off')
    } catch {
      // storage blocked: the toggle still works for this visit
    }
    enable()
    if (on) sfx('chime')
  })
  // Browsers only allow audio after a gesture: if the visitor chose sound before, start on their first click.
  if (on) addEventListener('pointerdown', enable, { once: true })
  apply()
}
