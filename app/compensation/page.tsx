import { sodaFetch } from '@/lib/chicago-api'
import type { Compensation } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/chicago-api'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function CompensationPage({ searchParams }: PageProps) {
  const { q } = await searchParams

  const where: string[] = []
  if (q) {
    const esc = q.replace(/'/g, "''").toUpperCase()
    where.push(`(upper(lobbyist_first_name) like '%${esc}%' OR upper(lobbyist_last_name) like '%${esc}%' OR upper(client_name) like '%${esc}%')`)
  }

  const data = await sodaFetch<Compensation>('compensation', {
    $limit: 50000,
    $order: 'period_start DESC',
    ...(where.length ? { $where: where.join(' AND ') } : {}),
  })

  const total = data.reduce((s, r) => s + parseFloat(String(r.compensation_amount ?? 0)), 0)

  // Top earners
  const earnerMap = new Map<number, { name: string; total: number }>()
  for (const c of data) {
    const existing = earnerMap.get(c.lobbyist_id)
    if (existing) existing.total += parseFloat(String(c.compensation_amount ?? 0))
    else earnerMap.set(c.lobbyist_id, { name: `${c.lobbyist_first_name} ${c.lobbyist_last_name}`, total: parseFloat(String(c.compensation_amount ?? 0)) })
  }
  const topEarners = Array.from(earnerMap.entries()).sort((a, b) => b[1].total - a[1].total).slice(0, 5)

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-black">Lobbying Compensation</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Compensation received by lobbyists from their clients, reported quarterly
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Total (filtered)</p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--success)' }}>{formatCurrency(total)}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{data.length} records</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>Top Earners</p>
          {topEarners.map(([id, { name, total }]) => (
            <div key={id} className="flex justify-between text-xs py-0.5">
              <Link href={`/lobbyists/${id}`} style={{ color: 'var(--accent)' }} className="truncate mr-2">{name}</Link>
              <span className="font-mono shrink-0" style={{ color: 'var(--success)' }}>{formatCurrency(total)}</span>
            </div>
          ))}
        </div>
      </div>

      <form>
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search lobbyist or client…"
          className="w-full max-w-md px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
        />
      </form>

      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              {['Period', 'Lobbyist', 'Client', 'Amount'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold"
                  style={{ color: 'var(--muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((c, i) => (
              <tr key={c.compensation_id} className="border-t"
                style={{ borderColor: 'var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>{formatDate(c.period_start)}</td>
                <td className="px-4 py-3">
                  <Link href={`/lobbyists/${c.lobbyist_id}`} style={{ color: 'var(--accent)' }}>
                    {c.lobbyist_first_name} {c.lobbyist_last_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm">{c.client_name}</td>
                <td className="px-4 py-3 font-mono text-sm" style={{ color: 'var(--success)' }}>
                  {formatCurrency(c.compensation_amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
