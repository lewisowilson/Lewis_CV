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
        x: 69,
        y: 25,
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
        x: 87,
        y: 48,
      },
      { ...fromStop('tutortime'), short: 'TutorTime', x: 68, y: 72 },
      { ...fromStop('whitepaper'), short: 'Whitepaper', x: 48, y: 53 },
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
