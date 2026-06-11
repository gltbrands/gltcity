import { sodaFetch } from '@/lib/chicago-api'
import type { ExpenditureLarge } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/chicago-api'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{ q?: string; purpose?: string }>
}

export default async function ExpendituresPage({ searchParams }: PageProps) {
  const { q, purpose } = await searchParams

  const where: string[] = []
  if (q) {
    const esc = q.replace(/'/g, "''").toUpperCase()
    where.push(`(upper(lobbyist_first_name) like '%${esc}%' OR upper(lobbyist_last_name) like '%${esc}%' OR upper(client_name) like '%${esc}%' OR upper(recipient) like '%${esc}%')`)
  }
  if (purpose) where.push(`upper(purpose) like '%${purpose.toUpperCase()}%'`)

  const data = await sodaFetch<ExpenditureLarge>('expendituresLarge', {
    $limit: 5000,
    $order: 'expenditure_date DESC',
    ...(where.length ? { $where: where.join(' AND ') } : {}),
  })

  const total = data.reduce((s, r) => s + parseFloat(String(r.amount ?? 0)), 0)
  const eventSpend = data.filter(e => /event|fundrais|reception|gala|dinner/i.test(e.purpose ?? '')).reduce((s, r) => s + parseFloat(String(r.amount ?? 0)), 0)

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-black">Expenditures (Large — $250+)</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Individual expenditures of $250 or more made by registered lobbyists
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card col-span-2">
          <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Total (filtered)</p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--danger)' }}>{formatCurrency(total)}</p>
        </div>
        <div className="card col-span-2">
          <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Event/Fundraiser Spend</p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--warn)' }}>{formatCurrency(eventSpend)}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>events, receptions, galas, dinners</p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <form className="flex-1 min-w-48">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search lobbyist, client, or recipient…"
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          />
        </form>
        <div className="flex gap-2 flex-wrap">
          {[['', 'All'], ['event', 'Events'], ['fundrais', 'Fundraisers'], ['reception', 'Receptions']].map(([val, label]) => (
            <Link
              key={val}
              href={`/expenditures?${q ? `q=${q}&` : ''}${val ? `purpose=${val}` : ''}`}
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{
                background: purpose === val || (!purpose && !val) ? 'rgba(248,113,113,0.15)' : 'var(--surface)',
                color: purpose === val || (!purpose && !val) ? 'var(--danger)' : 'var(--muted)',
                border: '1px solid var(--border)',
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              {['Date', 'Lobbyist', 'Client', 'Purpose', 'Recipient', 'Amount'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold"
                  style={{ color: 'var(--muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((e, i) => {
              const isEvent = /event|fundrais|reception|gala|dinner/i.test(e.purpose ?? '')
              return (
                <tr key={e.expenditure_id} className="border-t"
                  style={{ borderColor: 'var(--border)', background: isEvent ? 'rgba(251,191,36,0.03)' : (i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)') }}>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>{formatDate(e.expenditure_date)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/lobbyists/${e.lobbyist_id}`} style={{ color: 'var(--accent)' }}>
                      {e.lobbyist_first_name} {e.lobbyist_last_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm">{e.client_name}</td>
                  <td className="px-4 py-3 text-xs">
                    <span style={{ color: isEvent ? 'var(--warn)' : 'var(--foreground)' }}>{e.purpose}</span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>{e.recipient}</td>
                  <td className="px-4 py-3 font-mono text-sm" style={{ color: 'var(--danger)' }}>
                    {formatCurrency(e.amount)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
