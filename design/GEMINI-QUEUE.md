# Gemini queue (next usage window)

## Status (2026-10-07, 12:55 PM)
- LIVE: night (V4), dusk (V5), fog (V6) flights; four ticket postcards; archipelago DEM driving the world; OG card.
- DONE: VP1 portal dock cinemagraph (portal repo, web/public/dock-loop-*.mp4, seamless crossfade loop). Soundtrack via Create music hit the limit; retry after 5:33 PM. Gemini Plus has a separate VIDEO cap (looks like ~3 per rolling 24h: V4 ~17:00, V5 ~22:20 on 10-06, V6 ~12:45 on 10-07); over the cap it says "I can create more videos as soon as your limit resets" or silently drops the request.
- WHAT WORKS NOW (videos): a normal chat at gemini.google.com/app, + menu -> Create video, ONE attached image (first frame only), send with the Enter key. First+last-frame requests and the /videos page were being dropped or hanging since 2026-10-06 evening.
- Optional next: Create music (Gemini can make music now) for a soundtrack; 10 phone mock.

All stills go in the **LW site stills** chat (so earlier images act as style references), then are saved to `design-assets/` with the exact name. Videos go through **gemini.google.com/videos** with the two stills pasted as first/last frames. Every prompt ends with the same "STRICTLY DO NOT INCLUDE" discipline as the originals.

## Priority 1: live-sky flight variants (stills, then videos)
Each pair is an EDIT of `01-hero-start` / `02-hero-end`, so the islands, camera and composition stay identical and only the sky/light changes. That keeps the frame-sequence scrub and the overlaid name aligned.

| # | File | Prompt essence (full text built from the 01/02 prompts) |
|---|---|---|
| 1 | `11-night-start.jpg` | "Recreate the FIRST archipelago photograph above EXACTLY (same islands, same camera, same composition), but at deep night under a strong green aurora borealis: green curtains with faint violet tops across the upper sky, reflected softly in the mirror-calm water; stars; islands as dark silhouettes with only a faint aurora rim light on the granite; no moon; no city lights." |
| 2 | `12-night-end.jpg` | Same edit applied to the SECOND photograph (camera moved forward). |
| 3 | `V4-night-flight.mp4` | Omni: first = 11, last = 12, same motion wording as V1, plus "aurora curtains ripple slowly; stars static". |
| 4 | `13-dusk-start.jpg` / `14-dusk-end.jpg` | Same scene at golden hour just after sunset: sun just below the horizon on the LEFT, deep orange-to-rose sky, warm light on the granite, long reflections. |
| 5 | `V5-dusk-flight.mp4` | Omni from 13 → 14. |
| 6 | `15-fog-start.jpg` / `16-fog-end.jpg` | Same scene in thick sea fog: islands half-dissolved in soft white-grey fog, flat pearly light, water barely visible, very calm and quiet. |
| 7 | `V6-fog-flight.mp4` | Omni from 15 → 16. |

## Priority 2: the continuous world
| # | File | Prompt essence |
|---|---|---|
| 8 | `17-archipelago-dem.jpg` | Square 1:1 grayscale digital elevation model of a large Nordic archipelago seen from directly above: ~40 islands of varied size, long fjord-like channels, pure black sea, soft smooth grey land rising to white on the highest rocky domes, no text, no grid, no shading. (Replaces the procedural world terrain.) |
| 9 | `18-archipelago-albedo.jpg` | The same archipelago as a top-down aerial photograph at dawn (pink granite, pine forest, dark water), aligned exactly to 17, for optional colour sampling. |

## Priority 3: tactile materials
| # | File | Prompt essence |
|---|---|---|
| 10 | `19-paper.jpg` | Seamless tileable texture of premium off-white boarding-pass card stock (#EDF0EE), very fine fibre, flat even lighting, no text, no folds. |
| 11 | `20-foil.jpg` | Seamless holographic security-foil texture: fine diffraction pattern of thin diagonal lines and tiny repeating guilloché waves, iridescent silver with faint orange and teal shifts, no logos, no text. |

## Priority 4: remaining
| # | File | Prompt essence |
|---|---|---|
| 12 | `VP1-portal-dock.mp4` | Omni cinemagraph from `06-portal-dock` (prompt already written; first = last frame). |
| 13 | `10-phone-mock.jpg` | Phone on the canoe seat, flat #00FF00 screen (prompt already written). Composite Flatmate. |
| 14 | `21-og-site.jpg` | 1.91:1 social preview: the dawn archipelago with deep calm water in the lower left for the name, no text. |
| 15 | `V7-hero-vertical.mp4` | 9:16 vertical version of the dawn flight for phones (first/last frames cropped from 01/02, upscaled). |

## Priority 5: ticket postcard backs (approved 2026-10-06)
One consistent series in the LW site stills chat, 3:2 landscape, same style for all four: a vintage-modern travel postcard illustration, flat muted colour (ink #0B1820, mist #E9EDEB, depth #1E3A46, one accent of survey orange #FF5B1F), fine contour lines in the sky, no text, no logos, no people's faces.
| # | File | Subject |
|---|---|---|
| 16 | `22-postcard-booking.jpg` | A warm English country pub at blue hour, tables visible through lit windows. |
| 17 | `23-postcard-agents.jpg` | Two lighthouses on facing headlands sweeping beams across each other over a calm strait. |
| 18 | `24-postcard-whitepaper.jpg` | A quiet harbour city financial district at dawn seen across still water. |
| 19 | `25-postcard-tutortime.jpg` | A university library reading room with long tables and green lamps, early evening. |

Build: tickets flip (click the back corner) to show the postcard, with the WP number stamped in the corner.
