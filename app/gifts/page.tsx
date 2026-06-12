export const dynamic = 'force-dynamic'
import { sodaFetch } from '@/lib/chicago-api'
import type { Gift } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/chicago-api'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{ q?: string; department?: string; year?: string }>
}

export default async function GiftsPage({ searchParams }: PageProps) {
  const { q, department, year = '2025' } = await searchParams

  const where: string[] = [
    `period_start >= '${year}-01-01T00:00:00.000' AND period_start <= '${year}-12-31T23:59:59.999'`,
  ]
  if (q) {
    const esc = q.replace(/'/g, "''").toUpperCase()
    where.push(`(upper(gift) like '%${esc}%' OR upper(recipient_last_name) like '%${esc}%' OR upper(department) like '%${esc}%')`)
  }
  if (department) where.push(`upper(department) like '%${department.toUpperCase()}%'`)

  let data: Gift[] = []
  try {
    data = await sodaFetch<Gift>('gifts', {
      $limit: 1000,
      $order: 'period_start DESC',
      $where: where.join(' AND '),
    })
  } catch (e) { console.error('gifts fetch error:', e) }

  const total = data.reduce((s, r) => s + parseFloat(String(r.value ?? 0)), 0)

  const deptMap = new Map<string, number>()
  for (const g of data) {
    deptMap.set(g.department, (deptMap.get(g.department) ?? 0) + 1)
  }
  const topDepts = Array.from(deptMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6)

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-black">Gifts to City Officials</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Every gift by a registered lobbyist to a city official, reported quarterly
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{year} Gift Value</p>
          <p className="text-xl font-bold mt-1" style={{ color: 'var(--danger)' }}>{formatCurrency(total)}</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Records</p>
          <p className="text-xl font-bold mt-1">{data.length}</p>
        </div>
        <div className="card col-span-2">
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>By Department</p>
          <div className="flex flex-wrap gap-1">
            {topDepts.map(([dept, cnt]) => (
              <Link key={dept} href={`/gifts?year=${year}&department=${encodeURIComponent(dept)}`}>
                <span className="text-xs px-2 py-0.5 rounded-full cursor-pointer"
                  style={{ background: 'rgba(248,113,113,0.1)', color: 'var(--danger)', border: '1px solid rgba(248,113,113,0.2)' }}>
                  {dept} ({cnt})
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 items-center flex-wrap">
        <form className="flex-1 min-w-52 max-w-md">
          <input
            type="search" name="q" defaultValue={q}
            placeholder="Search gift type, recipient, or department…"
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          />
        </form>
        <div className="flex gap-2 flex-wrap">
          {['2025', '2024', '2023', '2022'].map(yr => (
            <Link key={yr} href={`/gifts?year=${yr}${q ? `&q=${q}` : ''}`}
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
              {['Period', 'Lobbyist', 'Gift', 'Recipient', 'Dept', 'Value'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold"
                  style={{ color: 'var(--muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((g, i) => (
              <tr key={i} className="border-t"
                style={{ borderColor: 'var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>{formatDate(g.period_start)}</td>
                <td className="px-4 py-3">
                  <Link href={`/lobbyists/${g.lobbyist_id}`} style={{ color: 'var(--accent)' }}>
                    {g.lobbyist_firstname} {g.lobbyist_lastname}
                  </Link>
                </td>
                <td className="px-4 py-3">{g.gift}</td>
                <td className="px-4 py-3">
                  <span>{g.recipient_title} </span>
                  <span className="font-medium">{g.recipient_first_name} {g.recipient_last_name}</span>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--accent2)' }}>{g.department}</td>
                <td className="px-4 py-3 font-mono" style={{ color: 'var(--danger)' }}>{formatCurrency(g.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
