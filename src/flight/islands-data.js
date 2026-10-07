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
    overview: { x: 24, y: 58 },
    items: [
      { ...fromStop('construx'), short: 'Construx', x: 30, y: 38 },
      { ...fromStop('reassure'), short: 'Reassure', x: 58, y: 30 },
      { ...fromStop('mdf'), short: 'MDF Tuition', x: 74, y: 55 },
      { ...fromStop('space01'), short: 'Space01', x: 46, y: 64 },
      { ...fromStop('taekwondo'), short: 'Taekwondo', x: 22, y: 70 },
      {
        id: 'student-leader',
        short: 'Student leader',
        title: 'Business Studies Student Leader',
        org: 'Weydon School',
        when: '2022 - 2023',
        body: ['Ran an after-school Business and Economics club for younger students. When sessions lost engagement, I redesigned them on the spot, and participation improved.'],
        x: 64,
        y: 78,
      },
    ],
  },
  {
    id: 'projects',
    title: 'Projects',
    blurb: 'Things I have built, and what happened.',
    image: '/media/islands/projects',
    overview: { x: 52, y: 32 },
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
        x: 34,
        y: 40,
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
        x: 66,
        y: 36,
      },
      { ...fromStop('tutortime'), short: 'TutorTime', x: 40, y: 70 },
      { ...fromStop('whitepaper'), short: 'Whitepaper', x: 70, y: 68 },
    ],
  },
  {
    id: 'grades',
    title: 'Grades',
    blurb: 'Education and certifications.',
    image: '/media/islands/grades',
    overview: { x: 76, y: 62 },
    items: [
      { ...fromStop('exeter'), short: 'Exeter', x: 38, y: 34 },
      { ...fromStop('alevels'), short: 'A-Levels', x: 66, y: 42 },
      { id: 'gcse', short: 'GCSEs', title: 'GCSEs', org: 'Weydon School', when: '2020 - 2023', body: ['11 GCSEs, average grade 7.'], x: 30, y: 70 },
      { ...fromStop('certs'), short: 'Certifications', x: 64, y: 72 },
    ],
  },
]
