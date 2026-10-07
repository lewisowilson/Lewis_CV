import './styles.css'
import './islands.css'
import './classic.css'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import Lenis from 'lenis'
import { FrameSequence } from './sequence.js'
import { tailor } from './tailor.js'
import { islandMap } from './islands.js'
import { STOPS } from './cv-data.js'
import { setupAudio, sfx, updateWind } from './audio.js'
import { terrain, renderInto } from './contours.js'

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
  lenis.on('scroll', (e) => updateWind(e.velocity * 60, false))
  gsap.ticker.add((t) => lenis.raf(t * 1000))
  gsap.ticker.lagSmoothing(0)
  // In-page links glide instead of jumping.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]')
    if (!a) return
    const href = a.getAttribute('href')
    const target = href === '#top' ? 0 : href === '#islands' ? mapY() : $(href)
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
      .from(['.hero__eyebrow', '.hero__lede', '.hero__ctas'], { y: 18, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.07 }, '-=0.85')
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
    film: !lite,
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

  ScrollTrigger.create({
    trigger: '.hero',
    start: 'top top',
    end: () => '+=' + window.innerHeight * 2, // keeps flying under the climb's crossfade: one motion
    scrub: true,
    onUpdate: (st) => {
      seq.seek(st.progress)
    },
  })
  gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: () => '+=' + window.innerHeight * 0.08, scrub: 0.6 } })
    .to('.hero__copy', { y: -80, opacity: 0, ease: 'none' })
    .to(['.hero__contours', '.hero__field'], { opacity: 0, ease: 'none' }, 0)
    .to('.hero__name', { fontVariationSettings: "'wght' 300", ease: 'none' }, 0)

  return intro
}

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

// ——— The climb: the hero flight hands over to the archipelago, then the camera climbs to the full map ———
// Where the island map is fully in view (the end of the climb). Anchors to #islands land here.
const mapY = () => {
  const wrap = $('.climb')
  return wrap ? wrap.getBoundingClientRect().bottom + window.scrollY - window.innerHeight : 0
}
function climb() {
  const wrap = $('.climb')
  if (!wrap || reduced) return
  const media = $('.hero__media')
  const clamp = gsap.utils.clamp(0, 1)
  const rise = gsap.parseEase('power1.out') // already moving at the handover, settling as the map arrives
  const set = (k, v) => wrap.style.setProperty(k, v.toFixed(3))
  // One motion: the hero flight is still playing under the first 27% (the crossfade) while the view pushes
  // forward, and the climb starts rising at the same moment. 0.8-0.9: the map's controls arrive.
  const update = (p) => {
    const fade = clamp(p / 0.27)
    const r = rise(clamp(p / 0.8))
    set('--climb-in', fade)
    media.style.transform = fade > 0 ? `scale(${(1 + 0.14 * fade).toFixed(3)})` : ''
    set('--climb-zoom', 2.6 - 1.6 * r)
    // Light haze over the handover (bright, never a white-out), then thin cloud passing on the way up.
    set('--climb-haze', Math.max(Math.sin(fade * Math.PI) * 0.4, Math.sin(clamp(r * 1.1) * Math.PI) * 0.5))
    set('--climb-pass', 1 + r * 1.8)
    const ui = clamp((p - 0.8) / 0.1)
    set('--climb-ui', ui)
    wrap.classList.toggle('is-climbing', ui < 0.6)
  }
  const st = ScrollTrigger.create({ trigger: wrap, start: 'top top', end: 'bottom bottom', onUpdate: (x) => update(x.progress) })
  update(st.progress)
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
  $$('.light, .classic').forEach((section) => {
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

// ——— Command palette (/ or Ctrl+K) ———
function commandPalette() {
  const dlg = $('.cmdk')
  const input = $('.cmdk__input')
  const list = $('.cmdk__list')
  const email = 'lewis.oliver.wilson@gmail.com'
  const go = (sel) => () => (lenis ? lenis.scrollTo(sel === '#top' ? 0 : sel === '#islands' ? mapY() : $(sel), { duration: 1.6 }) : $(sel)?.scrollIntoView())
  const open = (url) => () => window.open(url, '_blank', 'noopener')
  const items = [
    { label: 'Autopilot tour', hint: '90 seconds', run: () => autopilot() },
    { label: 'Fly it yourself', hint: 'Seaplane · F', run: () => fly() },
    { label: 'Flight brief', hint: '60-second CV', run: () => openBrief() },
    { label: 'Departure', hint: 'Top', run: go('#top') },
    { label: 'Island map', hint: 'Experience · Projects · Grades', run: go('#islands') },
    { label: 'About', hint: 'CV', run: go('#about') },
    { label: 'Projects', hint: 'CV', run: go('#projects') },
    { label: 'Experience', hint: 'CV', run: go('#experience') },
    { label: 'Education', hint: 'CV', run: go('#education') },
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

const SITE_API = import.meta.env.VITE_SITE_API

// ——— Printed pass by post: a short form posted to the site API ———
function postPass() {
  const dlg = $('.post')
  const open = $('[data-post-open]')
  if (!SITE_API || !dlg?.showModal || !open) return
  open.hidden = false
  const form = $('.post__form', dlg)
  const status = $('.post__status', dlg)
  const send = $('[data-post-send]', dlg)
  open.addEventListener('click', () => {
    status.textContent = ''
    lenis?.stop()
    dlg.showModal()
  })
  dlg.addEventListener('close', () => lenis?.start())
  $('[data-post-close]', dlg).addEventListener('click', () => dlg.close())
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const missing = [...form.querySelectorAll('[required]')].find((i) => !i.value.trim())
    if (missing) {
      status.textContent = 'Please fill in ' + missing.closest('label').firstChild.textContent.trim().toLowerCase() + '.'
      return missing.focus()
    }
    send.disabled = true
    status.textContent = 'Sending…'
    try {
      const r = await fetch(SITE_API + '/pass-request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      })
      const body = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(body.error || 'Something went wrong.')
      status.textContent = 'Cleared for departure. Your pass is on its way.'
      form.reset()
      setTimeout(() => dlg.close(), 2200)
    } catch (err) {
      status.textContent = err.message + ' You can also email lewis.oliver.wilson@gmail.com.'
    } finally {
      send.disabled = false
    }
  })
}

// ——— Fly it yourself: seaplane game over the archipelago (press F) ———
let sim = null
async function fly() {
  const root = $('.sim')
  if (!root || sim || reduced || !document.createElement('canvas').getContext('webgl2')) return
  // Waypoints are the work chapters of the flight plan (experience and projects).
  const picks = [['construx', 'experience'], ['reassure', 'experience'], ['tutortime', 'projects'], ['whitepaper', 'projects'], ['mdf', 'experience'], ['space01', 'experience']]
  const waypoints = picks
    .map(([id, group]) => [STOPS.findIndex((st) => st.id === id), group])
    .filter(([i]) => i >= 0)
    .map(([i, group], k) => ({ code: 'WP ' + String(k + 1).padStart(2, '0'), title: STOPS[i].title, hook: STOPS[i].org, id: STOPS[i].id, group }))
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
    const w = arrived
    sim?.exit()
    if (!w) return
    lenis ? lenis.scrollTo(mapY(), { duration: 1.4 }) : window.scrollTo(0, mapY())
    setTimeout(() => islands?.open(w.group, w.id), 1500)
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


// ——— Touchdown: the contact pass lands, the stamp thumps down, water ripples out ———
function touchdown() {
  const pass = $('.pass')
  const stamp = $('.pass__stamp')
  if (!pass || !stamp || reduced) return
  const ripple = document.createElement('div')
  ripple.className = 'touchdown'
  ripple.setAttribute('aria-hidden', 'true')
  pass.parentElement.appendChild(ripple)
  gsap.set(stamp, { opacity: 0, scale: 1.8, rotate: -34 })
  ScrollTrigger.create({
    trigger: pass,
    start: 'top 70%',
    once: true,
    onEnter: () => {
      gsap.timeline()
        .to(stamp, { opacity: 1, scale: 1, rotate: -14, duration: 0.42, ease: 'power4.in', delay: 0.5 })
        .call(() => {
          sfx('stamp')
          ripple.classList.add('is-on')
        })
        .fromTo(pass, { y: 0 }, { y: 4, duration: 0.08, yoyo: true, repeat: 1, ease: 'power1.inOut' })
    },
  })
}

// ——— The original site's reveal-on-scroll, scoped to its section ———
function classicReveals() {
  const els = $$('.classic .reveal, .classic .edu-item')
  if (reduced || !('IntersectionObserver' in window)) return els.forEach((e) => e.classList.add('visible'))
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return
        e.target.classList.add('visible')
        io.unobserve(e.target)
      }),
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
  )
  $$('.classic .edu-item').forEach((e, i) => (e.style.transitionDelay = i * 0.15 + 's'))
  els.forEach((e) => io.observe(e))
}

// ——— Autopilot: the site flies itself (loaded on first use) ———
let tour = null
async function autopilot() {
  if (reduced) return
  if (!tour) tour = (await import('./tour.js')).createTour({ lenis })
  sfx('chime')
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
    sfx('paper')
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
commandPalette()
brief()
const islands = islandMap({ sfx })
classicReveals()
if ($('[data-sound]')) setupAudio($('[data-sound]'))
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
postPass()
touchdown()
// Multiplayer sky: other visitors as paper planes (site API WebSocket), started once the page is idle.
if (import.meta.env.VITE_SKY_WS && !reduced && matchMedia('(hover: hover)').matches) {
  const go = () => import('./presence.js').then(({ presence }) => {
    let origin = ''
    try {
      origin = sessionStorage.getItem('lw-from') ?? ''
    } catch {
      // storage blocked: fly without an origin code
    }
    presence(import.meta.env.VITE_SKY_WS, { origin })
  })
  'requestIdleCallback' in window ? requestIdleCallback(go, { timeout: 4000 }) : setTimeout(go, 2500)
}
{
  const fig = $('.bearing__photo')
  if (fig) whenNear(fig, () => import('./voice.js').then(({ voicePitch }) => voicePitch(fig)))
}
magnetic()
navTone()
const intro = hero()
kineticName()
tiltPass()
reveals()
climb()
rail()
document.fonts?.ready.then(() => ScrollTrigger.refresh())
document.body.classList.remove('is-loading')
gate().then(() => intro.play())
