# Product Requirements Document: Lewis Wilson CV Website

## Overview
A single-page, long-scrolling personal CV/resume website for Lewis Wilson — a first-year Mathematics with Economics student at the University of Exeter. The site should present Lewis's profile, technical skills, projects, work experience, education, and achievements in a visually polished, modern format that reflects his interest in technology and AI.

## Target Audience
- Recruiters and hiring managers (summer internships, year-in-industry placements)
- Potential employers in finance, insurance, and AI/tech sectors
- University contacts and professional network

## Goals
1. Present Lewis's CV content in a professional, visually engaging web format
2. Demonstrate technical capability (the site itself is a portfolio piece)
3. Make a strong first impression — clean, modern design that stands out from PDF CVs
4. Fully responsive — must look great on mobile, tablet, and desktop
5. Fast loading and deployable to a static hosting service (e.g. GitHub Pages, Amplify, Vercel)

## Tech Stack
- **Framework:** React (via Vite)
- **Styling:** Tailwind CSS v4
- **Icons:** Lucide React
- **Font:** Inter (Google Fonts)
- **Deployment:** Static build (`npm run build` → `dist/`)

## Design Requirements

### Visual Style
- Professional and clean, not flashy or gimmicky
- Dark navy (#1a2332) hero/header section with white text
- Light grey-to-white gradient body background
- Blue accent colour (#3b82f6) for highlights, icons, skill badges
- Green badges for A-level grades
- Gold/amber accent for achievement icons
- Consistent spacing and typography using Tailwind utility classes

### Layout (Single Page, Top to Bottom)
1. **Hero Section** — Full-width dark navy header with name, subtitle (degree + university), contact details (phone, email, location, driving licence), and GitHub/LinkedIn buttons. Subtle background glow effects. Animated bounce arrow hinting to scroll down.
2. **Profile** — White card with rounded corners containing the personal statement.
3. **Technical Skills** — 2-column grid of skill categories (Languages & Tools, Cloud & Databases, AI/ML, Finance Tools), each with pill-style badges.
4. **Projects** — Timeline-style layout. Currently one project (Flatmate app) with bullet points.
5. **Experience** — Timeline-style layout with 5 roles, each showing title, company, date range, and bullet points.
6. **Education** — Timeline-style layout. Degree, A-levels (with grade badges), GCSEs.
7. **Achievements & Interests** — 2-column grid of cards with icon, title, and description.
8. **Footer** — Dark navy bar with "References available on request" note.

### Reusable Components
- `Section` — Section header with icon, title, and horizontal divider line
- `TimelineItem` — Left-bordered item with dot, title/subtitle/date, and content area
- `SkillBadge` — Rounded pill with accent background
- `AchievementCard` — Bordered card with icon and text

### Responsiveness
- Hero contact details: wrap on mobile, inline on desktop
- Skills grid: single column on mobile, 2 columns on sm+
- Achievements grid: single column on mobile, 2 columns on sm+
- Timeline items: date stacks above title on mobile, sits inline on sm+
- Max content width: 4xl (896px) centred

## Content Source
All CV content is sourced from `CV (summer internship and year in placement specific).docx` in the parent directory. Content should be faithful to the original but may be lightly edited for web readability (e.g. removing redundant phrasing).

## Out of Scope (for now)
- Dark mode toggle
- Animations beyond the scroll-down bounce arrow
- PDF download button
- Blog or additional pages
- Contact form
- CMS or dynamic content
- Analytics

## Success Criteria
- Page loads in under 2 seconds on a standard connection
- Lighthouse performance score > 90
- Looks professional and polished on Chrome, Safari, Firefox
- Fully readable on iPhone SE (smallest common screen) through to 27" desktop
- All CV content accurately represented
