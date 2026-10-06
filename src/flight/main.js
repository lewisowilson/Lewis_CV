import './styles.css'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import Lenis from 'lenis'
import { FrameSequence } from './sequence.js'
import { tailor } from './tailor.js'
import { terrain, island, renderInto } from './contours.js'

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, DrawSVGPlugin)

const $ = (s, el = document) => el.querySelector(s)
const $$ = (s, el = document) => [...el.querySelectorAll(s)]
// Run fn once any of the elements is within a couple of screens of the viewport (keeps heavy chunks off the critical path).
const whenNear = (els, fn, margin = '150% 0px') => {
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      io.disconnect()
      fn()
    }
  }, { rootMargin: margin })
  ;[els].flat().filter(Boolean).forEach((el) => io.observe(el))
}
const root = document.documentElement
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const small = matchMedia('(max-width: 760px)').matches
const conn = navigator.connection
const lite = reduced || conn?.saveData || /2g/.test(conn?.effectiveType ?? '')
if (reduced) root.classList.add('reduced')

// ——— Live clock (UK time) and year ———
const clockFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London', timeZoneName: 'short' })
const tick = () => $$('[data-clock]').forEach((el) => (el.textContent = clockFmt.format(new Date())))
tick()
setInterval(tick, 15_000)
$$('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()))

// ——— Inbound route: where this visitor is flying in from ———
// Personal links carry ?from=CODE (the portal adds it). Otherwise, visitors outside the UK get their
// timezone's city; UK visitors all share Europe/London, so they see the plain route.
const ORIGINS = { CHE: 'Chester', FNM: 'Farnham', BKH: 'Berkhamsted' }
function inbound() {
  const store = (fn) => {
    try {
      return fn(sessionStorage)
    } catch {
      return null
    }
  }
  const url = new URL(location.href)
  const param = url.searchParams.get('from')?.toUpperCase()
  if (param) {
    url.searchParams.delete('from')
    history.replaceState(null, '', url) // keep shared links clean
    if (ORIGINS[param]) store((s) => s.setItem('lw-from', param))
  }
  const code = store((s) => s.getItem('lw-from'))
  let origin = code && ORIGINS[code] ? { code, city: ORIGINS[code] } : null
  if (!origin) {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''
    const city = zone.includes('/') && !zone.startsWith('Etc/') && zone !== 'Europe/London' ? zone.split('/').pop().replace(/_/g, ' ') : null
    if (city) origin = { code: city.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase(), city }
  }
  if (!origin) return
  $$('[data-inbound]').forEach((el) => (el.textContent = `${origin.city.toUpperCase()} → `))
  $$('[data-pass-code]').forEach((el) => (el.textContent = `${origin.code} → EXT`))
}
inbound()

// ——— Mobile menu ———
const menuBtn = $('.nav__menu')
const menu = $('#menu')
menuBtn?.addEventListener('click', () => {
  const open = menuBtn.getAttribute('aria-expanded') !== 'true'
  menuBtn.setAttribute('aria-expanded', String(open))
  menu.hidden = !open
  menuBtn.textContent = open ? 'Close' : 'Menu'
})
menu?.addEventListener('click', (e) => {
  if (e.target.closest('a')) menuBtn.click()
})

// ——— Smooth scroll (off for reduced motion) ———
let lenis = null
if (!reduced) {
  lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 0.95 })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((t) => lenis.raf(t * 1000))
  gsap.ticker.lagSmoothing(0)
  // In-page links glide instead of jumping.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]')
    if (!a) return
    const target = a.getAttribute('href') === '#top' ? 0 : $(a.getAttribute('href'))
    if (target === null) return
    e.preventDefault()
    lenis.scrollTo(target, { duration: 1.4 })
  })
}

// ——— Gate: split-flap preloader that becomes the hero ———
const CHARSET = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·-'
function flapRow(el) {
  const text = el.dataset.flap
  el.replaceChildren(
    ...[...text].map((c) => {
      const cell = document.createElement('span')
      cell.className = 'flap'
      cell.dataset.target = c
      cell.textContent = ' '
      return cell
    }),
  )
  return $$('.flap', el)
}
function runFlaps(cells, start = 0) {
  return Promise.all(
    cells.map(
      (cell, i) =>
        new Promise((resolve) => {
          const target = cell.dataset.target
          const steps = target === ' ' ? 0 : 3 + ((i * 7) % 5)
          let n = 0
          setTimeout(() => {
            const id = setInterval(() => {
              n++
              cell.textContent = n >= steps ? target : CHARSET[(Math.random() * CHARSET.length) | 0]
              if (n >= steps) {
                clearInterval(id)
                resolve()
              }
            }, 45)
          }, start + i * 28)
        }),
    ),
  )
}

async function gate() {
  const seen = sessionStorage.getItem('lw-gate')
  const el = $('.gate')
  if (reduced || seen || !el) {
    root.classList.add('no-gate')
    return
  }
  sessionStorage.setItem('lw-gate', '1')
  lenis?.stop()
  await Promise.all([runFlaps(flapRow($('.gate__board'))), runFlaps(flapRow($('.gate__sub')), 160)])
  await gsap.to(el, { yPercent: -100, duration: 0.85, ease: 'expo.inOut', delay: 0.15 })
  el.remove()
  lenis?.start()
}

// ——— Hero ———
function hero() {
  const svg = $('.hero__contours')
  const paths = renderInto(svg, terrain({ width: 1600, height: 900, seed: 7, levels: 16 }))

  const lines = $$('.hero__name .line').map((line) => {
    const inner = document.createElement('span')
    inner.textContent = line.textContent
    line.replaceChildren(inner)
    return inner
  })

  const intro = gsap.timeline({ paused: true })
  if (!reduced) {
    intro
      .from(lines, { yPercent: 105, duration: 1.2, ease: 'expo.out', stagger: 0.08 })
      .from(['.hero__eyebrow', '.hero__lede', '.hero__ctas', '.hud'], { y: 18, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.07 }, '-=0.85')
      .fromTo(paths, { drawSVG: '0%' }, { drawSVG: '100%', duration: 2.4, ease: 'power2.inOut', stagger: 0.04 }, 0.2)
  }

  if (reduced) return intro

  // Live contour field over the water (falls back to the static SVG contours).
  if (!lite) {
    import('./contourField.js').then(({ contourField }) => {
      try {
        const field = contourField($('.hero__field'))
        if (!field) return
        root.classList.add('has-field')
        ScrollTrigger.create({ trigger: '.hero', start: 'top bottom', end: 'bottom top', onToggle: (st) => (st.isActive ? field.start() : field.stop()) })
        field.start()
      } catch {
        /* SVG contours stay */
      }
    })
  }

  // Scroll-scrubbed flight: canvas frames, altitude readout, copy lifting away.
  const seq = new FrameSequence($('.hero__canvas'), {
    base: small ? '/media/hero/m' : '/media/hero/d',
    count: 120,
    poster: $('.hero__poster'),
  })
  const startLoad = () => seq.load().then(() => $('.hero__canvas').classList.add('is-ready'))
  if (!lite) {
    if (document.readyState === 'complete') requestIdleCallback?.(startLoad) ?? setTimeout(startLoad, 200)
    else addEventListener('load', () => (window.requestIdleCallback ? requestIdleCallback(startLoad) : setTimeout(startLoad, 200)))
  }
  // Show the canvas as soon as frame 1 is drawn.
  const reveal = setInterval(() => {
    if (seq.drawnOnce && seq.frames[0]) {
      $('.hero__canvas').classList.add('is-ready')
      clearInterval(reveal)
    }
  }, 200)

  const alt = $('[data-alt]')
  ScrollTrigger.create({
    trigger: '.hero',
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (st) => {
      seq.seek(st.progress)
      alt.textContent = String(Math.round(120 + st.progress * 30))
    },
  })
  gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: '45% bottom', scrub: 0.6 } })
    .to('.hero__copy', { y: -80, opacity: 0, ease: 'none' })
    .to(['.hero__contours', '.hero__field'], { opacity: 0, ease: 'none' }, 0)
    .to('.hero__name', { fontVariationSettings: "'wght' 300", ease: 'none' }, 0)

  // Sky variants: real night / dusk / fog flights replace the colour grade when their frames exist.
  const variantDir = { night: 'hero-night', dusk: 'hero-dusk', fog: 'hero-fog' }
  let currentDir = 'hero'
  heroVariant = async (mode) => {
    const dir = variantDir[mode] ?? 'hero'
    if (dir === currentDir) return
    const base = `/media/${dir}/${small ? 'm' : 'd'}`
    const ok = dir === 'hero' || (await fetch(`${base}/f001.webp`, { method: 'HEAD' }).then((r) => r.ok && /image/.test(r.headers.get('content-type') ?? ''), () => false))
    if (!ok) return
    currentDir = dir
    root.classList.toggle('has-sky-footage', dir !== 'hero')
    root.classList.toggle('sky-light', dir === 'hero-fog') // pale fog needs dark type
    const poster = $('.hero__poster')
    poster.src = `/media/posters/${dir}${small ? '-960' : ''}.webp`
    seq.setBase(base)
  }
  return intro
}
let heroVariant = () => {}

// ——— Text reveals ———
function reveals() {
  if (reduced) return
  $$('[data-lines]').forEach((el) => {
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'split-line',
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.lines, {
          yPercent: 110,
          duration: 1.1,
          ease: 'expo.out',
          stagger: 0.08,
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        }),
    })
  })

  $$('[data-scramble]').forEach((el, i) => {
    const text = el.textContent
    el.textContent = ''
    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () => gsap.to(el, { duration: 1.1, delay: i * 0.08, scrambleText: { text, chars: 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789*', speed: 0.6 } }),
    })
  })

  ScrollTrigger.batch('.entry, .ticket, .note, .edu > li, .certs li, .photos li', {
    start: 'top 88%',
    once: true,
    onEnter: (els) => gsap.from(els, { y: 40, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.08 }),
  })

  gsap.from('.bearing__photo img', {
    scale: 1.18,
    ease: 'none',
    scrollTrigger: { trigger: '.bearing__photo', start: 'top bottom', end: 'bottom top', scrub: true },
  })
  gsap.from('.pass-stage', { y: 60, rotate: -1.5, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.pass-stage', start: 'top 85%', once: true } })
}

// ——— Atlas: islands drawn as contour rings ———
function atlas() {
  $$('.isle').forEach((isle) => {
    const paths = renderInto($('.isle__rings', isle), island({ seed: Number(isle.dataset.seed), rings: 7 }))
    if (reduced) return
    gsap.fromTo(
      paths,
      { drawSVG: '0%' },
      { drawSVG: '100%', duration: 1.6, ease: 'power2.inOut', stagger: 0.09, scrollTrigger: { trigger: isle, start: 'top 85%', once: true } },
    )
  })
}

// ——— Descent: drop onto the island, then "Waypoints" ———
function descent() {
  if (reduced) return
  const canvas = $('.descent__canvas')
  const seq = new FrameSequence(canvas, { base: small ? '/media/descent/m' : '/media/descent/d', count: 120, poster: $('.descent__poster') })
  let loading = false
  ScrollTrigger.create({
    trigger: '.descent',
    start: 'top 300%',
    onEnter: () => {
      if (loading || lite) return
      loading = true
      seq.load().then(() => canvas.classList.add('is-ready'))
      const t = setInterval(() => seq.frames[0] && (canvas.classList.add('is-ready'), clearInterval(t)), 200)
    },
  })
  // 0-0.36 descend (video frames) · 0.36-0.56 survey beam converts photo to LiDAR
  // 0.56-0.86 the scan rises into a live 3D point cloud and the camera tilts · 0.8-0.96 title
  const pts = $('[data-pts]')
  const fmt = new Intl.NumberFormat('en-GB')
  let island = null
  const canGL = !lite && !!document.createElement('canvas').getContext('webgl2')
  if (canGL) {
    whenNear($('.descent'), () => import('./island3d.js')
      .then(({ createIsland }) => createIsland($('.descent__3d'), { src: '/media/island/height.png', density: small ? 0.7 : 1 }))
      .then((isl) => {
        island = isl
        ScrollTrigger.create({ trigger: '.descent', start: 'top bottom', end: 'bottom top', onToggle: (st) => (st.isActive ? isl.start() : isl.stop()) })
        ScrollTrigger.refresh()
      })
      .catch(() => {})) // the flat scan remains if WebGL fails
  }
  const ease = gsap.parseEase('power2.inOut')
  ScrollTrigger.create({
    trigger: '.descent',
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (st) => {
      const p = st.progress
      seq.seek(Math.min(1, p / 0.36))
      const scan = gsap.utils.clamp(0, 1, (p - 0.36) / 0.2)
      pts.textContent = fmt.format(Math.round(scan * (island?.count ?? 48_000)))
      if (island) {
        const rise = gsap.utils.clamp(0, 1, (p - 0.56) / 0.3)
        island.state.opacity = gsap.utils.clamp(0, 1, (p - 0.55) / 0.06)
        island.state.lift = ease(rise)
        island.state.tilt = ease(gsap.utils.clamp(0, 1, (p - 0.6) / 0.28))
        // Photo and flat scan give way to the live cloud on clean ink.
        const handover = gsap.utils.clamp(0, 1, (p - 0.56) / 0.1)
        $('.descent__scan').style.opacity = String(1 - handover)
        canvas.style.opacity = String(1 - handover)
        $('.descent__poster').style.opacity = String(1 - handover)
      }
    },
  })
  const beamTravel = () => $('.descent__pin').clientWidth
  gsap.timeline({ scrollTrigger: { trigger: '.descent', start: 'top top', end: 'bottom bottom', scrub: 0.4, invalidateOnRefresh: true } })
    .set({}, {}, 0)
    .to('.descent__beam', { opacity: 1, duration: 0.02, ease: 'none' }, 0.36)
    .to('.descent__readout', { opacity: 1, duration: 0.04, ease: 'none' }, 0.36)
    .fromTo('.descent__beam', { x: 0 }, { x: beamTravel, duration: 0.2, ease: 'none' }, 0.36)
    .fromTo('.descent__scan', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.2, ease: 'none' }, 0.36)
    .to('.descent__beam', { opacity: 0, duration: 0.03, ease: 'none' }, 0.56)
    .fromTo('.descent__title', { opacity: 0, y: 40 }, { opacity: 1, y: 0, ease: 'none', duration: 0.1 }, 0.82)
    .to(['.descent__title', '.descent__readout'], { opacity: 0, ease: 'none', duration: 0.05 }, 0.95)
    .to({}, { duration: 0.0001 }, 1)
}

// ——— Expedition: play the living image only while it's on screen ———
function expedition() {
  const video = $('.expedition__video')
  if (!video || reduced || lite) return
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) {
      if (video.preload === 'none') {
        video.preload = 'auto'
        video.load()
      }
      video.play().catch(() => {})
    } else video.pause()
  }, { rootMargin: '200px' }).observe(video)
  gsap.to('.expedition__video', { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.expedition__film', start: 'top bottom', end: 'bottom top', scrub: true } })
}

// ——— Route rail: progress, plane marker, active waypoint ———
function rail() {
  const fill = $('.rail__fill')
  const plane = $('.rail__plane')
  const track = $('.rail__track')
  if (!fill) return
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (st) => {
      fill.style.transform = `scaleY(${st.progress})`
      plane.style.top = `${st.progress * track.clientHeight}px`
    },
  })
  const links = $$('.rail__points a')
  $$('[data-section]').forEach((section) => {
    ScrollTrigger.create({
      trigger: section,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: (st) => {
        if (!st.isActive) return
        const idx = links.findIndex((a) => a.dataset.wp === section.dataset.section)
        links.forEach((a, i) => {
          a.classList.toggle('is-active', i === idx)
          a.classList.toggle('is-past', i < idx)
        })
      },
    })
  })
}

// ——— Nav colour follows the section underneath it ———
function navTone() {
  const nav = $('[data-nav]')
  $$('.light').forEach((section) => {
    ScrollTrigger.create({
      trigger: section,
      start: 'top 40px',
      end: 'bottom 40px',
      onToggle: (st) => {
        nav.classList.toggle('on-light', st.isActive)
        document.body.classList.toggle('on-light', st.isActive)
      },
    })
  })
  // Hide on the way down, return on the way up; solid backing once past the hero.
  let lastY = 0
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (st) => {
      const y = st.scroll()
      const heroEnd = $('.hero').offsetHeight - innerHeight
      nav.classList.toggle('is-scrolled', y > heroEnd)
      if (y > heroEnd && y > lastY + 2 && menu.hidden) nav.classList.add('is-hidden')
      else if (y < lastY - 2 || y <= heroEnd) nav.classList.remove('is-hidden')
      lastY = y
    },
  })
}

// ——— Split-flap section labels ———
function flapLabels() {
  if (reduced) return
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  $$('.label').forEach((label) => {
    const text = label.textContent
    label.setAttribute('aria-label', text)
    label.replaceChildren(...[...text].map((c) => Object.assign(document.createElement('span'), { className: 'fl', textContent: c, ariaHidden: 'true' })))
    const cells = $$('.fl', label)
    ScrollTrigger.create({
      trigger: label,
      start: 'top 92%',
      once: true,
      onEnter: () =>
        cells.forEach((cell, i) => {
          const target = cell.textContent
          if (target === ' ') return
          let n = 0
          const steps = 3 + (i % 4)
          setTimeout(() => {
            const id = setInterval(() => {
              n++
              cell.textContent = n >= steps ? target : chars[(Math.random() * chars.length) | 0]
              cell.classList.remove('flip')
              void cell.offsetWidth
              cell.classList.add('flip')
              if (n >= steps) clearInterval(id)
            }, 70)
          }, i * 35)
        }),
    })
  })
}

// ——— Flight computer: heading per waypoint, ground speed from real scroll velocity ———
function flightComputer() {
  const hdg = $('[data-hdg]')
  const gs = $('[data-gs]')
  const wp = $('[data-fms-wp]')
  if (!hdg) return
  const headings = { top: 47, bearing: 52, atlas: 71, work: 88, log: 104, charts: 121, logbook: 139, expedition: 156, arrival: 172 }
  const order = Object.keys(headings)
  let current = 47
  let target = 47
  let speed = 0
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (st) => (speed = Math.abs(st.getVelocity())) })
  $$('[data-section]').forEach((s) =>
    ScrollTrigger.create({
      trigger: s,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: (st) => {
        if (!st.isActive) return
        target = headings[s.dataset.section] ?? target
        wp.textContent = String(order.indexOf(s.dataset.section) + 1).padStart(2, '0')
      },
    }),
  )
  let shown = 0
  gsap.ticker.add(() => {
    current += (target - current) * 0.04
    hdg.textContent = String(Math.round(current)).padStart(3, '0')
    shown += (Math.min(speed / 12, 480) - shown) * 0.08
    gs.textContent = String(Math.round(shown)).padStart(3, '0')
    speed *= 0.92
  })
}

// ——— Command palette (/ or Ctrl+K) ———
function commandPalette() {
  const dlg = $('.cmdk')
  const input = $('.cmdk__input')
  const list = $('.cmdk__list')
  const email = 'lewis.oliver.wilson@gmail.com'
  const go = (sel) => () => (lenis ? lenis.scrollTo(sel === '#top' ? 0 : $(sel), { duration: 1.6 }) : $(sel)?.scrollIntoView())
  const open = (url) => () => window.open(url, '_blank', 'noopener')
  const items = [
    { label: 'Autopilot tour', hint: '90 seconds', run: () => autopilot() },
    { label: 'Fly it yourself', hint: 'Seaplane · F', run: () => fly() },
    { label: 'Flight brief', hint: '60-second CV', run: () => openBrief() },
    { label: 'Departure', hint: 'Top', run: go('#top') },
    { label: 'Projects', hint: 'Waypoints', run: go('#work') },
    { label: 'Experience', hint: 'Flight log', run: go('#log') },
    { label: 'About', hint: 'Bearing', run: go('#bearing') },
    { label: 'Skills', hint: 'Atlas', run: go('#atlas') },
    { label: 'Education & certifications', hint: 'Charts', run: go('#charts') },
    { label: 'Achievements', hint: 'Logbook', run: go('#logbook') },
    { label: 'Expedition', hint: 'Adventures', run: go('#expedition') },
    { label: 'Contact', hint: 'Arrival', run: go('#arrival') },
    { label: 'Copy email address', hint: 'Clipboard', run: () => navigator.clipboard?.writeText(email) },
    { label: 'Email Lewis', hint: 'Mail', run: () => (location.href = `mailto:${email}`) },
    { label: 'GitHub', hint: 'New tab', run: open($('a[href*="github.com"]')?.href ?? 'https://github.com') },
    { label: 'LinkedIn', hint: 'New tab', run: open($('a[href*="linkedin.com"]')?.href ?? 'https://linkedin.com') },
    { label: 'Placement portal', hint: 'Private', run: () => (location.href = 'https://portal.lewis-wilson.com') },
  ]
  let filtered = items
  let index = 0
  const render = () => {
    list.replaceChildren(
      ...filtered.map((it, i) => {
        const li = document.createElement('li')
        li.setAttribute('role', 'option')
        li.setAttribute('aria-selected', String(i === index))
        li.innerHTML = `<span></span><small></small>`
        li.firstChild.textContent = it.label
        li.lastChild.textContent = it.hint
        li.addEventListener('click', () => choose(i))
        li.addEventListener('pointermove', () => { index = i; render() })
        return li
      }),
    )
  }
  const show = () => {
    dlg.hidden = false
    input.value = ''
    filtered = items
    index = 0
    render()
    input.focus()
    lenis?.stop()
  }
  const hide = () => {
    dlg.hidden = true
    lenis?.start()
  }
  const choose = (i) => {
    const it = filtered[i]
    hide()
    it?.run()
  }
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim()
    filtered = items.filter((it) => (it.label + ' ' + it.hint).toLowerCase().includes(q))
    index = 0
    render()
  })
  dlg.addEventListener('click', (e) => e.target === dlg && hide())
  addEventListener('keydown', (e) => {
    const typing = /input|textarea/i.test(document.activeElement?.tagName ?? '') && document.activeElement !== input
    if (!dlg.hidden) {
      if (e.key === 'Escape') hide()
      else if (e.key === 'ArrowDown') { index = (index + 1) % filtered.length; render(); e.preventDefault() }
      else if (e.key === 'ArrowUp') { index = (index - 1 + filtered.length) % filtered.length; render(); e.preventDefault() }
      else if (e.key === 'Enter') { choose(index); e.preventDefault() }
      return
    }
    if (typing) return
    if (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
      e.preventDefault()
      show()
    }
  })
}

// ——— Now building: current work, from a tiny JSON file Lewis updates ———
function nowBuilding() {
  const board = $('[data-now]')
  if (!board) return
  fetch('/now.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (!data?.items?.length) return
      const rows = $('[data-now-rows]', board)
      for (const it of data.items.slice(0, 4)) {
        const li = document.createElement('li')
        for (const [cls, text] of [['what', it.what], ['detail', it.detail], ['status', it.status]]) {
          const span = document.createElement('span')
          span.className = 'nowboard__' + cls
          span.textContent = text ?? ''
          if (cls === 'status') span.dataset.s = it.status
          li.appendChild(span)
        }
        rows.appendChild(li)
      }
      const d = data.updated ? new Date(data.updated) : null
      if (d && !isNaN(d)) $('[data-now-updated]', board).textContent = 'Updated ' + d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      board.hidden = false
    })
    .catch(() => {})
}

// ——— Fly it yourself: seaplane game over the archipelago (press F) ———
let sim = null
async function fly() {
  const root = $('.sim')
  if (!root || sim || reduced || !document.createElement('canvas').getContext('webgl2')) return
  const tickets = $$('[data-ticket]')
  const waypoints = tickets.map((t, i) => ({
    code: 'WP ' + String(i + 1).padStart(2, '0'),
    title: $('h3', t)?.textContent ?? '',
    hook: $('.ticket__hook', t)?.textContent ?? '',
    ticket: t,
  }))
  const card = $('.sim__card', root)
  let arrived = null
  root.hidden = false
  lenis?.stop()
  document.documentElement.classList.add('is-flying')
  const { createSim } = await import('./sim.js')
  sim = await createSim(root, {
    waypoints,
    onArrive: (w, n, total) => {
      arrived = w
      $('[data-sim-card-tag]', card).textContent = `Arrived · ${w.code} · ${n} of ${total}`
      $('[data-sim-card-title]', card).textContent = w.title
      $('[data-sim-card-hook]', card).textContent = w.hook
      card.hidden = false
      $('[data-sim-open]', card).focus()
    },
    onExit: () => {
      root.hidden = true
      card.hidden = true
      sim = null
      lenis?.start()
      document.documentElement.classList.remove('is-flying')
    },
  })
  $('[data-sim-resume]', card).onclick = () => {
    card.hidden = true
    sim?.resume()
  }
  $('[data-sim-open]', card).onclick = () => {
    const t = arrived?.ticket
    sim?.exit()
    if (!t) return
    lenis ? lenis.scrollTo(t, { offset: -90, duration: 1.2 }) : t.scrollIntoView()
    setTimeout(() => $('.ticket__stub', t)?.click(), 1300)
  }
  $('[data-sim-exit]', root).onclick = () => sim?.exit()
  const boost = $('.sim__boost', root)
  boost.onpointerdown = () => root.classList.add('is-boost')
  boost.onpointerup = boost.onpointerleave = () => root.classList.remove('is-boost')
}
function flyButtons() {
  if (reduced) return $$('[data-fly]').forEach((b) => b.remove())
  $$('[data-fly]').forEach((b) => b.addEventListener('click', fly))
  addEventListener('keydown', (e) => {
    const typing = /input|textarea|select/i.test(document.activeElement?.tagName ?? '')
    if (typing || e.ctrlKey || e.metaKey || e.altKey || !$('.cmdk').hidden || $('.brief')?.open) return
    if (e.key.toLowerCase() === 'f' && !sim) fly()
  })
}

// ——— Autopilot: the site flies itself (loaded on first use) ———
let tour = null
async function autopilot() {
  if (reduced) return
  if (!tour) tour = (await import('./tour.js')).createTour({ lenis })
  tour.start()
}
function autopilotButtons() {
  const btns = document.querySelectorAll('[data-autopilot]')
  if (reduced) return btns.forEach((b) => b.remove())
  btns.forEach((b) => b.addEventListener('click', autopilot))
}

// ——— Flight brief: the CV on one sheet, for people short on time ———
let openBrief = () => {}
function brief() {
  const dlg = $('.brief')
  if (!dlg?.showModal) return
  let opener = null
  openBrief = () => {
    if (dlg.open) return
    opener = document.activeElement
    lenis?.stop()
    dlg.showModal()
    dlg.scrollTop = 0
  }
  dlg.addEventListener('close', () => {
    lenis?.start()
    opener?.focus?.()
  })
  // A click on the backdrop lands on the <dialog> itself, outside the sheet.
  dlg.addEventListener('click', (e) => e.target === dlg && dlg.close())
  $$('[data-brief-open]').forEach((b) => b.addEventListener('click', openBrief))
  $('[data-brief-close]', dlg).addEventListener('click', () => dlg.close())
  $('[data-brief-print]', dlg).addEventListener('click', () => {
    // A modal dialog sits in the top layer, centred and clipped; print it as plain flow instead.
    document.body.classList.add('printing-brief')
    dlg.close()
    dlg.show()
    window.print()
  })
  addEventListener('afterprint', () => {
    if (!document.body.classList.contains('printing-brief')) return
    document.body.classList.remove('printing-brief')
    dlg.close()
    openBrief()
  })
  addEventListener('keydown', (e) => {
    const typing = /input|textarea|select/i.test(document.activeElement?.tagName ?? '')
    if (typing || e.ctrlKey || e.metaKey || e.altKey || !$('.cmdk').hidden) return
    if (e.key.toLowerCase() === 'b') openBrief()
  })
}

// ——— Boarding-pass tickets: drag the stub to tear it off, or click it ———
function tickets() {
  $$('[data-ticket]').forEach((ticket) => {
    const stub = $('.ticket__stub', ticket)
    const body = $('.ticket__body', ticket)
    const open = () => {
      if (ticket.classList.contains('is-open')) return
      stub.style.setProperty('--stub-h', `${stub.offsetHeight}px`)
      ticket.classList.add('is-open')
      stub.setAttribute('aria-expanded', 'true')
      body.hidden = false
      if (reduced) {
        stub.style.visibility = 'hidden'
        return
      }
      gsap.timeline({ onComplete: () => ScrollTrigger.refresh() })
        .to(stub, { x: 70, y: 150, rotate: 24, opacity: 0, duration: 0.7, ease: 'power2.in' })
        .fromTo(body, { height: 0 }, { height: 'auto', duration: 0.8, ease: 'expo.out' }, 0.15)
        .from($$('.ticket__body-inner > *', ticket), { y: 24, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08 }, 0.35)
    }
    // Postcard back: the turn-over button only appears once the postcard image actually loads.
    const flip = $('.ticket__flip', ticket)
    const card = $('[data-postcard]', ticket)
    if (flip && card) {
      card.addEventListener('load', () => (flip.hidden = false), { once: true })
      card.src = card.dataset.postcard
      const main = $('.ticket__main', ticket)
      flip.addEventListener('click', () => {
        const to = !ticket.classList.contains('is-flipped')
        flip.setAttribute('aria-pressed', String(to))
        $('.ticket__back', ticket).setAttribute('aria-hidden', String(!to))
        if (reduced) return ticket.classList.toggle('is-flipped', to)
        // A card turn: squash to an edge, swap faces, open back out.
        gsap.timeline()
          .to(main, { scaleX: 0, duration: 0.22, ease: 'power2.in', transformOrigin: '50% 50%' })
          .call(() => ticket.classList.toggle('is-flipped', to))
          .to(main, { scaleX: 1, duration: 0.34, ease: 'back.out(1.6)' })
      })
    }
    // Drag-to-tear: the stub follows the pointer, bends, and rips once pulled far enough.
    let startX = null
    let pulled = 0
    stub.addEventListener('pointerdown', (e) => {
      startX = e.clientX
      pulled = 0
      stub.setPointerCapture(e.pointerId)
    })
    stub.addEventListener('pointermove', (e) => {
      if (startX === null || reduced) return
      pulled = Math.max(0, e.clientX - startX)
      gsap.set(stub, { x: pulled * 0.5, rotate: Math.min(pulled / 9, 14) })
      if (pulled > 90) {
        startX = null
        open()
      }
    })
    const release = () => {
      if (startX === null) return
      startX = null
      if (pulled < 6) open()
      else gsap.to(stub, { x: 0, rotate: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' })
    }
    stub.addEventListener('pointerup', release)
    stub.addEventListener('pointercancel', release)
    stub.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        open()
      }
    })
  })
}

// ——— The continuous world behind the dark sections ———
function world() {
  if (reduced || lite || !document.createElement('canvas').getContext('webgl2')) return
  whenNear($$('.atlas, .work, .logbook'), () => import('./world.js').then(async ({ createWorld }) => {
    const w = await createWorld($('.world'), { heightmap: '/media/island/archipelago.png' })
    root.classList.add('has-world')
    const zones = $$('.atlas, .work, .logbook')
    const active = new Set()
    zones.forEach((z) =>
      ScrollTrigger.create({
        trigger: z,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: (st) => {
          st.isActive ? active.add(z) : active.delete(z)
          w.show(active.size > 0)
        },
      }),
    )
    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (st) => {
        w.state.progress = st.progress
        w.state.velocity = st.getVelocity()
      },
    })
    ScrollTrigger.refresh()
  }))
}

// ——— Live sky ———
function liveSky() {
  const label = $('[data-sky-label]')
  const btn = $('.sky-switch')
  let night = null
  if (!lite) {
    import('./aurora.js').then(({ aurora }) => {
      try {
        night = aurora($('.hero__aurora'))
        night?.show(root.dataset.sky === 'night')
        ScrollTrigger.create({ trigger: '.hero', start: 'top bottom', end: 'bottom top', onToggle: (st) => (st.isActive ? night?.resume() : night?.pause()) })
      } catch {
        /* no aurora; the night grade still applies */
      }
    })
  }
  import('./sky.js').then(async ({ initSky }) => {
    const sky = await initSky({
      readout: $('[data-wx]'),
      onMode: (mode, override) => {
        label.textContent = override === 'live' ? `LIVE · ${mode.toUpperCase()}` : mode.toUpperCase()
        btn.setAttribute('aria-label', `Change the sky. Current: ${override === 'live' ? `live (${mode})` : mode}`)
        night?.show(mode === 'night')
        heroVariant(mode)
      },
    })
    btn.addEventListener('click', () => sky.cycle())
  })
}

// ——— 3D pass: tilts toward the cursor, foil follows the light ———
function tiltPass() {
  const pass = $('.pass')
  if (!pass || reduced || matchMedia('(pointer: coarse)').matches) return
  pass.addEventListener('pointermove', (e) => {
    const r = pass.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    pass.style.setProperty('--ry', `${(x - 0.5) * 12}deg`)
    pass.style.setProperty('--rx', `${(0.5 - y) * 10}deg`)
    pass.style.setProperty('--gx', `${x * 100}%`)
    pass.style.setProperty('--gy', `${y * 100}%`)
  })
  pass.addEventListener('pointerleave', () => {
    pass.style.transition = 'transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)'
    pass.style.setProperty('--rx', '0deg')
    pass.style.setProperty('--ry', '0deg')
    setTimeout(() => (pass.style.transition = ''), 800)
  })
}

// ——— Career terrain ———
function careerTerrain() {
  const host = $('[data-terrain]')
  if (!host || reduced || lite || !document.createElement('canvas').getContext('webgl2')) {
    host?.remove()
    return
  }
  whenNear(host, () => import('./career.js').then(({ createCareerTerrain, RANGES, PEAKS }) => {
    const marks = $('.terrain__marks', host)
    const card = $('.terrain__card', host)
    const headline = new Set(RANGES.slice(0, 4).map((_, r) => PEAKS.findIndex((p) => p[0] === r && p[3] === Math.max(...PEAKS.filter((q) => q[0] === r).map((q) => q[3])))))
    const buttons = PEAKS.map(([, label, detail], i) => {
      const b = document.createElement('button')
      b.className = `mark${headline.has(i) ? ' mark--major' : ''}`
      b.type = 'button'
      b.innerHTML = '<span class="mark__txt"></span><span class="mark__dot"></span>'
      b.firstChild.textContent = label
      b.setAttribute('aria-label', `${label}. ${detail}`)
      marks.append(b)
      return b
    })
    const rangeEls = RANGES.map((r) => {
      const el = Object.assign(document.createElement('span'), { className: 'range-label', textContent: r.name })
      marks.append(el)
      return el
    })
    let terrain
    const setHover = (i) => {
      terrain.state.hover = i
      buttons.forEach((b, j) => b.classList.toggle('is-on', i === j))
      card.classList.toggle('is-on', i >= 0)
      if (i >= 0) {
        card.firstChild.textContent = PEAKS[i][1]
        card.lastChild.textContent = PEAKS[i][2]
      }
    }
    terrain = createCareerTerrain($('.terrain__canvas', host), {
      onFrame: (pts) => {
        pts.forEach((p, i) => {
          buttons[i].style.left = `${p.x}%`
          buttons[i].style.top = `${p.y}%`
          buttons[i].classList.toggle('is-hidden', !p.visible || terrain.state.reveal < 0.6)
        })
        RANGES.forEach((r, i) => {
          const members = pts.filter((_, j) => PEAKS[j][0] === i)
          const x = members.reduce((s, p) => s + p.x, 0) / members.length
          const y = Math.max(...members.map((p) => p.y)) + 9
          rangeEls[i].style.left = `${x}%`
          rangeEls[i].style.top = `${Math.min(y, 92)}%`
          rangeEls[i].style.opacity = String(Math.max(0, (terrain.state.reveal - 0.5) * 2))
        })
      },
    })
    buttons.forEach((b, i) => {
      b.addEventListener('pointerenter', () => setHover(i))
      b.addEventListener('focus', () => setHover(i))
      b.addEventListener('pointerleave', () => setHover(-1))
      b.addEventListener('blur', () => setHover(-1))
      b.addEventListener('click', () => setHover(terrain.state.hover === i ? -1 : i))
    })
    ScrollTrigger.create({ trigger: host, start: 'top bottom', end: 'bottom top', onToggle: (st) => (st.isActive ? terrain.start() : terrain.stop()) })
    gsap.to(terrain.state, { reveal: 1, duration: 2.6, ease: 'power2.out', scrollTrigger: { trigger: host, start: 'top 70%', once: true } })
    ScrollTrigger.create({ trigger: host, start: 'top bottom', end: 'bottom top', scrub: true, onUpdate: (st) => (terrain.state.orbit = st.progress) })
  }))
}

// ——— Kinetic name: letters gain weight as the cursor approaches ———
function kineticName() {
  if (reduced || matchMedia('(pointer: coarse)').matches) return
  const name = $('.hero__name')
  const letters = []
  $$('.hero__name .line > span').forEach((span) => {
    const text = span.textContent
    span.replaceChildren(...[...text].map((c) => {
      const l = Object.assign(document.createElement('span'), { textContent: c, className: 'k' })
      letters.push(l)
      return l
    }))
  })
  const weights = letters.map(() => ({ w: 640, t: 640 }))
  let active = false
  addEventListener('pointermove', (e) => {
    const r = name.getBoundingClientRect()
    active = e.clientY > r.top - 120 && e.clientY < r.bottom + 120
    letters.forEach((l, i) => {
      const b = l.getBoundingClientRect()
      const d = Math.hypot(e.clientX - (b.left + b.width / 2), e.clientY - (b.top + b.height / 2))
      weights[i].t = active ? 640 + 260 * Math.max(0, 1 - d / 260) - 220 * Math.min(1, d / 700) : 640
    })
  }, { passive: true })
  gsap.ticker.add(() => {
    letters.forEach((l, i) => {
      const w = weights[i]
      if (Math.abs(w.t - w.w) < 0.5) return
      w.w += (w.t - w.w) * 0.12
      l.style.fontVariationSettings = `'wght' ${w.w.toFixed(0)}`
    })
  })
}

// ——— Flight log: a route line draws down the timeline with a plane on it ———
function logRoute() {
  const list = $('.entries')
  if (!list) return
  list.insertAdjacentHTML('afterbegin', '<div class="route" aria-hidden="true"><div class="route__line"></div><svg class="route__plane" viewBox="0 0 24 24"><path d="M12 2l2.2 7.2L21 12l-6.8 2.8L12 22l-2.2-7.2L3 12l6.8-2.8z"/></svg></div>')
  if (reduced) return
  gsap.fromTo('.route__line', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: list, start: 'top 60%', end: 'bottom 60%', scrub: true } })
  gsap.fromTo('.route__plane', { top: '0%' }, { top: '100%', ease: 'none', scrollTrigger: { trigger: list, start: 'top 60%', end: 'bottom 60%', scrub: true } })
}

// ——— Magnetic buttons ———
function magnetic() {
  if (reduced || matchMedia('(pointer: coarse)').matches) return
  $$('.btn').forEach((btn) => {
    const x = gsap.quickTo(btn, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' })
    const y = gsap.quickTo(btn, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' })
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect()
      x((e.clientX - r.left - r.width / 2) * 0.25)
      y((e.clientY - r.top - r.height / 2) * 0.35)
    })
    btn.addEventListener('pointerleave', () => { x(0); y(0) })
  })
}

// ——— Boot ———
flapLabels()
logRoute()
flightComputer()
commandPalette()
brief()
nowBuilding()
// Tailored links: point the reader at a brief prepared for them.
{
  const t = tailor()
  const nb = $('.nav__brief')
  if (t && nb) {
    nb.textContent = 'Your brief'
    nb.title = 'Flight brief prepared for ' + t.who
    nb.classList.add('is-tailored')
  }
}
autopilotButtons()
flyButtons()
magnetic()
navTone()
const intro = hero()
kineticName()
careerTerrain()
tickets()
tiltPass()
liveSky()
world()
atlas()
reveals()
descent()
expedition()
rail()
document.fonts?.ready.then(() => ScrollTrigger.refresh())
document.body.classList.remove('is-loading')
gate().then(() => intro.play())
