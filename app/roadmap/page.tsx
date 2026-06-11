import { sodaFetch } from '@/lib/chicago-api'
import type { LobbyingActivity } from '@/lib/types'

const ZONING_TYPES = [
  { code: 'RS-1 – RS-3', label: 'Single-Family Residential', typical: 'Detached homes, small lots' },
  { code: 'RT-3.5 – RT-4', label: 'Two-Flat / Row Housing', typical: 'Dense residential, 2–3 units' },
  { code: 'RM-4.5 – RM-6.5', label: 'Multi-Unit Residential', typical: 'Apartment buildings, 4+ units' },
  { code: 'B1 – B3', label: 'Neighborhood / Community Business', typical: 'Retail, restaurants, services' },
  { code: 'C1 – C3', label: 'Commercial / Mixed-Use', typical: 'Office, retail, parking' },
  { code: 'M1 – M3', label: 'Industrial / Manufacturing', typical: 'Light to heavy industrial' },
  { code: 'DX / DR / DC', label: 'Downtown Mixed-Use', typical: 'High-rise residential, office, hotel' },
  { code: 'PMD', label: 'Planned Manufacturing District', typical: 'Protected industrial corridors' },
  { code: 'PD (Planned Development)', label: 'Planned Development', typical: 'Large sites, custom zoning' },
]

const PROCESS_STEPS = [
  {
    step: 1,
    title: 'Pre-Application Research',
    days: '0–30',
    who: 'You / Your Attorney',
    tasks: [
      'Pull zoning for your specific parcel (Chicago Zoning Map or ZIMAS)',
      'Check TIF district status — affects financing, increment capture',
      'Research aldermanic history: Who represents this ward? How do they vote on development?',
      'Pull building permits at nearby addresses to understand approval patterns',
      'Identify any deed restrictions, historic preservation overlays',
    ],
    lobbyNote: 'This is where lobbyist data becomes your intelligence layer — cross-reference your department targets against who is being lobbied and for what.',
  },
  {
    step: 2,
    title: 'Pre-Application Meeting (DPD)',
    days: '30–60',
    who: 'Developer + DPD Staff',
    tasks: [
      'Meet with Chicago Department of Planning & Development (DPD) staff',
      'Present concept — get informal feedback before filing',
      'Understand what variances or map amendments will be required',
      'Learn the assigned Plan Examiner / Zoning Reviewer',
    ],
    lobbyNote: "DPD is the most-lobbied planning agency in Chicago. Check the Departments tab to see who's been lobbying DPD and on what issues.",
  },
  {
    step: 3,
    title: 'Aldermanic Sign-Off (Aldermanic Privilege)',
    days: '45–180',
    who: 'Developer + Alderman + Community',
    tasks: [
      'Chicago operates on "aldermanic privilege" — most zoning changes WILL NOT move without aldermanic support',
      'Schedule meeting with the alderman of the ward where your project sits',
      'Prepare a community benefit package (affordable units, local hiring, open space)',
      'Engage community organizations, block clubs, and neighborhood associations',
      'ZONING CHANGE: Alderman introduces ordinance → Zoning Committee → Full City Council vote',
    ],
    lobbyNote: 'Contributions to aldermanic campaign committees appear in the Contributions tab. Cross-reference lobbyists who represent real estate/development clients with aldermanic contribution recipients.',
    critical: true,
  },
  {
    step: 4,
    title: 'Zoning Application Filing',
    days: '60–90',
    who: 'Applicant + Zoning Attorney',
    tasks: [
      'File Zoning Map Amendment (if rezoning required) or Administrative Adjustment',
      'File Planned Development application (for large sites or height bonuses)',
      'Pay applicable fees — PD applications can run $10k–$50k',
      'Submit site plans, traffic studies, environmental reviews as required',
    ],
    lobbyNote: null,
  },
  {
    step: 5,
    title: 'Committee on Zoning / City Council',
    days: '90–240',
    who: 'Applicant + Alderman + Committee',
    tasks: [
      'Project assigned to Committee on Zoning, Landmarks & Building Standards',
      'Public hearing — community can comment for or against',
      'Committee vote → Full City Council vote',
      'Typical timeline: 3–9 months for contested projects',
    ],
    lobbyNote: 'City Council lobbying appears as "Legislative" in the Activity tab. Filter by "City Council" department to see which clients are lobbying the council and on what.',
  },
  {
    step: 6,
    title: 'Building Permit',
    days: 'Post-approval + 30–90',
    who: 'Applicant + Architect + City',
    tasks: [
      'Apply for Building Permit through Chicago Department of Buildings',
      'Plan review: structural, fire, zoning compliance',
      'Typical review: 30–90 days for larger projects',
      'Inspections required throughout construction',
    ],
    lobbyNote: 'The Buildings department appears in lobbying data — primarily around permit timing, inspection schedules, and code variances.',
  },
  {
    step: 7,
    title: 'Certificate of Occupancy',
    days: 'Post-construction',
    who: 'Department of Buildings',
    tasks: [
      'Final inspections: electrical, plumbing, fire suppression, elevator',
      'Certificate of Occupancy issued',
      'Business license (if commercial) from Business Affairs & Consumer Protection',
    ],
    lobbyNote: null,
  },
]

const KEY_CONTACTS = [
  { agency: 'Dept of Planning & Development (DPD)', role: 'Rezonings, Planned Developments, TIF', url: 'https://www.chicago.gov/city/en/depts/dcd.html' },
  { agency: 'Dept of Buildings (DOB)', role: 'Permits, Inspections, Occupancy', url: 'https://www.chicago.gov/city/en/depts/bldgs.html' },
  { agency: 'Zoning Board of Appeals (ZBA)', role: 'Variances, Special Uses', url: 'https://www.chicago.gov/city/en/depts/dcd/supp_info/zoning_board_of_appeals.html' },
  { agency: "Mayor's Office", role: 'Large projects, TIF designations, policy', url: null },
  { agency: 'City Council — Zoning Committee', role: 'Map amendments, PDs over threshold', url: null },
  { agency: 'CDOT (Transportation)', role: 'Curb cuts, loading zones, traffic impact', url: null },
  { agency: 'Dept of Water Management', role: 'Sewer capacity, water service', url: null },
  { agency: 'Chicago Fire Dept', role: 'Fire code compliance, sprinklers', url: null },
]

async function getDPDLobbyingActivity() {
  try {
    return await sodaFetch<LobbyingActivity>('activity', {
      $where: "upper(department) like '%PLANNING%' OR upper(department) like '%ZONING%' OR upper(department) like '%BUILDINGS%'",
      $limit: 30,
      $order: 'period_start DESC',
    })
  } catch { return [] }
}

export default async function RoadmapPage() {
  const dpdActivity = await getDPDLobbyingActivity()

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black">Developer Intelligence Roadmap</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          What it actually takes to build in Chicago — the political map, the process, and who controls what
        </p>
      </div>

      {/* Critical insight box */}
      <div className="p-5 rounded-xl" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)' }}>
        <h2 className="font-bold text-base mb-2" style={{ color: 'var(--warn)' }}>
          ⚡ The Chicago Reality
        </h2>
        <p className="text-sm leading-relaxed">
          Chicago operates on <strong>aldermanic privilege</strong> — a powerful unwritten (and now increasingly written) rule that says the City Council will not approve a zoning change without the support of the ward alderman. This means your alderman is effectively a <em>veto point</em>. Before you spend a dollar on plans, you need political intelligence: Who is the alderman? What is their track record on your project type? Who has lobbied their committee? Who has contributed to their campaign?
        </p>
        <p className="text-sm leading-relaxed mt-2">
          This platform connects those dots. The lobbying data, contribution records, and gift disclosures let you see the <em>real</em> political economy around development — not the official process, but the actual flow of influence.
        </p>
      </div>

      {/* Zoning overview */}
      <div className="card">
        <h2 className="font-bold text-lg mb-4">Chicago Zoning Classes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ZONING_TYPES.map(z => (
            <div key={z.code} className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
              <p className="font-mono text-xs font-bold" style={{ color: 'var(--accent)' }}>{z.code}</p>
              <p className="font-semibold text-sm mt-0.5">{z.label}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{z.typical}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Process steps */}
      <div>
        <h2 className="font-bold text-lg mb-4">The Approval Process — Step by Step</h2>
        <div className="space-y-4">
          {PROCESS_STEPS.map(step => (
            <div
              key={step.step}
              className="p-5 rounded-xl"
              style={{
                background: step.critical ? 'rgba(248,113,113,0.06)' : 'var(--surface)',
                border: `1px solid ${step.critical ? 'rgba(248,113,113,0.25)' : 'var(--border)'}`,
              }}
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-black"
                  style={{ background: step.critical ? 'rgba(248,113,113,0.2)' : 'rgba(34,211,238,0.15)', color: step.critical ? 'var(--danger)' : 'var(--accent)' }}>
                  {step.step}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-bold">{step.title}</h3>
                    {step.critical && <span className="badge badge-high">Critical</span>}
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                      Days: {step.days} · {step.who}
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {step.tasks.map((t, i) => (
                      <li key={i} className="text-sm flex gap-2" style={{ color: 'var(--foreground)' }}>
                        <span style={{ color: 'var(--muted)' }}>•</span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                  {step.lobbyNote && (
                    <div className="mt-3 p-3 rounded-lg" style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.15)' }}>
                      <p className="text-xs" style={{ color: 'var(--accent)' }}>
                        🔍 <strong>GLTCity Intelligence:</strong> {step.lobbyNote}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key contacts */}
      <div className="card">
        <h2 className="font-bold text-lg mb-4">Key Agencies & Contacts</h2>
        <div className="space-y-2">
          {KEY_CONTACTS.map(c => (
            <div key={c.agency} className="flex items-start justify-between gap-4 py-2 border-b"
              style={{ borderColor: 'var(--border)' }}>
              <div>
                <p className="font-semibold text-sm">{c.agency}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>{c.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live lobbying data for Planning/Buildings */}
      {dpdActivity.length > 0 && (
        <div className="card">
          <h2 className="font-bold text-lg mb-1">What's Being Lobbied at Planning & Buildings Right Now</h2>
          <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
            Live from Chicago Board of Ethics — most recent filings
          </p>
          <div className="space-y-2">
            {dpdActivity.map((a, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                <span className={`badge shrink-0 badge-${(a.action ?? '').toLowerCase().replace(' ', '')}`}>
                  {(a.action ?? '').slice(0, 3).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{a.client_name}</p>
                  <p className="text-xs" style={{ color: 'var(--accent)' }}>{a.department}</p>
                  <p className="text-xs line-clamp-1 mt-0.5" style={{ color: 'var(--muted)' }}>{a.action_sought}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
