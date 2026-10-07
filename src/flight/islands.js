// The island map: an aerial archipelago. Pick a group (Experience, Projects, Grades) to fly into it,
// then pick an island to read that item. Plain, accessible buttons; Esc steps back out.
import { GROUPS } from './islands-data.js'

const el = (tag, cls, text) => {
  const n = document.createElement(tag)
  if (cls) n.className = cls
  if (text != null) n.textContent = text
  return n
}
const small = () => matchMedia('(max-width: 760px)').matches
const src = (base) => `${base}${small() ? '-960' : ''}.webp`

function pin(label, sub, x, y, cls = '') {
  const b = el('button', 'ipin ' + cls)
  b.type = 'button'
  b.style.left = x + '%'
  b.style.top = y + '%'
  b.append(el('span', 'ipin__dot'), el('span', 'ipin__label', label))
  if (sub) b.querySelector('.ipin__label').append(el('small', null, sub))
  return b
}

export function islandMap({ sfx = () => {}, onOpen = () => {} } = {}) {
  const root = document.querySelector('#islands')
  if (!root) return null
  const frame = root.querySelector('.islands__frame')
  const pins = root.querySelector('.islands__pins')
  const crumb = root.querySelector('[data-i-crumb]')
  const back = root.querySelector('[data-i-back]')
  const hint = root.querySelector('[data-i-hint]')
  const chips = root.querySelector('[data-i-chips]')
  const card = root.querySelector('.islands__card')
  const overview = root.querySelector('.islands__img--overview')
  overview.src = src('/media/islands/overview')

  const groupImgs = Object.fromEntries(
    GROUPS.map((g) => {
      const img = el('img', 'islands__img islands__img--group')
      img.alt = ''
      img.decoding = 'async'
      img.dataset.group = g.id
      frame.insertBefore(img, pins)
      return [g.id, img]
    }),
  )

  let group = null
  let item = null

  const showCard = (it, g) => {
    item = it
    card.replaceChildren()
    const close = el('button', 'islands__close', 'Close')
    close.type = 'button'
    close.addEventListener('click', () => hideCard())
    card.append(el('p', 'islands__kicker', `${g.title} · ${it.when}`), el('h3', 'islands__title', it.title), el('p', 'islands__org', it.org))
    for (const p of it.body ?? []) card.append(el('p', 'islands__body', p))
    if (it.links?.length) {
      const links = el('p', 'islands__links')
      for (const l of it.links) {
        const a = el('a', null, l.label + ' ↗')
        a.href = l.href
        if (/^https?:/.test(l.href)) {
          a.target = '_blank'
          a.rel = 'noopener noreferrer'
        }
        links.append(a)
      }
      card.append(links)
    }
    card.append(close)
    card.hidden = false
    requestAnimationFrame(() => card.classList.add('is-open'))
    pins.querySelectorAll('.ipin').forEach((p) => p.classList.toggle('is-on', p.dataset.id === it.id))
    sfx('paper')
    onOpen(g, it)
  }
  const hideCard = () => {
    item = null
    card.classList.remove('is-open')
    pins.querySelectorAll('.ipin').forEach((p) => p.classList.remove('is-on'))
    setTimeout(() => !item && (card.hidden = true), 300)
  }

  const renderOverview = () => {
    pins.replaceChildren(
      ...GROUPS.map((g) => {
        const b = pin(g.title, `${g.items.length} islands`, g.overview.x, g.overview.y, 'ipin--group')
        b.dataset.id = g.id
        b.setAttribute('aria-label', `${g.title}: ${g.items.length} islands. ${g.blurb}`)
        b.addEventListener('click', () => enter(g))
        return b
      }),
    )
    crumb.textContent = 'The archipelago'
    hint.textContent = 'Pick a group of islands.'
    back.hidden = true
  }

  const renderGroup = (g) => {
    pins.replaceChildren(
      ...g.items.map((it) => {
        const b = pin(it.short, it.when, it.x, it.y)
        b.dataset.id = it.id
        b.setAttribute('aria-label', `${it.title}, ${it.org}, ${it.when}`)
        b.addEventListener('click', () => showCard(it, g))
        return b
      }),
    )
    crumb.textContent = g.title
    hint.textContent = g.blurb + ' Pick an island.'
    back.hidden = false
  }

  function enter(g) {
    if (group) return
    group = g
    const img = groupImgs[g.id]
    if (!img.src) img.src = src(g.image)
    frame.style.setProperty('--zx', g.overview.x + '%')
    frame.style.setProperty('--zy', g.overview.y + '%')
    root.classList.add('is-zoomed')
    root.dataset.group = g.id
    img.classList.add('is-on')
    pins.classList.add('is-hidden')
    sfx('chime')
    setTimeout(() => {
      renderGroup(g)
      pins.classList.remove('is-hidden')
      chips.querySelectorAll('button').forEach((c) => c.classList.toggle('is-on', c.dataset.id === g.id))
    }, 650)
  }
  function leave() {
    if (!group) return
    hideCard()
    const img = groupImgs[group.id]
    group = null
    pins.classList.add('is-hidden')
    root.classList.remove('is-zoomed')
    delete root.dataset.group
    img.classList.remove('is-on')
    chips.querySelectorAll('button').forEach((c) => c.classList.remove('is-on'))
    setTimeout(() => {
      renderOverview()
      pins.classList.remove('is-hidden')
    }, 500)
  }
  const go = (g) => {
    if (group?.id === g.id) return
    if (group) {
      leave()
      setTimeout(() => enter(g), 560)
    } else enter(g)
  }

  // The same choices as a plain list (and the only control needed on small screens).
  for (const g of GROUPS) {
    const c = el('button', 'islands__chip', g.title)
    c.type = 'button'
    c.dataset.id = g.id
    c.addEventListener('click', () => go(g))
    chips.append(c)
  }
  back.addEventListener('click', leave)
  root.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return
    item ? hideCard() : leave()
  })
  renderOverview()

  return {
    open(groupId, itemId) {
      const g = GROUPS.find((x) => x.id === groupId)
      if (!g) return
      go(g)
      const it = g.items.find((x) => x.id === itemId)
      if (it) setTimeout(() => showCard(it, g), group ? 50 : 1300)
    },
  }
}
