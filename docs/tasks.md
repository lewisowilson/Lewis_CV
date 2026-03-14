# Implementation Tasks: Lewis Wilson CV Website

Generated from [PRD](./prd.md)

## Task 1: Project Scaffolding
- [x] 1.1 Create React + Vite project
- [x] 1.2 Install and configure Tailwind CSS v4 with `@tailwindcss/vite` plugin
- [x] 1.3 Install lucide-react for icons
- [x] 1.4 Add Inter font via Google Fonts in `index.html`
- [x] 1.5 Define custom theme colours (navy, accent, gold) in `index.css`
- [x] 1.6 Remove Vite boilerplate (App.css, logos, default App content)
- [x] 1.7 Update `<title>` to "Lewis Wilson — CV"

## Task 2: Hero / Header Section
- [x] 2.1 Build full-width dark navy header with gradient background
- [x] 2.2 Add name (h1) and subtitle (degree + university)
- [x] 2.3 Add contact details row (phone, email, location, driving licence) with icons
- [x] 2.4 Add GitHub and LinkedIn buttons
- [x] 2.5 Add subtle background glow effects (blurred circles)
- [x] 2.6 Add animated bounce-down arrow
- [x] 2.7 Ensure contact row wraps cleanly on mobile

## Task 3: Reusable Components
- [x] 3.1 Build `Section` component (icon + title + divider line)
- [x] 3.2 Build `TimelineItem` component (dot, border, title/subtitle/date, content slot)
- [x] 3.3 Build `SkillBadge` component (accent pill)
- [x] 3.4 Build `AchievementCard` component (icon + title + description card)

## Task 4: Profile Section
- [x] 4.1 Add white rounded card with personal statement text
- [x] 4.2 Style with appropriate spacing and text colour

## Task 5: Technical Skills Section
- [x] 5.1 Add Section header with Code icon
- [x] 5.2 Build 2-column grid with 4 skill categories
- [x] 5.3 Populate each category with SkillBadge components
- [x] 5.4 Ensure single-column layout on mobile

## Task 6: Projects Section
- [x] 6.1 Add Section header with Code icon
- [x] 6.2 Add Flatmate app as a TimelineItem with bullet points
- [ ] 6.3 Review: consider adding a link to the live app or GitHub repo if available

## Task 7: Experience Section
- [x] 7.1 Add Section header with Briefcase icon
- [x] 7.2 Add all 5 experience entries as TimelineItems
- [x] 7.3 Include company name, date range, and bullet points for each

## Task 8: Education Section
- [x] 8.1 Add Section header with GraduationCap icon
- [x] 8.2 Add degree entry with module details
- [x] 8.3 Add A-levels with coloured grade badges (green)
- [x] 8.4 Add ILA research project description
- [x] 8.5 Add GCSEs summary

## Task 9: Achievements & Interests Section
- [x] 9.1 Add Section header with Trophy icon
- [x] 9.2 Build 2-column card grid
- [x] 9.3 Add all 5 achievement cards with descriptions

## Task 10: Footer
- [x] 10.1 Add dark navy footer with references note
- [x] 10.2 Add GitHub/LinkedIn population note

## Task 11: Responsive & Polish
- [ ] 11.1 Test on mobile viewport (375px) — check all wrapping and spacing
- [ ] 11.2 Test on tablet viewport (768px)
- [ ] 11.3 Test on desktop (1440px)
- [ ] 11.4 Run Lighthouse audit — target performance > 90
- [ ] 11.5 Cross-browser check (Chrome, Safari, Firefox)

## Task 12: Deployment Prep
- [ ] 12.1 Run `npm run build` and verify `dist/` output
- [ ] 12.2 Decide on hosting (GitHub Pages / Amplify / Vercel)
- [ ] 12.3 Deploy and verify live URL

## Task 13: Future Enhancements (Out of Scope for v1)
- [ ] 13.1 Dark mode toggle
- [ ] 13.2 Scroll animations (fade-in on scroll)
- [ ] 13.3 PDF download button
- [ ] 13.4 Add more projects as they're completed
