// The CV, as a flight plan: one stop (island) per chapter, in chronological order.
// Each stop's card is plain information; `cv` lines are added to the live CV as the plane passes,
// and `skills` are the skills that chapter added. Wording is taken from the existing CV content.
import { SOCIAL_LINKS } from '../../site.config.js'

export const PROFILE = {
  name: 'Lewis Wilson',
  line: "Second-year Maths with Economics at Exeter. I build AI products, and I'm looking for a 2027-28 placement in finance, fintech or AI.",
  contact: [
    { label: 'lewis.oliver.wilson@gmail.com', href: 'mailto:lewis.oliver.wilson@gmail.com' },
    { label: '07546 599 969', href: 'tel:07546599969' },
    { label: 'LinkedIn', href: SOCIAL_LINKS.LINKEDIN },
    { label: 'GitHub', href: SOCIAL_LINKS.GITHUB },
    { label: 'Farnham, Surrey · Full UK driving licence' },
  ],
}

// CV sections in print order.
export const SECTIONS = [
  ['experience', 'Experience'],
  ['projects', 'Projects'],
  ['education', 'Education'],
  ['certifications', 'Certifications'],
  ['skills', 'Skills'],
  ['beyond', 'Beyond'],
]

export const STOPS = [
  {
    id: 'departure',
    label: 'Departure',
    when: 'Departure',
    title: 'Lewis Wilson',
    org: 'Maths with Economics · Exeter',
    body: [
      'I see a problem, then I build the thing that fixes it. Not as a computer science student, as someone who would rather ship than wait.',
      "I've independently designed, built and deployed full-stack applications, and co-founded an agency where I ran the software side. I work in a user-centred build-test cycle: gather insight, design, build, put it in front of real users, refine.",
    ],
    portrait: true,
    cv: [],
  },
  {
    id: 'weydon',
    label: 'Weydon',
    when: '2020 - 2023',
    title: 'Weydon School',
    org: 'GCSEs · Business Studies Student Leader',
    body: [
      '11 GCSEs, average grade 7.',
      'Ran an after-school Business and Economics club for younger students. When sessions lost engagement, I redesigned them on the spot, and participation improved.',
    ],
    cv: [
      { section: 'education', title: 'GCSEs, Weydon School', when: '2020 - 2023', text: '11 GCSEs, average grade 7' },
      { section: 'experience', title: 'Business Studies Student Leader, Weydon School', when: '2022 - 2023', text: 'Ran an after-school Business and Economics club for younger students.' },
    ],
  },
  {
    id: 'space01',
    label: 'Space01',
    when: 'Summer 2022',
    title: 'Digital Product Design, work placement',
    org: 'Space01',
    body: [
      'Built a digital product from scratch in a week: survey design, data collection and front-end development. My first real exposure to building with technology, and the start of the self-teaching that led to Construx.',
    ],
    cv: [{ section: 'experience', title: 'Digital Product Design (placement), Space01', when: 'Summer 2022', text: 'Built a digital product in a week: survey design, data collection, front end.' }],
  },
  {
    id: 'taekwondo',
    label: 'Taekwondo',
    when: '2023 - 2025',
    title: 'Junior Instructor & Coach',
    org: 'Taekwondo Club · U18 British Champion 2023',
    body: [
      'Led warm-ups, sparring and self-defence for classes of around 30, and coached athletes one-to-one at national tournaments. Students I coached went on to win national medals.',
      'U18 sparring British Champion 2023. English Silver Medallist 2022 and 2024; National Bronze 2023. Eight years training at national level.',
    ],
    cv: [
      { section: 'experience', title: 'Junior Instructor & Coach, Taekwondo', when: '2023 - 2025', text: 'Led classes of around 30; coached athletes at national tournaments.' },
      { section: 'beyond', text: 'Taekwondo U18 sparring British Champion 2023' },
    ],
    skills: ['Coaching and mentoring', 'Working under pressure'],
  },
  {
    id: 'alevels',
    label: 'A-Levels',
    when: '2023 - 2025',
    title: 'A-Levels',
    org: 'Royal Grammar School',
    body: [
      'Economics A* · Mathematics A · Physics A.',
      "Extended research project on game theory (the Prisoner's Dilemma) and the cryptographic security of blockchain.",
    ],
    cv: [{ section: 'education', title: 'A-Levels, Royal Grammar School', when: '2023 - 2025', text: 'Economics A* · Mathematics A · Physics A' }],
  },
  {
    id: 'expeditions',
    label: 'Expeditions',
    when: 'Beyond the desk',
    title: 'Expeditions',
    org: 'Duke of Edinburgh Gold · Scotland, coast to coast',
    body: [
      'Duke of Edinburgh Gold: all four sections, including a 4-day Brecon Beacons expedition.',
      'At 15, planned and led an unsupported crossing of Scotland on foot with two friends. Wilderness canoe trips through remote Sweden and Finland, and a programme at King\'s College London working with NASA engineers and astronauts.',
    ],
    cv: [
      { section: 'beyond', text: 'Duke of Edinburgh Gold' },
      { section: 'beyond', text: 'Led an unsupported crossing of Scotland on foot at 15' },
      { section: 'beyond', text: 'Canoe expeditions in Sweden and Finland' },
    ],
  },
  {
    id: 'reassure',
    label: 'Reassure',
    when: 'Summer 2024',
    title: 'Trainee Actuary, work placement',
    org: 'Reassure Insurance',
    body: [
      "A week inside a professional actuarial team at one of the UK's largest insurers. Worked directly with the company's insurance pricing calculator, examining the code and data tables behind its risk models and customer quotes.",
      'Built spreadsheets and customer query frameworks, and saw first-hand how data and AI tools are reshaping insurance.',
    ],
    cv: [{ section: 'experience', title: 'Trainee Actuary (placement), Reassure Insurance', when: 'Summer 2024', text: 'Worked with the pricing calculator\'s code and data tables behind risk models and quotes; built spreadsheets and query frameworks.' }],
    skills: ['Actuarial pricing tools', 'Spreadsheet modelling'],
  },
  {
    id: 'mdf',
    label: 'MDF Tuition',
    when: 'March 2025 - present',
    title: 'Tutor, A-Level Economics & Maths',
    org: 'MDF Tuition',
    body: ['Handpicked by a professional tutoring company to teach paying clients and their families. Client-facing: adapting explanations fast, building trust with students and parents, and delivering results.'],
    cv: [{ section: 'experience', title: 'Tutor, A-Level Economics & Maths, MDF Tuition', when: 'Mar 2025 - present', text: 'Client-facing teaching for paying families.' }],
    skills: ['Client-facing communication'],
  },
  {
    id: 'exeter',
    label: 'Exeter',
    when: '2025 - 2029',
    title: 'BSc Mathematics with Economics',
    org: 'University of Exeter',
    body: [
      'Year 2: Mathematics and Machine Learning & AI; Linear Algebra; Real Analysis; Differential Equations; Vector Calculus; Groups, Rings & Fields; Microeconomics.',
      'Includes a built-in placement year, 2027-28.',
    ],
    cv: [{ section: 'education', title: 'BSc Mathematics with Economics, University of Exeter', when: '2025 - 2029', text: 'Includes a placement year, 2027-28.' }],
    skills: ['Statistics', 'Linear algebra', 'Data analysis', 'Econometric methods (developing)', 'Python (developing)'],
  },
  {
    id: 'tutortime',
    label: 'TutorTime',
    when: '2025 - present',
    title: 'TutorTime',
    org: 'Solo build · React, Supabase',
    body: ['A web app for university student tutors to manage their GCSE and A-Level students: session scheduling, posting resources, and a Q&A area for student queries. Built to fix the workflow gaps I hit first-hand tutoring at MDF Tuition.'],
    cv: [{ section: 'projects', title: 'TutorTime', text: 'Scheduling, resources and Q&A for student tutors. React, Supabase.' }],
    skills: ['React', 'Supabase'],
  },
  {
    id: 'construx',
    label: 'Construx',
    when: 'Jan 2026 - Sept 2026',
    title: 'Co-founder & Web Director',
    org: 'The Construx Group',
    body: [
      'Co-founded a web design and media agency serving local businesses, including JD Films, pubs, photography companies and private medical practices. Built the software side: an accessible booking and reservations system and a telephone system, on AWS.',
      'Built a workflow where Claude Code and Codex pass context to each other: one writes the change, the other reviews and challenges it. It cut the time we spent debugging. Left in September 2026 to focus on my degree.',
    ],
    cv: [
      { section: 'experience', title: 'Co-founder & Web Director, The Construx Group', when: 'Jan - Sept 2026', text: 'Web and media agency for local businesses. Built the software side on AWS: an accessible booking system and a telephone system, plus a Claude ↔ Codex agent workflow that cut debugging time.' },
      { section: 'projects', title: 'Construx Booking & Reservations', text: 'Table bookings with no double-bookings for UK pubs. Next.js, AWS Amplify, DynamoDB.' },
      { section: 'projects', title: 'Claude ↔ Codex agent bridge', text: "Two AI coding agents that review each other's work before merge." },
    ],
    skills: ['JavaScript / TypeScript', 'Next.js', 'AWS Amplify (Cognito, AppSync, DynamoDB)', 'Git & GitHub', 'Claude Code', 'Multi-agent workflows (Claude ↔ Codex)', 'LLM application development (Claude API)', 'Prompt engineering', 'Selling to small businesses'],
  },
  {
    id: 'whitepaper',
    label: 'Whitepaper',
    when: 'Research',
    title: '"Hybrid by Design"',
    org: 'Whitepaper for Space01',
    body: ['A 20-page whitepaper on AI and wealth management, built on 49 primary sources. Space01 sent it to its clients.'],
    links: [{ label: 'Available on request', href: 'mailto:lewis.oliver.wilson@gmail.com?subject=Hybrid%20by%20Design%20whitepaper' }],
    cv: [{ section: 'projects', title: '"Hybrid by Design" whitepaper', text: '20 pages on AI and wealth management, 49 primary sources, sent by Space01 to its clients.' }],
  },
  {
    id: 'certs',
    label: 'Certifications',
    when: '2026',
    title: 'Certifications',
    org: 'Hugging Face · Harvard · Kaggle',
    body: ['AI Agents Course (Hugging Face, Sept 2026) · CS50: Databases with SQL (Harvard) · PyTorch Fundamentals · Intro to Deep Learning (Kaggle).'],
    cv: [{ section: 'certifications', text: 'AI Agents Course (Hugging Face) · CS50: Databases with SQL (Harvard) · PyTorch Fundamentals · Intro to Deep Learning (Kaggle)' }],
    skills: ['AI agents (Hugging Face)', 'PyTorch fundamentals', 'Neural networks (Kaggle Deep Learning)', 'SQL (Harvard CS50)', 'Self-directed learning'],
  },
  {
    id: 'now',
    label: 'Next',
    when: '2027 - 28',
    title: 'Next: a placement year',
    org: 'Finance · Fintech · AI',
    body: ["That's the flight so far. The next leg is a 2027-28 placement, and your copy of my CV is complete."],
    links: [{ label: 'Side builds: Flatmate', href: SOCIAL_LINKS.GITHUB + '/flatmate-app' }],
    final: true,
    cv: [],
  },
]
