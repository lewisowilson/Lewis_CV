// Full research-paper pages (/research/<slug>/) in the site's look.
// Dom's build (consultancy/ai-credibility-sprint/publish/build.py) is the source of truth for the paper's text;
// content/research/<slug>.html is a copy of its output. We take its hero, contents and body and give them the
// site's design: Roboto only, the site nav, cream panels, and a contents rail that tracks reading position.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const grab = (html, re, what, slug) => {
  const m = re.exec(html)
  if (!m) throw new Error(`paper-page: ${slug}: couldn't find the ${what} in ${slug}.html`)
  return m[1]
}

// Florian's industry reports (florian/<project>/build.py, web output out/index.html) have a different shape:
// a nav.contents list, then the sections, numbered endnotes and back matter. "paper_format": "report" selects this.
// The hero is built from research.json, since the report's own header carries the publisher's branding.
function reportParts(root, item) {
  const html = readFileSync(resolve(root, item.paper), 'utf8').replace(/<!--[\s\S]*?-->/g, '')
  const slug = item.slug
  const toc = grab(html, /<nav class="contents">[\s\S]*?(<ol>[\s\S]*?<\/ol>)<\/nav>/, 'contents', slug).replace(/<span class="ta">[\s\S]*?<\/span>/g, '')
  const body = grab(html, /<\/nav>([\s\S]*?)<\/body>/, 'body', slug).replace(/<style[\s\S]*?<\/style>/g, '')
  const figures = (body.match(/<figure class="chart"/g) ?? []).length
  const notes = (body.match(/<li id="note-\d+"/g) ?? []).length
  const tags = [item.label, 'October 2026'].map((t) => `<span class="tag">${esc(t)}</span>`).join('')
  const hero = `<div class="tags">${tags}</div>
<h1>${esc(item.title)}</h1>
<p class="subtitle">${esc(item.subtitle)}</p>
${item.lede ? `<p class="lede">${esc(item.lede)}</p>` : ''}
<div class="byline"><b>Lewis Wilson</b><span>Research and analysis</span><span>${figures} figures · ${notes} notes</span></div>`
  const cite = `Wilson, L. (2026). ${item.title}: ${item.subtitle}. Industry report. ${`https://lewis-wilson.com/research/${slug}/`}`
  const citeBox = `<section class="cite-box" id="cite"><h2 class="panel-h">Cite this report</h2><p id="cite-text">${esc(cite)}</p><button class="btn" type="button" data-copy="cite-text">Copy citation</button></section>`
  const footer = `<span>&copy; 2026 Lewis Wilson</span><a href="/">lewis-wilson.com</a>`
  return { hero, toc, body: `<article class="report">${body}</article>${citeBox}`, footer }
}

export function paperParts(root, item) {
  if (item.paper_format === 'report') return reportParts(root, item)
  const html = readFileSync(resolve(root, item.paper), 'utf8')
  const slug = item.slug
  const hero = grab(html, /<div class="hero-in">([\s\S]*?)<div class="actions">/, 'hero', slug)
  const toc = grab(html, /<div class="rail-fill" id="rail"><\/div>\s*([\s\S]*?)\s*<\/div>\s*<\/details>/, 'contents', slug)
  const body = grab(html, /<main>([\s\S]*?)<\/main>/, 'body', slug)
  const footer = grab(html, /<footer><div>([\s\S]*?)<\/div><\/footer>/, 'footer', slug).replace(/ style="color:inherit"/g, '')
  if (/\[repository link/.test(body)) throw new Error(`paper-page: ${slug}: a repository placeholder is left in the paper (the repos aren't public yet)`)
  return { hero: hero.replace(/ class="mono"/g, ''), toc, body, footer }
}

export function paperPage(c, item, root) {
  const { hero, toc, body, footer } = paperParts(root, item)
  // Lewis (25 Oct 2026): no publisher name on the site for now.
  for (const word of item.banned_words ?? []) {
    if (new RegExp(word, 'i').test(hero + toc + body + footer + JSON.stringify({ ...item, banned_words: undefined }))) throw new Error(`paper-page: ${item.slug}: "${word}" must not appear on the site`)
  }
  const what = item.paper_format === 'report' ? 'report' : 'paper'
  const pdf = item.pdf ? `<a class="btn" href="${esc(item.pdf)}" download>Download PDF</a>` : ''
  const url = `https://lewis-wilson.com/${c.id}/${item.slug}/`
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(item.title)} · Lewis Wilson</title>
<meta name="description" content="${esc(item.subtitle)}">
<meta name="author" content="Lewis Wilson">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(item.title)}">
<meta property="og:description" content="${esc(item.subtitle)}">
<meta property="og:url" content="${esc(url)}">
${item.card_image ? `<meta property="og:image" content="https://lewis-wilson.com${esc(item.card_image)}">` : ''}
${item.published ? '' : '<meta name="robots" content="noindex">'}
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>LW</text></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,300;0,400;0,500;1,300&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<a class="skip-link" href="#paper">Skip to the paper</a>
<nav class="site" aria-label="Site">
  <div class="nav-inner">
    <a href="/" class="nav-logo"><img class="nav-avatar" src="/images/lewis-avatar.jpg?v=3" alt="" width="36" height="36">Lewis Wilson</a>
    <a class="nav-back" href="/#${c.id}">&larr; All ${esc(c.back.toLowerCase())}</a>
  </div>
  <div class="progress" id="progress"></div>
</nav>

<header class="hero">
  <div class="hero-in"><div class="hero-text">
${item.published ? '' : '<p class="draft">Draft preview, not published</p>'}
${hero}
    <div class="actions">${pdf}<a class="btn btn--ghost" href="#cite">Cite this ${what}</a></div>
  </div></div>
</header>

<div class="layout">
  <aside class="toc"><nav aria-label="Contents"><details open>
    <summary><span class="lbl">Contents</span><span class="pct" id="pct">0% read</span></summary>
    <div class="rail"><div class="rail-fill" id="rail"></div>
${toc}
    </div>
  </details></nav></aside>
  <main id="paper">
${body}
  </main>
</div>

<button class="top-btn" id="top" type="button">&uarr; Top</button>
<footer><div>${footer}</div></footer>
<script>${SCRIPT}</script>
</body>
</html>
`
}

const CSS = `
:root{--bg:#F5F2ED;--bg-section:#EBE8E2;--bg-card:#FFFFFF;--fg:#1A1A18;--fg-mid:#3D3D3A;--fg-muted:#7A7A72;--green:#2D5A4E;--green-soft:rgba(45,90,78,.08);--accent:#C4735B;--rule:#D6D3CC;--rule-light:#E5E2DB;--nav-h:60px;--measure:42rem}
*,*::before,*::after{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:calc(var(--nav-h) + 1.5rem)}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
body{margin:0;background:var(--bg);color:var(--fg-mid);font-family:'Roboto',system-ui,sans-serif;font-weight:300;font-size:1.0625rem;line-height:1.75;-webkit-font-smoothing:antialiased}
::selection{background:var(--green);color:#fff}
a{color:var(--green);text-underline-offset:2px;text-decoration-thickness:1px}
a:focus-visible,button:focus-visible,summary:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
b,strong{font-weight:500;color:var(--fg)}
.skip-link{position:absolute;top:-100%;left:1rem;background:var(--green);color:#fff;padding:.4rem .8rem;font-size:.85rem;text-decoration:none;z-index:200}
.skip-link:focus{top:0}

nav.site{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(245,242,237,.9);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid var(--rule-light)}
.nav-inner{max-width:1100px;margin:0 auto;padding:0 2rem;height:var(--nav-h);display:flex;align-items:center;justify-content:space-between;gap:1rem}
.nav-logo{font-size:1.3rem;font-weight:500;color:var(--fg);text-decoration:none;display:inline-flex;align-items:center;gap:.7rem;white-space:nowrap}
.nav-avatar{width:36px;height:36px;flex:none;border-radius:50%;object-fit:cover;box-shadow:0 0 0 2px #fff,0 0 0 3.5px var(--accent)}
.nav-back{font-size:.78rem;font-weight:400;color:var(--fg-muted);text-decoration:none;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}
.nav-back:hover{color:var(--green)}
.progress{position:absolute;left:0;right:0;bottom:-1px;height:2px;background:var(--green);transform:scaleX(0);transform-origin:0 50%}

.hero{padding:calc(var(--nav-h) + 4.5rem) 2rem 3.5rem;border-bottom:1px solid var(--rule-light)}
.hero-in{max-width:1100px;margin:0 auto}
.hero-text{max-width:52rem}
.draft{display:inline-block;font-size:.75rem;color:#9a4f38;background:rgba(196,115,91,.12);padding:.15rem .5rem;border-radius:3px;margin:0 0 1rem}
.tags{display:flex;flex-wrap:wrap;gap:.35rem .9rem;margin-bottom:1.1rem}
.tag{font-size:.7rem;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--green)}
.tag.muted{color:var(--accent)}
.tag+.tag::before{content:'\\00b7';margin-right:.9rem;color:var(--fg-muted)}
h1{font-weight:300;font-size:clamp(2.2rem,5vw,3.2rem);letter-spacing:-.02em;line-height:1.1;color:var(--fg);margin:0 0 1rem;max-width:var(--measure)}
.subtitle{font-style:italic;color:var(--accent);font-size:1.2rem;margin:0 0 1.6rem}
.lede{font-size:1.15rem;color:var(--fg-mid);margin:0 0 1.75rem;max-width:var(--measure)}
.byline{display:flex;flex-wrap:wrap;gap:.3rem 1.25rem;font-size:.85rem;color:var(--fg-muted);margin-bottom:2.25rem}
.byline b{color:var(--fg)}
.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1px solid var(--rule);border-bottom:1px solid var(--rule);margin-bottom:2rem}
.stat{padding:1.1rem 1.25rem 1.1rem 0;display:flex;flex-direction:column;gap:.2rem}
.stat+.stat{padding-left:1.25rem;border-left:1px solid var(--rule-light)}
.stat .v{font-size:2rem;font-weight:300;letter-spacing:-.02em;color:var(--green);line-height:1.1;font-variant-numeric:tabular-nums}
.stat .k{font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;color:var(--fg-muted);line-height:1.35}
.actions{display:flex;flex-wrap:wrap;gap:.75rem}
.btn{display:inline-block;font:400 .95rem/1.2 'Roboto',system-ui,sans-serif;background:var(--green);color:#fff;text-decoration:none;padding:.75rem 1.2rem;border-radius:4px;border:1px solid var(--green);cursor:pointer}
.btn:hover{background:#244a40}
.btn--ghost{background:transparent;color:var(--green)}
.btn--ghost:hover{background:var(--green-soft)}

.layout{max-width:1100px;margin:0 auto;padding:3.5rem 2rem 5rem;display:grid;grid-template-columns:15rem minmax(0,var(--measure));gap:4rem;justify-content:start}
.toc{position:sticky;top:calc(var(--nav-h) + 2rem);align-self:start;max-height:calc(100vh - var(--nav-h) - 4rem);overflow:auto;font-size:.85rem;line-height:1.4}
.toc summary{list-style:none;display:flex;justify-content:space-between;align-items:baseline;gap:1rem;cursor:pointer;padding-bottom:.75rem;border-bottom:1px solid var(--rule-light);margin-bottom:.9rem}
.toc summary::-webkit-details-marker{display:none}
.toc .lbl{font-size:.7rem;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--green)}
.toc .pct{font-size:.75rem;color:var(--fg-muted);font-variant-numeric:tabular-nums}
.rail{position:relative;padding-left:1rem;border-left:2px solid var(--rule-light)}
.rail-fill{position:absolute;left:-2px;top:0;width:2px;height:0;background:var(--green);transition:height .2s ease}
.toc ol{list-style:none;margin:0;padding:0}
.toc li{margin:.1rem 0}
.toc a{display:flex;gap:.6rem;padding:.25rem 0;color:var(--fg-muted);text-decoration:none}
.toc a:hover{color:var(--green)}
.toc a.done{color:var(--fg-mid)}
.toc a.on{color:var(--green);font-weight:500}
.toc .tno{min-width:1.6rem;font-variant-numeric:tabular-nums;color:var(--rule)}
.toc a.on .tno,.toc a.done .tno{color:var(--accent)}
.toc ol.sub{display:none;padding-left:.8rem}
.toc li.open>ol.sub{display:block}
.toc a.l3{font-size:.8rem}

main{min-width:0}
main>section,article{margin:0 0 3rem}
.abstract,.cite-box{background:var(--bg-card);border:1px solid var(--rule-light);border-radius:4px;padding:1.75rem 2rem}
.findings{border-left:3px solid var(--green);padding:.25rem 0 .25rem 1.75rem}
main h2.panel-h{font-size:.7rem;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--green);margin:0 0 1rem}
.abstract p{margin:0 0 1rem}
.findings ol{margin:0;padding-left:1.25rem;display:grid;gap:.75rem;color:var(--fg)}
.findings li::marker{color:var(--green);font-weight:500}
.keywords{display:flex;flex-wrap:wrap;gap:.4rem;margin:1.25rem 0 0}
.keywords span{font-size:.75rem;padding:.2rem .6rem;border-radius:3px;background:var(--green-soft);color:var(--green)}
article h2{font-weight:300;font-size:1.75rem;letter-spacing:-.01em;line-height:1.2;color:var(--fg);margin:3.5rem 0 1rem;padding-top:1.75rem;border-top:1px solid var(--rule-light)}
article h2:first-child{margin-top:0;border-top:0;padding-top:0}
article h3{font-weight:400;font-size:1.15rem;line-height:1.35;color:var(--fg);margin:2.25rem 0 .6rem}
.secno{color:var(--accent);margin-right:.7rem;font-variant-numeric:tabular-nums}
.anchor{margin-left:.5rem;color:var(--rule);text-decoration:none;opacity:0;transition:opacity .15s}
h2:hover .anchor,h3:hover .anchor,.anchor:focus{opacity:1}
article p{margin:0 0 1.1rem}
article ul,article ol{padding-left:1.4rem;margin:0 0 1.2rem}
article li{margin:.3rem 0}
.cite{text-decoration:none;border-bottom:1px dotted var(--green)}
figure{margin:2.25rem 0}
figure.chart{margin:2.5rem 0}
figure.chart svg{display:block;width:100%;height:auto;border-radius:4px}
figcaption{font-size:.88rem;line-height:1.55;color:var(--fg-muted);margin-top:.85rem}
figure.table figcaption{margin:0 0 .75rem}
figcaption b{color:var(--fg-mid)}
.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid var(--rule-light);border-radius:4px}
table{width:100%;border-collapse:collapse;font-size:.88rem;line-height:1.45;font-variant-numeric:tabular-nums;background:var(--bg-card)}
th,td{text-align:left;padding:.6rem .75rem;border-bottom:1px solid var(--rule-light);vertical-align:top}
tr:last-child td{border-bottom:0}
th{font-weight:500;color:var(--fg);border-bottom:1px solid var(--rule);background:var(--bg-section)}
ol.refs{padding-left:0;list-style:none;font-size:.88rem;line-height:1.55}
ol.refs li{padding-left:1.5rem;text-indent:-1.5rem;margin:.6rem 0}
ol.refs a{overflow-wrap:anywhere}
.cite-box p{margin:0 0 1rem}
.bib{font:400 .78rem/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;background:var(--bg);border:1px solid var(--rule-light);border-radius:3px;padding:1rem;overflow-x:auto;white-space:pre;margin:0 0 1rem;color:var(--fg-mid)}
.licence{font-size:.85rem;color:var(--fg-muted)}
.cite-box .btn{background:transparent;color:var(--green);font-size:.85rem;padding:.55rem .9rem}
.cite-box .btn:hover{background:var(--green-soft)}
.top-btn{position:fixed;right:1.25rem;bottom:1.25rem;z-index:50;font:400 .8rem 'Roboto',sans-serif;background:var(--bg-card);color:var(--green);border:1px solid var(--rule);border-radius:4px;padding:.5rem .8rem;cursor:pointer;opacity:0;pointer-events:none;transition:opacity .2s}
.top-btn.show{opacity:1;pointer-events:auto}
footer{border-top:1px solid var(--rule);padding:2rem}
footer div{max-width:1100px;margin:0 auto;display:flex;flex-wrap:wrap;gap:.4rem 2rem;justify-content:space-between;font-size:.8rem;color:var(--fg-muted)}
footer a{color:inherit}

/* Industry reports (paper_format: report) */
.report .section{margin:0 0 3.5rem}
.report .opener{margin:0 0 1.5rem;padding-bottom:1rem;border-bottom:1px solid var(--rule-light)}
.report .opener h2,.report .notes h2{margin:0;padding:0;border:0}
.report .notes h2{margin-bottom:1rem}
.report .opener .kick{display:block;font-size:.7rem;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--green);margin-bottom:.6rem}
.report .opener .kick b{color:var(--accent);margin-right:.5rem;font-weight:500}
.report p.lede{font-size:1.15rem;color:var(--fg)}
.report h4{margin:0}
.keystats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;background:var(--rule-light);border:1px solid var(--rule-light);border-radius:4px;overflow:hidden;margin:1.5rem 0 2rem}
.keystats.n3,.keystats.n6{grid-template-columns:repeat(3,minmax(0,1fr))}
.tile{background:var(--bg);padding:1rem 1.1rem;display:flex;flex-direction:column;gap:.35rem}
.tile .v{font-size:1.9rem;font-weight:300;letter-spacing:-.02em;color:var(--green);line-height:1.1;font-variant-numeric:tabular-nums}
.tile:first-child .v{color:var(--accent)}
.tile .l{font-size:.82rem;line-height:1.45;color:var(--fg-mid)}
.impl,.box{border-radius:4px;padding:1.25rem 1.5rem;margin:1.75rem 0}
.impl{border:1px solid var(--green)}
.box{background:var(--bg-card);border:1px solid var(--rule-light)}
.box h4,.impl h4{font-size:.7rem;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--green);margin:0 0 .6rem}
.box p:last-child{margin-bottom:0}
.impl ul{list-style:none;padding:0;margin:0}
.impl li{position:relative;padding-left:1.4rem;color:var(--fg)}
.impl li::before{content:'';position:absolute;left:0;top:.85em;width:.7rem;height:1.5px;background:var(--accent)}
.insight{margin:2rem 0;padding:1.25rem 0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
.insight .k{font-size:.7rem;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--accent)}
.insight p{font-size:1.35rem;line-height:1.35;color:var(--fg);margin:.4rem 0 0}
.fhead{margin-bottom:.75rem}
.fno{font-size:.7rem;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--green)}
.fhead h4{font-weight:400;font-size:1.05rem;line-height:1.35;color:var(--fg);margin:.2rem 0 .1rem}
.fsub{font-size:.85rem;color:var(--fg-muted);margin:0}
.checklist{list-style:none;padding:0!important}
.checklist li{display:grid;grid-template-columns:2.2rem 1fr auto;gap:.75rem;align-items:center;padding:.75rem 0;border-bottom:1px solid var(--rule-light);margin:0}
.checklist .no{color:var(--accent);font-variant-numeric:tabular-nums}
.checklist .q{color:var(--fg)}
.checklist .yn{font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;color:var(--fg-muted);display:flex;gap:.6rem;align-items:center;white-space:nowrap}
.checklist .yn i{display:inline-block;width:.8rem;height:.8rem;border:1px solid var(--green);margin-left:.25rem;vertical-align:-1px}
.notes ol{list-style:none;padding:0;font-size:.85rem;line-height:1.55}
.notes li{display:grid;grid-template-columns:2rem 1fr;margin:.5rem 0;overflow-wrap:anywhere}
.notes .n{color:var(--green);font-weight:500;font-variant-numeric:tabular-nums}
.notes .accessed{font-size:.85rem;color:var(--fg-muted)}
.backwrap{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem 2rem;margin-top:3rem;padding-top:2rem;border-top:1px solid var(--rule-light)}
.back h3{font-size:.7rem;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--green);margin:0 0 .5rem}
.back p{font-size:.9rem;line-height:1.6;margin:0 0 .6rem}
sup.cite{font-size:.68rem;line-height:0;margin-left:1px}
sup.cite a{text-decoration:none}

@media (max-width:1023px){
  .layout{grid-template-columns:minmax(0,1fr);gap:2rem;padding-top:2rem}
  .toc{position:static;max-height:none;background:var(--bg-card);border:1px solid var(--rule-light);border-radius:4px;padding:1rem 1.25rem}
  .toc summary{margin-bottom:0;padding-bottom:0;border-bottom:0}
  .toc details[open] summary{margin-bottom:.9rem;padding-bottom:.75rem;border-bottom:1px solid var(--rule-light)}
  .toc summary .lbl::after{content:' +'}
  .toc details[open] summary .lbl::after{content:' \\2013'}
}
@media (max-width:640px){
  .nav-inner{padding:0 16px}
  .nav-logo{font-size:1.1rem}
  .hero{padding:calc(var(--nav-h) + 2.5rem) 16px 2.5rem}
  .layout{padding:1.5rem 16px 4rem}
  .stats{grid-template-columns:repeat(2,minmax(0,1fr))}
  .stat:nth-child(3){padding-left:0;border-left:0}
  .stat:nth-child(n+3){border-top:1px solid var(--rule-light)}
  .abstract,.cite-box{padding:1.25rem}
  .keystats,.keystats.n3,.keystats.n6{grid-template-columns:repeat(2,minmax(0,1fr))}
  .backwrap{grid-template-columns:minmax(0,1fr)}
  .checklist li{grid-template-columns:2rem 1fr}
  .checklist .yn{grid-column:2}
  footer{padding:1.5rem 16px}
}
@media print{nav.site,.toc,.top-btn,.actions{display:none}.layout{display:block}}
`

const SCRIPT = `
  const kw = document.querySelector('.keywords')
  if (kw) kw.dataset.k.split('; ').forEach((k) => { const s = document.createElement('span'); s.textContent = k; kw.appendChild(s) })

  document.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', () => {
    const t = document.getElementById(b.dataset.copy).textContent, label = b.textContent
    ;(navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { b.textContent = 'Copied'; setTimeout(() => (b.textContent = label), 1600) }, () => {})
  }))

  // Contents: beside the paper on wide screens, collapsed above it on narrow ones; tracks the reading position.
  const details = document.querySelector('.toc details')
  if (!matchMedia('(min-width: 1024px)').matches) details.open = false
  const items = [...document.querySelectorAll('.toc a')].map((a) => ({ a, el: document.getElementById(a.getAttribute('href').slice(1)) })).filter((x) => x.el)
  const progress = document.getElementById('progress'), pct = document.getElementById('pct')
  const rail = document.getElementById('rail'), railBox = rail.parentElement, topBtn = document.getElementById('top')
  const paper = document.getElementById('paper')
  let ticking = false
  function update() {
    ticking = false
    const docH = document.documentElement.scrollHeight - innerHeight
    progress.style.transform = 'scaleX(' + (docH > 0 ? Math.min(1, scrollY / docH) : 0) + ')'
    const p = paper.getBoundingClientRect(), line = innerHeight * 0.3
    pct.textContent = Math.round(Math.max(0, Math.min(1, (line - p.top) / p.height)) * 100) + '% read'
    topBtn.classList.toggle('show', scrollY > innerHeight)
    if (!items.length) return
    let cur = 0
    items.forEach((x, k) => { if (x.el.getBoundingClientRect().top < line) cur = k })
    items.forEach((x, k) => { x.a.classList.toggle('on', k === cur); x.a.classList.toggle('done', k < cur) })
    document.querySelectorAll('.toc li.open').forEach((li) => li.classList.remove('open'))
    const act = items[cur].a, li = act.closest('ol:not(.sub) > li')
    if (li) li.classList.add('open')
    const r = act.getBoundingClientRect(), box = railBox.getBoundingClientRect()
    rail.style.height = Math.max(0, r.bottom - box.top) + 'px'
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update) } }, { passive: true })
  addEventListener('resize', update)
  details.addEventListener('toggle', update)
  topBtn.addEventListener('click', () => scrollTo({ top: 0 }))
  update()
`
