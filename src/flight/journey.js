// The flight plan: one island per CV chapter. Cards are plain information; the CV sheet fills in as
// the plane passes each island and is complete (and printable) at the end. Without WebGL, or with
// reduced motion, it becomes a simple readable list with the full CV underneath.
import { PROFILE, SECTIONS, STOPS } from './cv-data.js'

const el = (tag, cls, text) => {
  const n = document.createElement(tag)
  if (cls) n.className = cls
  if (text != null) n.textContent = text
  return n
}
const pad = (n) => String(n).padStart(2, '0')

function renderCard(stop, i) {
  const card = el('article', 'jcard')
  card.dataset.stop = stop.id
  card.id = 'wp-' + stop.id
  const text = el('div', 'jcard__text')
  text.append(el('p', 'jcard__kicker', `WP ${pad(i + 1)} · ${stop.when}`), el('h3', 'jcard__title', stop.title), el('p', 'jcard__org', stop.org))
  for (const para of stop.body) text.append(el('p', 'jcard__body', para))
  if (stop.links?.length) {
    const links = el('p', 'jcard__links')
    for (const l of stop.links) {
      const a = el('a', null, l.label + ' ↗')
      a.href = l.href
      if (/^https?:/.test(l.href)) {
        a.target = '_blank'
        a.rel = 'noopener noreferrer'
      }
      links.append(a)
    }
    text.append(links)
  }
  if (stop.final) {
    const now = el('div', 'jcard__now')
    now.dataset.now = ''
    text.append(now)
  }
  card.append(text)
  if (stop.portrait) {
    // The portrait carries the voice pitch (voice.js looks for these hooks).
    const fig = el('figure', 'bearing__photo jcard__photo')
    const img = el('img')
    img.src = '/media/portrait.webp'
    img.alt = 'Lewis Wilson'
    img.width = 720
    img.height = 960
    img.loading = 'lazy'
    const rings = el('canvas', 'voice__rings')
    rings.setAttribute('aria-hidden', 'true')
    const cap = el('p', 'voice__caption')
    cap.setAttribute('aria-live', 'polite')
    const btn = el('button', 'voice__btn')
    btn.type = 'button'
    btn.dataset.voice = ''
    btn.hidden = true
    btn.innerHTML = '<span class="voice__icon" aria-hidden="true"></span><span data-voice-label>Hear Lewis · 30 s</span>'
    fig.append(img, rings, cap, btn)
    card.append(fig)
  }
  return card
}

// The CV sheet: every line exists from the start as a placeholder, newest first within each section,
// and is "written in" when its island is passed.
function renderSheet(root) {
  root.querySelector('[data-cv-line]').textContent = PROFILE.line
  const contact = root.querySelector('[data-cv-contact]')
  for (const c of PROFILE.contact) {
    const li = el('li')
    if (c.href) {
      const a = el('a', null, c.label)
      a.href = c.href
      if (/^https?:/.test(c.href)) {
        a.target = '_blank'
        a.rel = 'noopener noreferrer'
      }
      li.append(a)
    } else li.textContent = c.label
    contact.append(li)
  }
  const host = root.querySelector('[data-cv-sections]')
  const lists = {}
  for (const [key, label] of SECTIONS) {
    const sec = el('section', 'cvsheet__sec')
    sec.dataset.sec = key
    sec.append(el('h4', null, label))
    const ul = el('ul', key === 'skills' ? 'cvsheet__chips' : 'cvsheet__list')
    sec.append(ul)
    host.append(sec)
    lists[key] = ul
  }
  const entries = [] // { stopIndex, node }
  // Newest first: walk the stops backwards when creating placeholders.
  for (let i = STOPS.length - 1; i >= 0; i--) {
    const stop = STOPS[i]
    for (const item of stop.cv ?? []) {
      const li = el('li', 'cvsheet__item is-pending')
      const head = el('p', 'cvsheet__head')
      if (item.title) head.append(el('b', null, item.title))
      if (item.when) head.append(el('span', 'cvsheet__when', item.when))
      if (item.title || item.when) li.append(head)
      li.append(el('p', 'cvsheet__text', item.text))
      lists[item.section].append(li)
      entries.push({ stopIndex: i, node: li })
    }
  }
  const seenSkills = new Set()
  for (let i = 0; i < STOPS.length; i++) {
    for (const s of STOPS[i].skills ?? []) {
      if (seenSkills.has(s)) continue
      seenSkills.add(s)
      const li = el('li', 'cvsheet__chip is-pending', s)
      lists.skills.append(li)
      entries.push({ stopIndex: i, node: li })
    }
  }
  return entries
}

export function journey({ ScrollTrigger, reduced, lite, sfx = () => {}, onActive = () => {}, onPrint = () => {} }) {
  const section = document.querySelector('#journey')
  if (!section) return null
  const cards = STOPS.map(renderCard)
  section.querySelector('[data-j-cards]').append(...cards)
  const sheet = section.querySelector('[data-cvsheet]')
  const entries = renderSheet(sheet)
  const total = STOPS.length
  section.querySelector('[data-j-total]').textContent = pad(total)
  sheet.querySelector('[data-cv-total]').textContent = total
  section.querySelector('[data-cv-chip-total]').textContent = total
  sheet.querySelector('[data-cv-print]').addEventListener('click', onPrint)

  // Mobile: the chip opens the sheet as an overlay.
  const chip = section.querySelector('[data-cv-chip]')
  const close = el('button', 'cvsheet__close', 'Close')
  close.type = 'button'
  sheet.querySelector('.cvsheet__foot').append(close)
  chip.addEventListener('click', () => sheet.classList.add('is-open'))
  close.addEventListener('click', () => sheet.classList.remove('is-open'))

  const canGL = !reduced && !lite && !!document.createElement('canvas').getContext('webgl2')
  let active = -1
  const setActive = (i) => {
    if (i === active) return
    const forward = i > active
    active = i
    cards.forEach((c, k) => c.classList.toggle('is-active', k === i))
    let added = 0
    for (const e of entries) {
      const on = e.stopIndex <= i
      if (on && e.node.classList.contains('is-pending')) added++
      e.node.classList.toggle('is-pending', !on)
      e.node.classList.toggle('is-added', on)
    }
    if (added && forward) sfx('paper')
    section.querySelector('[data-j-index]').textContent = pad(i + 1)
    section.querySelector('[data-j-when]').textContent = STOPS[i].when
    sheet.querySelector('[data-cv-count]').textContent = i + 1
    section.querySelector('[data-cv-chip-count]').textContent = i + 1
    sheet.classList.toggle('is-complete', !!STOPS[i].final)
    sheet.querySelector('.cvsheet__kicker').textContent = STOPS[i].final ? 'Your copy · complete. Print it, or email me.' : 'Your copy · building as you fly'
    labels.forEach((l, k) => {
      l.classList.toggle('is-current', k === i)
      l.classList.toggle('is-past', k < i)
    })
    view?.setActive(i)
    onActive(i, total, STOPS[i])
  }

  // Static, fully readable version: no 3D, every card and the whole CV visible.
  if (!canGL) {
    section.classList.add('journey--static')
    cards.forEach((c) => c.classList.add('is-active'))
    entries.forEach((e) => e.node.classList.replace('is-pending', 'is-added'))
    sheet.classList.add('is-complete')
    return { section, cards, setActive: () => {}, total }
  }

  // Island labels, positioned every frame from the 3D projection.
  const labelHost = section.querySelector('.journey__labels')
  const labels = STOPS.map((s, i) => {
    const l = el('div', 'jlabel')
    l.append(el('span', 'jlabel__dot'), el('span', 'jlabel__text', `${pad(i + 1)} ${s.label ?? s.title}`))
    labelHost.append(l)
    return l
  })

  section.style.setProperty('--stops', total)
  let view = null
  const progress = { p: 0 }
  import('./journey3d.js').then(async ({ createJourney3D }) => {
    view = await createJourney3D(section.querySelector('.journey__canvas'), total)
    if (!view) return section.classList.add('journey--static')
    view.onFrame((pts) =>
      pts.forEach((pt, k) => {
        labels[k].style.transform = `translate(${pt.x}vw, ${pt.y}vh)`
        labels[k].style.opacity = pt.visible && pt.y > 4 && pt.y < 96 ? '' : '0'
      }),
    )
    view.setProgress(progress.p)
    view.setActive(Math.max(0, active))
    ScrollTrigger.create({ trigger: section, start: 'top bottom', end: 'bottom top', onToggle: (st) => (st.isActive ? view.start() : view.stop()) })
    section.classList.add('is-3d')
  })

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (st) => {
      progress.p = st.progress
      view?.setProgress(st.progress)
      const u = st.progress * (total - 1)
      const i = Math.floor(u)
      setActive(Math.min(total - 1, u - i > 0.62 ? i + 1 : i))
    },
  })
  setActive(0)
  return {
    section,
    cards,
    total,
    setSwell: (v) => view?.setSwell(v),
    // Scroll position (px) at which stop i is centred, for the tour and for deep links.
    scrollFor(i) {
      const top = section.getBoundingClientRect().top + window.scrollY
      const span = section.offsetHeight - innerHeight
      return top + (span * i) / (total - 1)
    },
  }
}
