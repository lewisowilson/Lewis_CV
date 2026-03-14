import { Mail, Phone, MapPin, Car, Github, Linkedin, GraduationCap, Briefcase, Code, Trophy, Award, ChevronDown } from 'lucide-react'
import './index.css'

function Section({ title, icon: Icon, children }) {
  return (
    <section className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-accent/10 rounded-lg">
          <Icon className="w-5 h-5 text-accent" />
        </div>
        <h2 className="text-2xl font-bold text-navy">{title}</h2>
        <div className="flex-1 h-px bg-gray-200 ml-2" />
      </div>
      {children}
    </section>
  )
}

function TimelineItem({ title, subtitle, date, children }) {
  return (
    <div className="relative pl-8 pb-8 border-l-2 border-gray-200 last:border-l-0 last:pb-0">
      <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-accent border-2 border-white shadow-sm" />
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 mb-2">
        <div>
          <h3 className="font-semibold text-lg text-navy">{title}</h3>
          {subtitle && <p className="text-accent font-medium text-sm">{subtitle}</p>}
        </div>
        <span className="text-sm text-gray-500 font-medium whitespace-nowrap">{date}</span>
      </div>
      <div className="text-gray-600 space-y-1.5">{children}</div>
    </div>
  )
}

function SkillBadge({ children }) {
  return (
    <span className="inline-block px-3 py-1 bg-accent/10 text-accent font-medium text-sm rounded-full">
      {children}
    </span>
  )
}

function AchievementCard({ icon: Icon, title, description }) {
  return (
    <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-gold/10 rounded-lg shrink-0">
          <Icon className="w-4 h-4 text-gold" />
        </div>
        <div>
          <h4 className="font-semibold text-navy text-sm">{title}</h4>
          <p className="text-gray-600 text-sm mt-1">{description}</p>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <header className="relative bg-navy text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy-light to-navy opacity-90" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-accent/5 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-6 pt-20 pb-16">
          <div className="text-center">
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-4">
              Lewis Wilson
            </h1>
            <p className="text-xl text-accent-light font-medium mb-8">
              Mathematics with Economics &middot; University of Exeter
            </p>

            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-300">
              <a href="tel:07546599969" className="flex items-center gap-1.5 hover:text-white transition-colors">
                <Phone className="w-4 h-4" /> 07546 599 969
              </a>
              <a href="mailto:lewis.oliver.wilson@gmail.com" className="flex items-center gap-1.5 hover:text-white transition-colors">
                <Mail className="w-4 h-4" /> lewis.oliver.wilson@gmail.com
              </a>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" /> Farnham, Surrey
              </span>
              <span className="flex items-center gap-1.5">
                <Car className="w-4 h-4" /> Full UK Driving Licence
              </span>
            </div>

            <div className="flex justify-center gap-4 mt-6">
              <a href="https://github.com/lewiswilson" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm">
                <Github className="w-4 h-4" /> GitHub
              </a>
              <a href="https://linkedin.com/in/lewiswilson" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm">
                <Linkedin className="w-4 h-4" /> LinkedIn
              </a>
            </div>
          </div>

          <div className="flex justify-center mt-12 animate-bounce">
            <ChevronDown className="w-6 h-6 text-gray-400" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">

        {/* Profile */}
        <section className="mb-16">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-navy mb-3">Profile</h2>
            <p className="text-gray-600 leading-relaxed">
              First-year Maths with Economics student at Exeter, with hands-on experience building and deploying
              AI-powered applications. Already built and shipped a working app prototype using Claude Code, Supabase
              and Amazon Amplify. Actively developing technical skills through self-directed learning, university AI
              workshops, and certifications. Focused on understanding how AI is reshaping financial services — across
              investment banking and insurance — and building the foundation for a career advising firms on AI
              adoption strategy. Brings strong passion, real industry exposure through a trainee actuary placement at
              Reassure Insurance, and a consistent track record of performing under pressure across competitive sport,
              leadership and academic environments.
            </p>
          </div>
        </section>

        {/* Technical Skills */}
        <Section title="Technical Skills" icon={Code}>
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Languages & Tools</h4>
              <div className="flex flex-wrap gap-2">
                <SkillBadge>Python</SkillBadge>
                <SkillBadge>JavaScript</SkillBadge>
                <SkillBadge>Claude API</SkillBadge>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Cloud & Databases</h4>
              <div className="flex flex-wrap gap-2">
                <SkillBadge>Supabase</SkillBadge>
                <SkillBadge>Amazon Amplify</SkillBadge>
                <SkillBadge>GitHub</SkillBadge>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">AI / ML</h4>
              <div className="flex flex-wrap gap-2">
                <SkillBadge>LLM Application Development</SkillBadge>
                <SkillBadge>Prompt Engineering</SkillBadge>
                <SkillBadge>ML Fundamentals</SkillBadge>
                <SkillBadge>AI Ethics</SkillBadge>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Finance Tools</h4>
              <div className="flex flex-wrap gap-2">
                <SkillBadge>Spreadsheet Modelling</SkillBadge>
                <SkillBadge>Actuarial Calculators</SkillBadge>
                <SkillBadge>Data Analysis</SkillBadge>
              </div>
            </div>
          </div>
        </Section>

        {/* Projects */}
        <Section title="Projects" icon={Code}>
          <TimelineItem
            title="Flatmate — Shared Household Expense App"
            date="2025 – Present"
          >
            <ul className="list-disc list-outside ml-4 space-y-1.5 text-sm">
              <li>Built a working prototype to solve a real problem: tracking shared household costs and splitting bills automatically between flatmates</li>
              <li>Integrated receipt scanning using AI-powered OCR via the Claude API, allowing users to photograph receipts and have costs logged and allocated automatically</li>
              <li>Implemented a shared real-time shopping list, user authentication, and a split-payment ledger using Supabase and Amazon Amplify</li>
              <li>Deployed and tested the app online using Amazon Amplify; continuing to add features and improve the user experience</li>
              <li>Required learning full-stack development from scratch: database design, cloud deployment, and API integration</li>
            </ul>
          </TimelineItem>
        </Section>

        {/* Experience */}
        <Section title="Experience" icon={Briefcase}>
          <TimelineItem
            title="Professional Tutor — Economics & Maths (A-Level)"
            subtitle="MDF Tuition"
            date="March 2025 – Present"
          >
            <ul className="list-disc list-outside ml-4 space-y-1.5 text-sm">
              <li>Handpicked by a professional tutoring company to teach A-level Economics and Maths</li>
              <li>Client-facing role requiring the ability to adapt explanations quickly and build trust with students and parents</li>
            </ul>
          </TimelineItem>

          <TimelineItem
            title="Trainee Actuary — Work Placement"
            subtitle="Reassure Insurance"
            date="Summer 2024"
          >
            <ul className="list-disc list-outside ml-4 space-y-1.5 text-sm">
              <li>Spent a week embedded within a professional actuarial team at one of the UK&apos;s largest insurance firms, attending internal strategy meetings</li>
              <li>Worked directly with the company&apos;s insurance pricing calculator — examined underlying code and data tables used to build risk models</li>
              <li>Developed spreadsheets, responded to customer query frameworks, and gained understanding of how AI and data tools are reshaping insurance</li>
              <li>Confirmed interest in the intersection of finance and AI; shaped decision to focus on statistics and quantitative methods</li>
            </ul>
          </TimelineItem>

          <TimelineItem
            title="Digital Product Design — Work Placement"
            subtitle="Space01"
            date="Summer 2022"
          >
            <ul className="list-disc list-outside ml-4 space-y-1.5 text-sm">
              <li>Built a digital product from scratch: designed and coded a website involving survey design, data collection and front-end development</li>
              <li>First substantive exposure to building with technology — directly inspired continued self-teaching leading to the Flatmate app</li>
            </ul>
          </TimelineItem>

          <TimelineItem
            title="Business Studies Student Leader"
            subtitle="Weydon School"
            date="2022 – 2023"
          >
            <ul className="list-disc list-outside ml-4 space-y-1.5 text-sm">
              <li>Appointed to run an after-school Business and Economics club for younger students</li>
              <li>Redesigned sessions on the spot when engagement dropped — behaviour and participation improved as a result</li>
            </ul>
          </TimelineItem>

          <TimelineItem
            title="Junior Instructor & Coach"
            subtitle="Taekwondo Club"
            date="2023 – 2025"
          >
            <ul className="list-disc list-outside ml-4 space-y-1.5 text-sm">
              <li>Led warm-ups, sparring and self-defence sessions for classes of approximately 30 students</li>
              <li>Coached students 1-on-1 at national tournaments; received positive reports from parents on communication and ability to manage under pressure</li>
            </ul>
          </TimelineItem>
        </Section>

        {/* Education */}
        <Section title="Education" icon={GraduationCap}>
          <TimelineItem
            title="BSc Mathematics with Economics"
            subtitle="University of Exeter"
            date="2025 – 2029 (Expected)"
          >
            <ul className="list-disc list-outside ml-4 space-y-1.5 text-sm">
              <li>First year core modules: Calculus, Statistics, Microeconomics, Macroeconomics</li>
              <li>Year 2: planning modules in Econometrics, Statistical Modelling, and Computational Mathematics</li>
              <li>Actively participating in university AI workshops covering model building, ethics, and real-world applications</li>
            </ul>
          </TimelineItem>

          <TimelineItem
            title="A-Levels"
            subtitle="RGS"
            date="2023 – 2025"
          >
            <div className="flex flex-wrap gap-3 mb-2">
              <span className="px-3 py-1 bg-green-50 text-green-700 font-semibold text-sm rounded-full">Economics: A*</span>
              <span className="px-3 py-1 bg-green-50 text-green-700 font-semibold text-sm rounded-full">Mathematics: A</span>
              <span className="px-3 py-1 bg-green-50 text-green-700 font-semibold text-sm rounded-full">Physics: A</span>
            </div>
            <p className="text-sm">Extended research project (ILA): investigated application of Game Theory — the Prisoner&apos;s Dilemma — to cryptographic security of blockchain, citing primary research papers.</p>
          </TimelineItem>

          <TimelineItem
            title="GCSEs"
            subtitle="Weydon School"
            date="2020 – 2023"
          >
            <p className="text-sm">11 GCSEs, average grade 7</p>
          </TimelineItem>
        </Section>

        {/* Achievements */}
        <Section title="Achievements & Interests" icon={Trophy}>
          <div className="grid sm:grid-cols-2 gap-4">
            <AchievementCard
              icon={Award}
              title="Taekwondo — British Champion 2023"
              description="British Champion (colour belt, U18 sparring). English Silver Medallist 2022 & 2024. National Bronze 2023. Eight years of training, competing at national level, achieving a black-stripe belt."
            />
            <AchievementCard
              icon={Award}
              title="Duke of Edinburgh Gold"
              description="Completed all four sections including volunteering at a food bank, a 4-day trek across the Brecon Beacons, two years developing tennis skills, and a residential."
            />
            <AchievementCard
              icon={Award}
              title="Scotland Coast-to-Coast Crossing"
              description="At age 15, planned and led an unsupported crossing of Scotland on foot with two friends, mapping escape routes and keeping the group motivated days from the nearest road."
            />
            <AchievementCard
              icon={Award}
              title="NASA / KCL Physics Camp"
              description="Attended a week-long programme at King's College London working with NASA engineers and astronauts to design a product for use in space."
            />
            <AchievementCard
              icon={Award}
              title="Guitar"
              description="Eight years of playing guitar — a long-term creative discipline alongside competitive sport and technical study."
            />
          </div>
        </Section>

      </main>

      {/* Footer */}
      <footer className="bg-navy text-gray-400 py-8 text-center text-sm">
        <p>References available on request</p>
        <p className="mt-1">GitHub and LinkedIn profiles to be populated with projects in 2025–2026</p>
      </footer>
    </div>
  )
}
