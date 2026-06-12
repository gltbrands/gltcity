export const dynamic = 'force-dynamic'
import { sodaFetch } from '@/lib/chicago-api'
import type { Compensation } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/chicago-api'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{ q?: string; year?: string }>
}

export default async function CompensationPage({ searchParams }: PageProps) {
  const { q, year = '2025' } = await searchParams

  const where: string[] = [
    `period_start >= '${year}-01-01T00:00:00.000' AND period_start <= '${year}-12-31T23:59:59.999'`,
  ]
  if (q) {
    const esc = q.replace(/'/g, "''").toUpperCase()
    where.push(`(upper(lobbyist_first_name) like '%${esc}%' OR upper(lobbyist_last_name) like '%${esc}%' OR upper(client_name) like '%${esc}%')`)
  }

  let data: Compensation[] = []
  try {
    data = await sodaFetch<Compensation>('compensation', {
      $limit: 3000,
      $order: 'period_start DESC',
      $where: where.join(' AND '),
    })
  } catch (e) { console.error('compensation fetch error:', e) }

  const total = data.reduce((s, r) => s + parseFloat(String(r.compensation_amount ?? 0)), 0)

  const earnerMap = new Map<number, { name: string; total: number }>()
  for (const c of data) {
    const ex = earnerMap.get(c.lobbyist_id)
    if (ex) ex.total += parseFloat(String(c.compensation_amount ?? 0))
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
          <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{year} Total</p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--success)' }}>{formatCurrency(total)}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{data.length} records</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>Top Earners</p>
          {topEarners.map(([id, { name, total: t }]) => (
            <div key={id} className="flex justify-between text-xs py-0.5">
              <Link href={`/lobbyists/${id}`} style={{ color: 'var(--accent)' }} className="truncate mr-2">{name}</Link>
              <span className="font-mono shrink-0" style={{ color: 'var(--success)' }}>{formatCurrency(t)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 items-center flex-wrap">
        <form className="flex-1 min-w-52 max-w-md">
          <input
            type="search" name="q" defaultValue={q}
            placeholder="Search lobbyist or client…"
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          />
        </form>
        <div className="flex gap-2 flex-wrap">
          {['2025', '2024', '2023', '2022'].map(yr => (
            <Link key={yr} href={`/compensation?year=${yr}${q ? `&q=${q}` : ''}`}
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{
                background: year === yr ? 'rgba(0,174,239,0.15)' : 'var(--surface)',
                color: year === yr ? 'var(--accent)' : 'var(--muted)',
                border: '1px solid var(--border)',
              }}>
              {yr}
            </Link>
          ))}
        </div>
      </div>

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
                <td className="px-4 py-3">{c.client_name}</td>
                <td className="px-4 py-3 font-mono" style={{ color: 'var(--success)' }}>{formatCurrency(c.compensation_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
