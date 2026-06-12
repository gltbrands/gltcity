import StatCard from '@/components/ui/StatCard'
import { formatCurrency, sodaFetch, sodaCount } from '@/lib/chicago-api'
import type { LobbyingActivity, AnomalyAlert } from '@/lib/types'
import Link from 'next/link'

async function getStats() {
  try {
    const [lobbyists, clients, activities, comp, contrib] = await Promise.all([
      sodaCount('combinations', 'year=2025'),
      sodaCount('clients', 'year=2025'),
      sodaCount('activity'),
      sodaFetch<{ total: string }>('compensation', { $select: 'sum(compensation_amount) as total', $limit: 1 }),
      sodaFetch<{ total: string }>('contributions', { $select: 'sum(amount) as total', $limit: 1 }),
    ])
    return {
      lobbyists,
      clients,
      activities,
      totalCompensation: parseFloat((comp[0] as any)?.total ?? '0'),
      totalContributions: parseFloat((contrib[0] as any)?.total ?? '0'),
    }
  } catch { return null }
}

async function getRecentActivity() {
  try {
    return await sodaFetch<LobbyingActivity>('activity', { $limit: 8, $order: 'period_start DESC' })
  } catch { return [] }
}

export default async function Dashboard() {
  const [stats, activity] = await Promise.all([getStats(), getRecentActivity()])

  return (
    <div className="space-y-8 max-w-7xl">
      <div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-0 leading-none">
          <span className="text-white">W</span>
          <svg viewBox="0 0 20 22" width="27" height="30" style={{ display: 'inline-block', verticalAlign: 'middle', marginBottom: '3px', marginLeft: '2px', marginRight: '2px' }}>
            <polygon points="10,1 12.4,7.8 19.5,7.8 14,12 16.2,18.8 10,15 3.8,18.8 6,12 0.5,7.8 7.6,7.8" fill="#CC0000" />
          </svg>
          <span className="text-white">RD</span><span style={{ color: '#00AEEF' }}>BOSS</span>
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Chicago Board of Ethics · Lobbying Intelligence Platform · Data updated daily via SODA API
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard label="Active Lobbyists (2025)" value={stats?.lobbyists?.toLocaleString() ?? '—'} icon="👤" />
        <StatCard label="Registered Clients" value={stats?.clients?.toLocaleString() ?? '—'} icon="🏢" />
        <StatCard label="Activity Records" value={stats?.activities?.toLocaleString() ?? '—'} icon="📋" />
        <StatCard
          label="Total Compensation"
          value={stats ? formatCurrency(stats.totalCompensation) : '—'}
          accent="var(--success)"
          icon="💰"
          sub="All years"
        />
        <StatCard
          label="Political Contributions"
          value={stats ? formatCurrency(stats.totalContributions) : '—'}
          accent="var(--warn)"
          icon="📊"
          sub="All years"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-base">Recent Lobbying Activity</h2>
            <Link href="/activity" className="text-xs" style={{ color: 'var(--accent)' }}>View all →</Link>
          </div>
          <div className="space-y-2">
            {activity.map((a, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                <span className={`badge shrink-0 mt-0.5 badge-${(a.action ?? '').toLowerCase().replace(' ', '')}`}>
                  {a.action === 'Both' ? 'BOTH' : (a.action ?? '').slice(0, 3).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{a.client_name}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    {a.department} · {a.lobbyist_first_name} {a.lobbyist_last_name}
                  </p>
                  <p className="text-xs mt-0.5 line-clamp-1" style={{ color: '#94a3b8' }}>
                    {a.action_sought}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Access Grid */}
        <div>
          <h2 className="font-bold text-base mb-4">Explore the Data</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/lobbyists', label: 'Lobbyist Registry', icon: '👤', desc: 'Search all registered lobbyists', accent: 'var(--accent)' },
              { href: '/clients', label: 'Client Directory', icon: '🏢', desc: 'Who hired whom', accent: 'var(--accent2)' },
              { href: '/contributions', label: 'Contributions', icon: '💰', desc: 'Political $ to officials', accent: 'var(--warn)' },
              { href: '/gifts', label: 'Gifts to Officials', icon: '🎁', desc: 'Track gift disclosures', accent: 'var(--danger)' },
              { href: '/anomalies', label: 'Anomaly Alerts', icon: '⚠', desc: 'AI-detected patterns', accent: 'var(--danger)' },
              { href: '/network', label: 'Network Graph', icon: '⬡', desc: 'Visual relationship map', accent: 'var(--success)' },
              { href: '/departments', label: 'Departments', icon: '🏗', desc: 'Who lobbies what', accent: 'var(--accent)' },
              { href: '/roadmap', label: 'Developer Roadmap', icon: '🧭', desc: 'Build in Chicago', accent: 'var(--accent2)' },
            ].map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="card transition-all hover:scale-[1.02]"
                style={{ textDecoration: 'none', borderColor: 'var(--border)' }}
              >
                <div className="text-xl mb-1">{item.icon}</div>
                <div className="text-sm font-semibold" style={{ color: item.accent }}>{item.label}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{item.desc}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
