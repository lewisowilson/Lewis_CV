// Tailored links: ?for=<sector or company> reorders and highlights the real CV for that reader.
// Nothing is added or reworded; only the order and emphasis change.

// How much each tag matters to each kind of reader.
const SECTORS = {
  finance: { label: 'Finance', weights: { finance: 3, quant: 3, insurance: 2, fintech: 1, ai: 1, client: 1 } },
  fintech: { label: 'Fintech', weights: { fintech: 3, eng: 2, ai: 2, finance: 2, quant: 1 } },
  ai: { label: 'AI', weights: { ai: 3, eng: 2, quant: 1 } },
  insurance: { label: 'Insurance', weights: { insurance: 3, quant: 3, finance: 2, client: 1 } },
}

// Company links Lewis sends with applications: slug -> display name, three-letter code, sector.
// Add one line per application, e.g.  acme: { name: 'Acme Capital', code: 'ACM', sector: 'finance' },
export const COMPANIES = {}

export function tailor() {
  const store = (fn) => {
    try {
      return fn(sessionStorage)
    } catch {
      return null
    }
  }
  const url = new URL(location.href)
  const param = url.searchParams.get('for')?.toLowerCase().replace(/[^a-z0-9-]/g, '')
  if (param) {
    url.searchParams.delete('for')
    history.replaceState(null, '', url)
    if (COMPANIES[param] || SECTORS[param]) store((s) => s.setItem('lw-for', param))
  }
  const key = store((s) => s.getItem('lw-for'))
  const company = key && COMPANIES[key]
  const sector = SECTORS[company?.sector ?? key]
  if (!sector) return null

  // Reorder each list in the brief by relevance (stable for ties) and mark the strongest matches.
  document.querySelectorAll('.brief__list').forEach((list) => {
    const items = [...list.children]
    const score = (el) => (el.dataset.tags ?? '').split(' ').reduce((s, t) => s + (sector.weights[t] ?? 0), 0)
    const ranked = items.map((el, i) => ({ el, i, s: score(el) })).sort((a, b) => b.s - a.s || a.i - b.i)
    ranked.forEach(({ el, s }, rank) => {
      list.appendChild(el)
      el.classList.toggle('is-match', s >= 3 && rank < 2)
    })
  })

  const who = company?.name ?? `${sector.label} teams`
  const kicker = document.querySelector('[data-brief-kicker]')
  if (kicker) kicker.textContent = `Flight brief · prepared for ${who}`
  if (company) {
    const to = document.querySelector('[data-pass-to]')
    if (to) to.innerHTML = `<small>To</small><b>${company.code}</b><span>${company.name} · 2027-28</span>`
  }
  document.documentElement.dataset.for = key
  return { who, company, sector }
}
