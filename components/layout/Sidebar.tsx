'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const nav = [
  { group: 'OVERVIEW', items: [
    { href: '/', label: 'Dashboard', icon: '◉' },
    { href: '/anomalies', label: 'Anomaly Alerts', icon: '⚠' },
    { href: '/network', label: 'Network Graph', icon: '⬡' },
  ]},
  { group: 'PEOPLE', items: [
    { href: '/lobbyists', label: 'Lobbyists', icon: '👤' },
    { href: '/clients', label: 'Clients', icon: '🏢' },
    { href: '/employers', label: 'Firms / Employers', icon: '🏛' },
  ]},
  { group: 'ACTIVITY', items: [
    { href: '/activity', label: 'Lobbying Activity', icon: '📋' },
    { href: '/departments', label: 'Departments', icon: '🏗' },
  ]},
  { group: 'MONEY TRAIL', items: [
    { href: '/contributions', label: 'Contributions', icon: '💰' },
    { href: '/compensation', label: 'Compensation', icon: '📊' },
    { href: '/expenditures', label: 'Expenditures', icon: '💸' },
    { href: '/gifts', label: 'Gifts to Officials', icon: '🎁' },
  ]},
  { group: 'DEVELOPMENT', items: [
    { href: '/permits', label: 'Building Permits', icon: '🔨' },
    { href: '/zoning', label: 'Zoning & Wards', icon: '🗺' },
    { href: '/roadmap', label: 'Developer Roadmap', icon: '🧭' },
  ]},
]

export default function Sidebar() {
  const path = usePathname()

  return (
    <aside
      className="w-56 shrink-0 flex flex-col border-r overflow-y-auto"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {/* Logo */}
      <div className="px-4 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <span className="text-xl font-black" style={{ color: 'var(--accent)' }}>GLT</span>
          <span className="text-xl font-black text-white">CITY</span>
        </div>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Chicago Intelligence</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-5">
        {nav.map(({ group, items }) => (
          <div key={group}>
            <p className="px-2 mb-1 text-xs font-semibold tracking-widest" style={{ color: 'var(--muted)' }}>
              {group}
            </p>
            <ul className="space-y-0.5">
              {items.map(({ href, label, icon }) => {
                const active = path === href || (href !== '/' && path.startsWith(href))
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all"
                      style={{
                        color: active ? 'var(--accent)' : 'var(--foreground)',
                        background: active ? 'rgba(34,211,238,0.08)' : 'transparent',
                        borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                      }}
                    >
                      <span className="text-base w-5 shrink-0 text-center">{icon}</span>
                      <span className="truncate">{label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t text-xs" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
        <p>Data: Chicago Board of Ethics</p>
        <p className="mt-0.5">Updated daily via SODA API</p>
      </div>
    </aside>
  )
}
