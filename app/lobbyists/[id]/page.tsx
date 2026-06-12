export const dynamic = 'force-dynamic'
import { sodaFetch } from '@/lib/chicago-api'
import type {
  LobbyistCombination, LobbyingActivity, Compensation,
  Contribution, Gift, ExpenditureLarge
} from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/chicago-api'
import { classifyTopic, TOPICS, type TopicKey } from '@/lib/topics'
import Link from 'next/link'

interface PageProps { params: Promise<{ id: string }> }

function powerBrokerScore(comp: number, clients: number, depts: number, contribs: number) {
  const c = Math.min(Math.log10(comp + 1) / Math.log10(500_000) * 35, 35)
  const cl = Math.min(clients / 30 * 25, 25)
  const d = Math.min(depts / 10 * 20, 20)
  const co = Math.min(Math.log10(contribs + 1) / Math.log10(100_000) * 20, 20)
  return Math.round(c + cl + d + co)
}

export default async function LobbyistProfile({ params }: PageProps) {
  const { id } = await params
  const lid = parseInt(id)

  let combos: LobbyistCombination[] = []
  let activities: LobbyingActivity[] = []
  let compensation: Compensation[] = []
  let contributions: Contribution[] = []
  let gifts: Gift[] = []
  let expenditures: ExpenditureLarge[] = []
  try {
    ;[combos, activities, compensation, contributions, gifts, expenditures] = await Promise.all([
      sodaFetch<LobbyistCombination>('combinations', { $where: `lobbyist_id=${lid}`, $limit: 500 }),
      sodaFetch<LobbyingActivity>('activity', { $where: `lobbyist_id=${lid}`, $limit: 500, $order: 'period_start DESC' }),
      sodaFetch<Compensation>('compensation', { $where: `lobbyist_id=${lid}`, $limit: 500 }),
      sodaFetch<Contribution>('contributions', { $where: `lobbyist_id=${lid}`, $limit: 500 }),
      sodaFetch<Gift>('gifts', { $where: `lobbyist_id=${lid}`, $limit: 200 }),
      sodaFetch<ExpenditureLarge>('expendituresLarge', { $where: `lobbyist_id=${lid}`, $limit: 200 }),
    ])
  } catch (e) { console.error('lobbyist profile fetch error:', e) }

  const first = combos[0]
  if (!first) return (
    <div className="card text-center py-16 max-w-md mx-auto mt-12">
      <p className="text-4xl mb-4">👤</p>
      <p className="font-bold text-lg mb-1">Lobbyist not found</p>
      <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>ID #{id} does not match any registered lobbyist.</p>
      <Link href="/lobbyists" className="text-sm font-medium" style={{ color: 'var(--accent)' }}>← Back to Registry</Link>
    </div>
  )

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

  const pbScore = powerBrokerScore(totals.compensation, clients.length, departments.length, totals.contributions)
  const fixerIndex = Math.min(100, Math.round((departments.length * 8) + (clients.length * 2)))

  const sectorMap = new Map<TopicKey, number>()
  for (const a of activities) {
    const topic = classifyTopic(a.department ?? '', a.action_sought ?? '')
    sectorMap.set(topic, (sectorMap.get(topic) ?? 0) + 1)
  }
  const topSectors = Array.from(sectorMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const recipientMap = new Map<string, number>()
  for (const c of contributions) {
    recipientMap.set(c.recipient, (recipientMap.get(c.recipient) ?? 0) + parseFloat(String(c.amount ?? 0)))
  }
  const topRecipients = Array.from(recipientMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const pbColor = pbScore >= 70 ? '#ef4444' : pbScore >= 45 ? '#fbbf24' : 'var(--accent)'
  const pbLabel = pbScore >= 70 ? 'High Influence' : pbScore >= 45 ? 'Notable' : 'Registered'

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/lobbyists" className="text-xs mb-2 block" style={{ color: 'var(--muted)' }}>
            ← Back to Registry
          </Link>
          <h1 className="text-2xl font-black" style={{ color: 'var(--accent)' }}>{name}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{employers.join(' · ')}</p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <Link
            href={`/intel?q=${encodeURIComponent(name)}`}
            className="px-4 py-2 rounded-xl text-sm font-bold"
            style={{ background: 'var(--accent)', color: '#000' }}
          >
            🔍 Follow the Money Chain
          </Link>
          <p className="text-xs font-mono" style={{ color: 'var(--muted)' }}>ID: {lid}</p>
        </div>
      </div>

      {/* Power Broker + Fixer scores */}
      <div className="card" style={{ border: `1px solid ${pbColor}33`, background: `${pbColor}06` }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs px-2 py-0.5 rounded-full font-bold"
            style={{ background: `${pbColor}22`, color: pbColor }}>
            {pbLabel}
          </span>
          <h2 className="text-sm font-bold text-white">Intelligence Profile</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-xs font-bold" style={{ color: 'var(--muted)' }}>POWER BROKER SCORE</span>
              <span className="text-sm font-black" style={{ color: pbColor }}>{pbScore}/100</span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div className="h-full rounded-full" style={{ width: `${pbScore}%`, background: pbColor }} />
            </div>
            <p className="text-xs mt-1.5" style={{ color: 'var(--muted)' }}>
              Compensation × client breadth × dept reach × political spending
            </p>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-xs font-bold" style={{ color: 'var(--muted)' }}>FIXER INDEX</span>
              <span className="text-sm font-black" style={{ color: '#a78bfa' }}>{fixerIndex}/100</span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div className="h-full rounded-full" style={{ width: `${Math.min(fixerIndex,100)}%`, background: '#a78bfa' }} />
            </div>
            <p className="text-xs mt-1.5" style={{ color: 'var(--muted)' }}>
              {departments.length} dept{departments.length !== 1 ? 's' : ''}, {clients.length} client{clients.length !== 1 ? 's' : ''} navigated
            </p>
          </div>
        </div>

        {topSectors.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-bold mb-2" style={{ color: 'var(--muted)' }}>SECTOR SPECIALIZATION</p>
            <div className="flex flex-wrap gap-2">
              {topSectors.map(([topic, count]) => {
                const info = TOPICS[topic]
                const pct = Math.round(count / activities.length * 100)
                return (
                  <div key={topic} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                    style={{ background: `${info.color}15`, border: `1px solid ${info.color}30` }}>
                    <span>{info.emoji}</span>
                    <span className="text-xs font-semibold" style={{ color: info.color }}>{info.label.split(' ')[0]}</span>
                    <span className="text-xs font-bold" style={{ color: info.color }}>{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {topRecipients.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-bold mb-2" style={{ color: 'var(--muted)' }}>TOP POLITICAL RECIPIENTS</p>
            <div className="space-y-1">
              {topRecipients.map(([recipName, amount]) => (
                <div key={recipName} className="flex items-center justify-between text-xs">
                  <Link href={`/contributions?q=${encodeURIComponent(recipName.split(',')[0] ?? recipName)}`}
                    className="truncate hover:underline" style={{ color: 'var(--foreground)' }}>
                    {recipName}
                  </Link>
                  <span className="shrink-0 ml-2 font-mono" style={{ color: '#fbbf24' }}>
                    {formatCurrency(amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
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
        <div className="card">
          <h2 className="font-bold mb-3">Clients ({clients.length})</h2>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {clients.map(c => (
              <Link key={c} href={`/intel?q=${encodeURIComponent(c)}`}
                className="text-sm py-1 border-b flex items-center justify-between group"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                <span className="truncate">{c}</span>
                <span className="text-xs opacity-0 group-hover:opacity-100 shrink-0 ml-2" style={{ color: 'var(--accent)' }}>intel →</span>
              </Link>
            ))}
          </div>
        </div>

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

        <div className="card">
          <h2 className="font-bold mb-3">Political Contributions ({contributions.length})</h2>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {contributions.slice(0, 20).map(c => (
              <div key={c.contribution_id} className="flex justify-between text-xs py-1 border-b"
                style={{ borderColor: 'var(--border)' }}>
                <Link href={`/contributions?q=${encodeURIComponent(c.recipient.split(',')[0] ?? c.recipient)}`}
                  className="truncate mr-2 hover:underline" style={{ color: 'var(--foreground)' }}>
                  {c.recipient}
                </Link>
                <span className="font-mono shrink-0" style={{ color: 'var(--warn)' }}>
                  {formatCurrency(c.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">Lobbying Activity ({activities.length} records)</h2>
          <Link href="/proximity" className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
            ⏱ Proximity Alerts
          </Link>
        </div>
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
                  <p className="text-xs shrink-0" style={{ color: 'var(--muted)' }}>{formatDate(a.period_start)}</p>
                </div>
                <p className="text-xs" style={{ color: 'var(--accent)' }}>{a.department}</p>
                <p className="text-xs mt-0.5 line-clamp-2" style={{ color: '#94a3b8' }}>{a.action_sought}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {gifts.length > 0 && (
        <div className="card">
          <h2 className="font-bold mb-4">Gifts to Officials ({gifts.length})</h2>
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
                <p className="font-mono text-sm" style={{ color: 'var(--danger)' }}>{formatCurrency(g.value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
