import { sodaFetch } from '@/lib/chicago-api'
import type {
  LobbyistCombination, LobbyingActivity, Compensation,
  Contribution, Gift, ExpenditureLarge
} from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/chicago-api'
import Link from 'next/link'

interface PageProps { params: Promise<{ id: string }> }

export default async function LobbyistProfile({ params }: PageProps) {
  const { id } = await params
  const lid = parseInt(id)

  const [combos, activities, compensation, contributions, gifts, expenditures] = await Promise.all([
    sodaFetch<LobbyistCombination>('combinations', { $where: `lobbyist_id=${lid}`, $limit: 500 }),
    sodaFetch<LobbyingActivity>('activity', { $where: `lobbyist_id=${lid}`, $limit: 200, $order: 'period_start DESC' }),
    sodaFetch<Compensation>('compensation', { $where: `lobbyist_id=${lid}`, $limit: 500 }),
    sodaFetch<Contribution>('contributions', { $where: `lobbyist_id=${lid}`, $limit: 500 }),
    sodaFetch<Gift>('gifts', { $where: `lobbyist_id=${lid}`, $limit: 200 }),
    sodaFetch<ExpenditureLarge>('expendituresLarge', { $where: `lobbyist_id=${lid}`, $limit: 200 }),
  ])

  const first = combos[0]
  if (!first) return <div style={{ color: 'var(--muted)' }}>Lobbyist not found</div>

  const name = `${first.lobbyist_first_name} ${first.lobbyist_last_name}`
  const employers = [...new Set(combos.map(c => c.employer_name))]
  const clients = [...new Set(combos.map(c => c.client_name))]
  const departments = [...new Set(activities.map(a => a.department).filter(Boolean))]

  const totals = {
    compensation: compensation.reduce((s, r) => s + parseFloat(String(r.compensation_amount ?? 0)), 0),
    contributions: contributions.reduce((s, r) => s + parseFloat(String(r.amount ?? 0)), 0),
    expenditures: expenditures.reduce((s, r) => s + parseFloat(String(r.amount ?? 0)), 0),
    gifts: gifts.reduce((s, r) => s + parseFloat(String(r.value ?? 0)), 0),
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/lobbyists" className="text-xs mb-2 block" style={{ color: 'var(--muted)' }}>
            ← Back to Registry
          </Link>
          <h1 className="text-2xl font-black" style={{ color: 'var(--accent)' }}>{name}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {employers.join(' · ')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Lobbyist ID</p>
          <p className="font-mono text-sm">{lid}</p>
        </div>
      </div>

      {/* Money totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Compensation', value: totals.compensation, accent: 'var(--success)' },
          { label: 'Contributions', value: totals.contributions, accent: 'var(--warn)' },
          { label: 'Expenditures', value: totals.expenditures, accent: 'var(--danger)' },
          { label: 'Gifts Value', value: totals.gifts, accent: 'var(--accent2)' },
        ].map(t => (
          <div key={t.label} className="card">
            <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{t.label}</p>
            <p className="text-xl font-bold mt-1" style={{ color: t.accent }}>{formatCurrency(t.value)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clients */}
        <div className="card">
          <h2 className="font-bold mb-3">Clients ({clients.length})</h2>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {clients.map(c => (
              <p key={c} className="text-sm py-1 border-b" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                {c}
              </p>
            ))}
          </div>
        </div>

        {/* Departments lobbied */}
        <div className="card">
          <h2 className="font-bold mb-3">Departments Lobbied ({departments.length})</h2>
          <div className="flex flex-wrap gap-1">
            {departments.map(d => (
              <Link key={d} href={`/departments?q=${encodeURIComponent(d)}`}>
                <span className="text-xs px-2 py-1 rounded-full cursor-pointer"
                  style={{ background: 'rgba(167,139,250,0.1)', color: 'var(--accent2)', border: '1px solid rgba(167,139,250,0.2)' }}>
                  {d}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Political contributions */}
        <div className="card">
          <h2 className="font-bold mb-3">Political Contributions ({contributions.length})</h2>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {contributions.slice(0, 20).map(c => (
              <div key={c.contribution_id} className="flex justify-between text-xs py-1 border-b"
                style={{ borderColor: 'var(--border)' }}>
                <span className="truncate mr-2" style={{ color: 'var(--foreground)' }}>{c.recipient}</span>
                <span className="font-mono shrink-0" style={{ color: 'var(--warn)' }}>
                  {formatCurrency(c.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h2 className="font-bold mb-4">Lobbying Activity ({activities.length} records)</h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {activities.map((a, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
              <span className={`badge shrink-0 mt-0.5 badge-${(a.action ?? '').toLowerCase().replace(' ', '')}`}>
                {(a.action ?? '').slice(0, 3).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{a.client_name}</p>
                  <p className="text-xs shrink-0" style={{ color: 'var(--muted)' }}>
                    {formatDate(a.period_start)}
                  </p>
                </div>
                <p className="text-xs" style={{ color: 'var(--accent)' }}>{a.department}</p>
                <p className="text-xs mt-0.5 line-clamp-2" style={{ color: '#94a3b8' }}>{a.action_sought}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gifts */}
      {gifts.length > 0 && (
        <div className="card">
          <h2 className="font-bold mb-4">Gifts to Officials ({gifts.length} records)</h2>
          <div className="space-y-2">
            {gifts.map((g, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg"
                style={{ background: 'rgba(248,113,113,0.04)', border: '1px solid rgba(248,113,113,0.15)' }}>
                <div>
                  <p className="text-sm font-medium">{g.gift}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    To {g.recipient_title} {g.recipient_first_name} {g.recipient_last_name} · {g.department}
                  </p>
                </div>
                <p className="font-mono text-sm" style={{ color: 'var(--danger)' }}>
                  {formatCurrency(g.value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
