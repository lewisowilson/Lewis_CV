# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal CV/resume website for Lewis Wilson — a single-page, long-scrolling React site styled with Tailwind CSS.

## Commands

- `npm run dev` — Start Vite dev server (http://localhost:5173)
- `npm run build` — Production build to `dist/`
- `npm run preview` — Preview production build locally

## Tech Stack

- React 19 + Vite 7
- Tailwind CSS v4 (configured via `@tailwindcss/vite` plugin, NOT a `tailwind.config.js` file)
- Lucide React for icons
- Inter font (Google Fonts, loaded in `index.html`)

## Architecture

Single-component app — all code lives in `src/App.jsx`. No routing, no state management, no API calls. Content is static.

### Custom theme (defined in `src/index.css` via `@theme`)
- `navy` / `navy-light` — dark header/footer backgrounds
- `accent` / `accent-light` — blue highlights
- `gold` — achievement icons

### Reusable components (defined in `src/App.jsx`)
- `Section` — section header with icon + title + divider
- `TimelineItem` — timeline entry with dot, title/subtitle/date
- `SkillBadge` — coloured pill for skills
- `AchievementCard` — bordered card with icon

## Lint

- `npm run lint` — Run ESLint (flat config in `eslint.config.js`)
- Custom rule: unused vars starting with uppercase or `_` are allowed (`varsIgnorePattern: '^[A-Z_]'`)

## Content Source

CV content sourced from the `.docx` files in `../` (the parent `CV/` directory).
