// The island map: three groups of islands, one island per item. Wording comes from the CV.
// x/y are the island's position (in %) on that group's aerial image; overview x/y place the group
// on the overview image. Positions are set by eye against the generated images.
import { STOPS } from './cv-data.js'

const stop = (id) => STOPS.find((s) => s.id === id)
const fromStop = (id, extra = {}) => {
  const s = stop(id)
  return { id, title: s.title, org: s.org, when: s.when, body: s.body, links: s.links, ...extra }
}

export const GROUPS = [
  {
    id: 'experience',
    title: 'Experience',
    blurb: 'Where I have worked, coached and taught.',
    image: '/media/islands/experience',
    overview: { x: 22, y: 58 },
    items: [
      { ...fromStop('construx'), short: 'Construx', x: 54, y: 24 },
      { ...fromStop('reassure'), short: 'Reassure', x: 78, y: 31 },
      { ...fromStop('mdf'), short: 'MDF Tuition', x: 54, y: 57 },
      { ...fromStop('space01'), short: 'Space01', x: 78, y: 68 },
      { ...fromStop('taekwondo'), short: 'Taekwondo', x: 60, y: 84 },
      {
        id: 'student-leader',
        short: 'Student leader',
        title: 'Business Studies Student Leader',
        org: 'Weydon School',
        when: '2022 - 2023',
        body: ['Ran an after-school Business and Economics club for younger students. When sessions lost engagement, I redesigned them on the spot, and participation improved.'],
        x: 89,
        y: 58,
      },
    ],
  },
  {
    id: 'projects',
    title: 'Projects',
    blurb: 'Things I have built, and what happened.',
    image: '/media/islands/projects',
    overview: { x: 52, y: 29 },
    items: [
      {
        id: 'booking',
        short: 'Booking system',
        title: 'Construx Booking & Reservations',
        org: 'Co-founder, The Construx Group · 2026',
        when: '2026',
        body: [
          "An accessible table-booking system built in-house at Construx for the UK pubs we worked with. Customers book through a form embedded in the venue's own site; the system enforces capacity limits and checks every new booking against existing ones to prevent double-booking.",
          'Staff manage bookings from a dashboard with a floor map, a menu editor and email notifications. Next.js, React, Tailwind, AWS Amplify, DynamoDB.',
        ],
        x: 60,
        y: 20,
      },
      {
        id: 'agents',
        short: 'Agent bridge',
        title: 'Claude ↔ Codex agent bridge',
        org: 'Construx · 2026',
        when: '2026',
        body: [
          "A workflow where Claude Code and OpenAI's Codex pass context to each other: one writes the change, the other reviews and challenges it, and the notes go back before anything is merged.",
          'The two agents cross-checking each other gave more consistent output and cut the time we spent debugging.',
        ],
        x: 80,
        y: 26,
      },
      {
        id: 'scouting',
        short: 'Scouting model',
        title: 'Football Scouting Model',
        org: 'Data-driven player recruitment',
        when: '2026 - present',
        body: [
          "A data model that scores and ranks football players for recruitment from match and performance data, on a SQL database I designed. It produces ranked shortlists against positional and budget constraints.",
          "It came from watching Brentford's data-led recruitment turn a small-budget club into an established Premier League side. Ratings are per 90 minutes with a minimum-minutes threshold, so low-minute players don't distort the rankings. Now I'm working through what a club analytics team asks: which metrics matter for each position, how to weight them, and how to compare players across leagues.",
        ],
        x: 50,
        y: 73,
      },
      { ...fromStop('tutortime'), short: 'TutorTime', x: 62, y: 48 },
      {
        id: 'nhs',
        short: 'NHS concept',
        title: 'NHS Innovation Submission',
        org: 'Independent · adaptive microneedle patch',
        when: '2026',
        body: [
          'A medical device concept: an adaptive microneedle patch for drug delivery with built-in safety monitoring, prompted by people I know giving up on immunotherapy.',
          'With no clinical background, I spent a few weeks reading primary literature in optics, microfluidics and drug delivery, then submitted it to Health Innovation Kent Surrey Sussex, the NHS innovation network for the region. Nobody asked me to.',
        ],
        x: 67,
        y: 77,
      },
      {
        id: 'flatmate',
        short: 'Flatmate',
        title: 'Flatmate: shared household expense app',
        org: 'My first full-stack build',
        when: 'Earlier build',
        body: ['A full-stack prototype for tracking shared household costs and splitting bills between flatmates: AI receipt scanning through the Claude API, a real-time shopping list, user accounts and a split-payment ledger, on Supabase and AWS Amplify.'],
        links: [{ label: 'GitHub', href: 'https://github.com/lewisowilson/flatmate-app' }],
        x: 84,
        y: 79,
      },
      { ...fromStop('whitepaper'), short: 'Whitepaper', x: 86, y: 52 },
    ],
  },
  {
    id: 'grades',
    title: 'Grades',
    blurb: 'Education and certifications.',
    image: '/media/islands/grades',
    overview: { x: 80, y: 55 },
    items: [
      { ...fromStop('exeter'), short: 'Exeter', x: 61, y: 29 },
      { ...fromStop('alevels'), short: 'A-Levels', x: 87, y: 41 },
      { id: 'gcse', short: 'GCSEs', title: 'GCSEs', org: 'Weydon School', when: '2020 - 2023', body: ['11 GCSEs, average grade 7.'], x: 52, y: 62 },
      { ...fromStop('certs'), short: 'Certifications', x: 73, y: 74 },
    ],
  },
]
