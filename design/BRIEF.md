# lewis-wilson.com: "Flight Plan" design brief

Working title: **Flight Plan**. One idea runs through the whole site and the portal: a dawn flight across a Nordic archipelago. Contour lines are how Lewis reads problems (maths, data, risk). The route line is his trajectory. Each section of the page is a waypoint. The portal's departures board is the airport you leave from.

It works because it's true. Lewis has canoed these lakes (Sweden, Finland). The photos are real. The board already exists in the portal. Nothing here is decoration for its own sake.

## What the research says (all four reports, condensed)

- **Recruiters** give a site about 30 seconds. In that time they need name, positioning, CV/contact and proof links, visible without hover and without scrolling. The site must never block content, and it must have no scroll-jacking or hidden content.
- **Award-winning portfolios** use two colours plus one accent and run their motion on GSAP. Their signature touches:
  - a short preloader that *becomes* the hero
  - line-mask text reveals
  - a sticky section index
  - project rows with hover previews
  - a live clock and location

  Custom cursors, sound on by default, 3D worlds you have to drive around, and long loaders all read as gimmicks.
- **Anti-slop.** Anthropic's own frontend-design skill names "cream + serif + terracotta" as an AI tell, and that is today's site, so we move off it. The other skills also ban:
  - the fonts Inter, Fraunces, Instrument Serif, and the Satoshi/Clash/Cabinet starter pack
  - em-dashes
  - eyebrow-label spam
  - three identical cards in a row
  - purple glows and fake dashboards
- **The proven AI pipeline**, used by Chase AI, Saraev, Mejba, WPDev, Hisan and others:
  1. Make a start keyframe in Nano Banana.
  2. Feed it back as a reference to make the end keyframe.
  3. Have the video model interpolate between the two, with the camera locked or moving slowly and evenly.
  4. Use ffmpeg to turn the video into 120-180 WebP frames, scrubbed on a `<canvas>`.

  Match backgrounds to exact hex values. Regenerate shots that drift, using the best still as the reference.
- **Prompting.**
  - Describe the scene in sentences, not keyword soup.
  - Use one camera per prompt, plus film/lens language and a muted grade with grain.
  - Say what *should* be there.
  - Keep one style block, word for word, in every prompt, and re-upload the hero still as a reference.
  - For video: "one continuous shot, no cuts, no text, no music". Gemini now uses **Gemini Omni Flash** for video: 10 s clips, 16:9 or 9:16, 24 fps, audio on by default (ask for none), image-to-video from uploaded stills.

## Visual system

**Palette** (two colours plus one accent; cool, not cream):

| Token | Hex | Use |
|---|---|---|
| `--ink` | `#0B1820` | Night-lake blue-black: dark sections, body text on light |
| `--mist` | `#E9EDEB` | Cool mist white: light sections, text on dark |
| `--granite` | `#7E878C` | Secondary text, contour lines on light |
| `--depth` | `#1E3A46` | Contour lines and panels on dark |
| `--survey` | `#FF5B1F` | Survey-marker orange: route line, active waypoint, primary CTA. Nowhere else. |

**Type** (all free and self-hosted):
- *Display and UI:* **Switzer** (Fontshare). A variable neo-grotesk whose weight axis animates on scroll for the kinetic name.
- *Moments:* **Newsreader Italic** (Google). Used sparingly, for one emphasised phrase per section at most.
- *Data:* **JetBrains Mono** (already the portal board's font). Used only for real data: coordinates, dates, clock, grid refs.

**Texture:** procedural contour lines generated in code (noise + marching squares at build time, so they're crisp and animatable), plus one fixed film-grain overlay. No AI text in images, ever.

## Page as a route (keeps every existing section and link)

| # | Waypoint | Section | Signature moment |
|---|---|---|---|
| 0 | Gate | Preloader (≤1.2 s, skipped on return visits and reduced motion) | The portal's split-flap board flips `LW 2027 · BOARDING` and then *becomes* the hero name |
| 1 | Departure | Hero | **V1** scroll-scrubbed dawn flight over the archipelago. Name, positioning and CTAs visible at frame 0. Contour lines draw over the water. Live UK clock, real coordinates and heading as HUD. |
| — | Route rail | Fixed index | A vertical flight path on the left with the section waypoints. A plane marker travels the path as you scroll (thin top line on mobile). |
| 2 | Bearing | About | Statement paragraph revealed line by line. Real portrait in duotone. Facts that "decode" in (A*, British Champion 2023, DofE Gold). |
| 3 | Atlas | Skills | One map with four islands (AI & ML, Engineering, Quantitative, Professional). Contour rings draw in, and skills sit as place names around each island. |
| — | Descent | Transition | **V2** scroll-scrubbed: the camera drops through a cloud layer onto an island. |
| 4 | Waypoints | Projects | Case-study rows with problem, build, result, stack and links. Hover shows a preview: device mockups with real screenshots composited in. The agent-bridge diagram animates packets along the path. |
| 5 | Flight log | Experience | Entries stamp into a log with mono dates. Construx first. |
| 6 | Charts | Education + Certifications | Certificate rows styled like licence entries, with the real modules. |
| 7 | Logbook | Achievements | Six entries in an asymmetric grid (not three equal cards). |
| 8 | Expedition | Adventures | **V3** full-bleed canoe cinemagraph, with the real photos pinned on an approximate route map of Sweden and Finland. |
| 9 | Arrival | Contact | Contact laid out as a boarding pass (email, phone, LinkedIn, GitHub as pass fields), a link to the portal, and a live clock. |

## Motion system and guardrails ("maximum, but smooth")

**Libraries:** GSAP 3.15 (now free, all plugins): ScrollTrigger, SplitText, ScrambleText, DrawSVG, MotionPath. Lenis for smooth scroll.

**Guardrails:**
- **Load and Core Web Vitals:** the hero poster image is the LCP element. Frames load after first paint, early frames first. Target LCP < 2.5 s, CLS < 0.1, INP < 200 ms, Lighthouse ≥ 90 on mobile.
- **Scrubbed video:** canvas frame sequences only for V1 and V2 (desktop about 144 WebP frames at 1600 px; mobile about 72 at 900 px, or the 9:16 cut). Ambient loops (V3 and the portal) use a plain muted `<video>`.
- **Animation rules:** animate only transform and opacity. Pause anything offscreen. Use blur only on fixed elements. No scroll-jacking: pinned scenes scrub, they never hijack.
- **Lite mode** (`prefers-reduced-motion`, Save-Data, or a weak device) swaps in still images, simple fades, and no Lenis or scramble.

## Portal (portal.lewis-wilson.com), same world

- **Login:** **VP1**, a locked-off blue-hour seaplane dock loop behind the departures board, dark enough that the amber board dominates. Still poster for reduced motion.
- **Dashboard:** a quiet 21:9 dusk-lake header strip, plus artwork for empty and stale states.
- **Constraints:** login JS stays < 80 KB (video is media), and the portal deploys separately.

## Asset plan (priority order; each prompt is given one at a time)

Raw files go in `C:\Personal Website\design-assets\` with the exact filename given.

| Order | File | Tool | What |
|---|---|---|---|
| 1 | `01-hero-start.png` | Nano Banana Pro | Master still: dawn aerial over the archipelago. Also the style anchor for everything else. |
| 2 | `02-hero-end.png` | Nano Banana Pro (same chat, #1 as reference) | Same scene, camera further forward over the channel |
| 3 | `V1-hero-flight.mp4` | Omni (#1 → #2) | Forward glide. Becomes the hero frame sequence. |
| 4 | `03-descent-start.png`, `04-descent-end.png` | Nano Banana Pro | Above the cloud layer, then breaking through onto an island |
| 5 | `V2-descent.mp4` | Omni | The descent transition |
| 6 | `05-canoe.png` | Nano Banana Pro | Aluminium canoe on a glass-calm lake, mist, locked-off |
| 7 | `V3-canoe-loop.mp4` | Omni (first = last frame) | Cinemagraph: only water and mist move |
| 8 | `06-portal-dock.png` → `VP1-portal-dock.mp4` | NB Pro → Omni | Portal login backdrop loop |
| 9 | `07-laptop-mock.png`, `08-phone-mock.png` | NB Pro | Device mockups with flat #00FF00 screens for real screenshots |
| 10 | `09-portal-header.png`, `10-og-site.png`, `11-og-portal.png` | NB Pro | Portal header strip and social preview images |
| 11 | Extras | Omni / NB | 9:16 mobile hero, retakes, hover-preview loops, as video budget allows (3/hour) |

## Process

1. Lewis makes each asset, saves it with the given name, and says "done".
2. Claude inspects it: composition, drift, artefacts, palette match. Then it either accepts it or writes a precise fix prompt.
3. Claude processes it (frames, crops, WebP/AVIF, posters) and places it in the localhost mockup.
4. Once the full concept runs on localhost, Lewis reviews and approves, and only then is it deployed. The site and the portal deploy separately.
