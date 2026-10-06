import './styles.css'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import Lenis from 'lenis'
import { FrameSequence } from './sequence.js'
import { terrain, island, renderInto } from './contours.js'

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, DrawSVGPlugin)

const $ = (s, el = document) => el.querySelector(s)
const $$ = (s, el = document) => [...el.querySelectorAll(s)]
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
    .to('.hero__contours', { opacity: 0, ease: 'none' }, 0)
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

  ScrollTrigger.batch('.entry, .proj, .note, .edu > li, .certs li, .photos li', {
    start: 'top 88%',
    once: true,
    onEnter: (els) => gsap.from(els, { y: 40, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.08 }),
  })

  gsap.from('.bearing__photo img', {
    scale: 1.18,
    ease: 'none',
    scrollTrigger: { trigger: '.bearing__photo', start: 'top bottom', end: 'bottom top', scrub: true },
  })
  gsap.from('.pass', { y: 60, rotate: -1.5, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.pass', start: 'top 85%', once: true } })
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
  ScrollTrigger.create({ trigger: '.descent', start: 'top top', end: 'bottom bottom', scrub: true, onUpdate: (st) => seq.seek(st.progress) })
  gsap.timeline({ scrollTrigger: { trigger: '.descent', start: 'top top', end: 'bottom bottom', scrub: 0.5 } })
    .fromTo('.descent__title', { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, ease: 'none', duration: 0.3 }, 0.55)
    .to('.descent__title', { opacity: 0, ease: 'none', duration: 0.15 }, 0.85)
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

// ——— Boot ———
navTone()
const intro = hero()
atlas()
reveals()
descent()
expedition()
rail()
document.fonts?.ready.then(() => ScrollTrigger.refresh())
document.body.classList.remove('is-loading')
gate().then(() => intro.play())
