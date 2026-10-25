// Builds card sections on the homepage and a page per item from content/*.json.
// index.html holds markers (<!-- @content:research:nav --> and <!-- @content:research:section -->);
// each published item also gets its own page at /<collection>/<slug>/.
// Drafts ("published": false) only appear when PREVIEW_DRAFTS=1, so nothing half-written reaches the live site.
// An item with "paper" (Dom's built paper page) gets the full paper restyled into the site's paper template
// (scripts/paper-page.mjs); otherwise it gets the short summary page.
import { paperPage } from './paper-page.mjs'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const COLLECTIONS = [
  { id: 'research', file: 'content/research.json', title: 'Research', label: 'Research', intro: 'Small, careful studies on how AI behaves in practice.', back: 'Research' },
]

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
const monthYear = (ym) => {
  const [y, m] = String(ym ?? '').split('-').map(Number)
  return y && m ? new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : ''
}

function load(root, c) {
  const data = JSON.parse(readFileSync(resolve(root, c.file), 'utf8'))
  const drafts = process.env.PREVIEW_DRAFTS === '1'
  return (data.items ?? []).filter((i) => i.published || drafts)
}

const href = (c, item) => `/${c.id}/${item.slug}/`

function card(c, item) {
  const visual = item.card_image
    ? `<div class="project-screenshot"><img src="${esc(item.card_image)}" alt="${esc(item.card_image_alt ?? '')}" loading="lazy"></div>`
    : ''
  const draft = item.published ? '' : '<span class="content-draft">Draft, not published</span>'
  return `
                <a class="project-card project-card--link${item.card_image ? '' : ' project-card--text'}" href="${href(c, item)}">
                    ${visual}
                    <div class="project-content">
                        <p class="project-eyebrow">${esc(item.label)}${item.date ? ` &middot; ${esc(monthYear(item.date))}` : ''}${draft}</p>
                        <h3 class="project-name">${esc(item.title)}</h3>
                        <p class="project-lede">${esc(item.subtitle)}</p>
                        ${(item.card_paragraphs ?? []).map((p) => `<p class="project-desc">${esc(p)}</p>`).join('\n                        ')}
                        ${item.skills?.length ? `<p class="project-skills"><strong>Skills:</strong> ${item.skills.map(esc).join(' &middot; ')}</p>` : ''}
                        <span class="project-more">${esc(item.cta ?? 'Read the study')} &rarr;</span>
                    </div>
                </a>`
}

function section(c, items) {
  if (!items.length) return ''
  return `<!-- ${c.title} (generated from ${c.file}) -->
        <section id="${c.id}" style="background: var(--bg-section);">
            <div class="section-inner reveal">
                <h2 class="section-title">${esc(c.title)}</h2>
                <p class="content-intro">${esc(c.intro)}</p>
${items.map((i) => card(c, i)).join('\n')}
            </div>
        </section>`
}

function page(c, item, root) {
  if (item.paper) return paperPage(c, item, root)
  const findings = (item.key_findings ?? []).map((f) => `<li>${esc(f)}</li>`).join('')
  const charts = (item.charts ?? [])
    .map((ch) => `<figure><img src="${esc(ch.src)}" alt="${esc(ch.alt)}" loading="lazy"><figcaption>${esc(ch.caption)}</figcaption></figure>`)
    .join('')
  const actions = [
    item.pdf ? `<a class="btn" href="${esc(item.pdf)}" target="_blank" rel="noopener">Read the full paper (PDF)</a>` : '',
    item.repo_url ? `<a class="btn btn--ghost" href="${esc(item.repo_url)}" target="_blank" rel="noopener">Code and data</a>` : '',
  ].join('')
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(item.title)} · Lewis Wilson</title>
<meta name="description" content="${esc(item.subtitle)}">
${item.published ? '' : '<meta name="robots" content="noindex">'}
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>LW</text></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,300;0,400;0,500;1,300&display=swap" rel="stylesheet">
<style>
:root{--bg:#F5F2ED;--bg-section:#EBE8E2;--bg-card:#FFFFFF;--fg:#1A1A18;--fg-mid:#3D3D3A;--fg-muted:#7A7A72;--green:#2D5A4E;--green-soft:rgba(45,90,78,.08);--accent:#C4735B;--rule:#D6D3CC;--rule-light:#E5E2DB;--max-w:760px}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--fg);font-family:'Roboto',system-ui,sans-serif;font-weight:300;font-size:1rem;line-height:1.7;-webkit-font-smoothing:antialiased}
::selection{background:var(--green);color:#fff}
a{color:var(--green)}
a:focus-visible,.btn:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.top{border-bottom:1px solid var(--rule-light);background:rgba(245,242,237,.9);position:sticky;top:0;backdrop-filter:blur(10px)}
.top div{max-width:1100px;margin:0 auto;padding:0 16px;height:64px;display:flex;align-items:center;justify-content:space-between}
.top a{text-decoration:none;color:var(--fg);font-weight:400}
.top .back{font-size:.85rem;color:var(--fg-muted)}
main{max-width:var(--max-w);margin:0 auto;padding:4rem 16px 5rem}
.eyebrow{font-size:.7rem;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--green)}
.draft{display:inline-block;margin-left:.6rem;color:#9a4f38;background:rgba(196,115,91,.12);padding:.1rem .45rem;border-radius:3px}
h1{font-weight:300;font-size:clamp(2.1rem,6vw,3.1rem);letter-spacing:-.02em;line-height:1.1;margin:.9rem 0 .8rem}
.lede{font-style:italic;color:var(--accent);font-size:1.2rem;margin-bottom:2.5rem}
h2{font-weight:400;font-size:1.35rem;margin:3rem 0 .9rem}
p{color:var(--fg-mid);margin-bottom:1rem}
.findings{background:var(--bg-card);border:1px solid var(--rule-light);border-radius:6px;padding:1.5rem 1.75rem}
.findings h2{margin-top:0}
.findings ol{padding-left:1.25rem;display:grid;gap:.6rem;color:var(--fg)}
.findings li::marker{color:var(--green);font-weight:500}
figure{margin:2rem 0;background:var(--bg-card);border:1px solid var(--rule-light);border-radius:6px;padding:1.25rem}
figure img{display:block;width:100%;height:auto}
figcaption{font-size:.85rem;color:var(--fg-muted);margin-top:.75rem}
.actions{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:2.5rem}
.btn{display:inline-block;background:var(--green);color:#fff;text-decoration:none;font-weight:400;padding:.75rem 1.2rem;border-radius:4px;border:1px solid var(--green)}
.btn:hover{background:#244a40}
.btn--ghost{background:transparent;color:var(--green)}
.btn--ghost:hover{background:var(--green-soft)}
.skills{font-size:.85rem;color:var(--fg-muted);margin-top:2.5rem;padding-top:1.25rem;border-top:1px solid var(--rule-light)}
.skills strong{color:var(--fg-mid);font-weight:500}
footer{border-top:1px solid var(--rule-light);text-align:center;font-size:.8rem;color:var(--fg-muted);padding:1.5rem 16px 2rem}
</style>
</head>
<body>
<header class="top"><div><a href="/">Lewis Wilson</a><a class="back" href="/#${c.id}">&larr; All ${esc(c.back.toLowerCase())}</a></div></header>
<main>
<p class="eyebrow">${esc(item.label)}${item.date ? ` &middot; ${esc(monthYear(item.date))}` : ''}${item.published ? '' : '<span class="draft">Draft</span>'}</p>
<h1>${esc(item.title)}</h1>
<p class="lede">${esc(item.subtitle)}</p>
${findings ? `<section class="findings"><h2>Key findings</h2><ol>${findings}</ol></section>` : ''}
${item.abstract ? `<h2>Summary</h2><p>${esc(item.abstract)}</p>` : ''}
${charts}
${item.method ? `<h2>How it was done</h2><p>${esc(item.method)}</p>` : ''}
${actions ? `<div class="actions">${actions}</div>` : ''}
${item.skills?.length ? `<p class="skills"><strong>Skills:</strong> ${item.skills.map(esc).join(' &middot; ')}</p>` : ''}
</main>
<footer>&copy; ${new Date().getFullYear()} Lewis Wilson &middot; <a href="/">lewis-wilson.com</a></footer>
</body>
</html>
`
}

export default function contentPages() {
  let root = process.cwd()
  return {
    name: 'content-pages',
    configResolved(config) {
      root = config.root
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        if (!/(^|[\\/])index\.html$/.test(ctx.filename ?? ctx.path ?? '')) return html
        for (const c of COLLECTIONS) {
          const items = load(root, c)
          html = html
            .replace(`<!-- @content:${c.id}:nav -->`, items.length ? `<li><a href="#${c.id}">${esc(c.title)}</a></li>` : '')
            .replace(`<!-- @content:${c.id}:section -->`, section(c, items))
        }
        return html
      },
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const m = /^\/([a-z-]+)\/([a-z0-9-]+)\/?$/.exec((req.url ?? '').split('?')[0])
        const c = m && COLLECTIONS.find((x) => x.id === m[1])
        const item = c && load(root, c).find((i) => i.slug === m[2])
        if (!item) return next()
        res.setHeader('content-type', 'text/html; charset=utf-8')
        res.end(page(c, item, root))
      })
    },
    generateBundle() {
      for (const c of COLLECTIONS) {
        for (const item of load(root, c)) {
          this.emitFile({ type: 'asset', fileName: `${c.id}/${item.slug}/index.html`, source: page(c, item, root) })
        }
      }
    },
  }
}
