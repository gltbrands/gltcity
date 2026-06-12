'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const nav = [
  { group: 'OVERVIEW', items: [
    { href: '/', label: 'Dashboard', icon: '◉' },
    { href: '/wards', label: 'Ward Map', icon: '🗺' },
  ]},
  { group: 'INTELLIGENCE', items: [
    { href: '/intel', label: 'Follow the Money', icon: '🔍' },
    { href: '/proximity', label: 'Proximity Alerts', icon: '⏱' },
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
    { href: '/roadmap', label: 'Developer Roadmap', icon: '🧭' },
  ]},
]

export default function Sidebar() {
  const path = usePathname()
  const [open, setOpen] = useState(false)

  // Close drawer on navigation
  useEffect(() => { setOpen(false) }, [path])

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Hamburger — mobile only */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 w-10 h-10 flex items-center justify-center rounded-xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
        aria-label="Open navigation"
      >
        <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor" aria-hidden="true">
          <rect y="0" width="16" height="2" rx="1" />
          <rect y="5" width="16" height="2" rx="1" />
          <rect y="10" width="16" height="2" rx="1" />
        </svg>
      </button>

      {/* Backdrop — mobile only */}
      <div
        onClick={() => setOpen(false)}
        className="md:hidden fixed inset-0 z-40 transition-opacity duration-200"
        style={{
          background: 'rgba(0,0,0,0.6)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={[
          'fixed md:relative inset-y-0 left-0 z-50 md:z-auto',
          'w-64 md:w-56 shrink-0 flex flex-col border-r overflow-y-auto',
          'transition-transform duration-200 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Logo */}
        <div className="px-4 py-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <div>
            <div className="flex items-center gap-0 leading-none">
              <span className="text-xl font-black tracking-tight text-white">W</span>
              <svg viewBox="0 0 20 22" width="19" height="21" style={{ display: 'inline-block', verticalAlign: '-5px', marginLeft: '1px', marginRight: '1px' }} aria-hidden="true">
                <polygon points="10,1 12.4,7.8 19.5,7.8 14,12 16.2,18.8 10,15 3.8,18.8 6,12 0.5,7.8 7.6,7.8" fill="#CC0000" />
              </svg>
              <span className="text-xl font-black tracking-tight text-white">RD</span>
              <span className="text-xl font-black tracking-tight" style={{ color: '#00AEEF' }}>BOSS</span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Chicago Lobbying Intelligence</p>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={() => setOpen(false)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg shrink-0"
            style={{ color: 'var(--muted)', background: 'rgba(255,255,255,0.05)' }}
            aria-label="Close navigation"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <line x1="1" y1="1" x2="13" y2="13" />
              <line x1="13" y1="1" x2="1" y2="13" />
            </svg>
          </button>
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
                  const isIntel = href === '/intel'
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        className="flex items-center gap-2 px-2 rounded-lg text-sm transition-all"
                        style={{
                          color: active ? 'var(--accent)' : 'var(--foreground)',
                          background: active
                            ? 'rgba(0,174,239,0.08)'
                            : isIntel
                            ? 'rgba(0,174,239,0.04)'
                            : 'transparent',
                          borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                          fontWeight: isIntel ? 700 : undefined,
                          minHeight: '44px',
                          display: 'flex',
                          alignItems: 'center',
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
    </>
  )
}
