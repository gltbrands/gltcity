export const dynamic = 'force-dynamic'
import { sodaFetch } from '@/lib/chicago-api'
import type { Gift } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/chicago-api'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{ q?: string; department?: string }>
}

export default async function GiftsPage({ searchParams }: PageProps) {
  const { q, department } = await searchParams

  const where: string[] = []
  if (q) {
    const esc = q.replace(/'/g, "''").toUpperCase()
    where.push(`(upper(gift) like '%${esc}%' OR upper(recipient_last_name) like '%${esc}%' OR upper(department) like '%${esc}%')`)
  }
  if (department) where.push(`upper(department) like '%${department.toUpperCase()}%'`)

  let data: Gift[] = []
  try {
    data = await sodaFetch<Gift>('gifts', {
      $limit: 2000,
      $order: 'period_start DESC',
      ...(where.length ? { $where: where.join(' AND ') } : {}),
    })
  } catch (e) { console.error('gifts fetch error:', e) }

  const total = data.reduce((s, r) => s + parseFloat(String(r.value ?? 0)), 0)

  // By department
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
          <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Total Gift Value</p>
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
              <Link key={dept} href={`/gifts?department=${encodeURIComponent(dept)}`}>
                <span className="text-xs px-2 py-0.5 rounded-full cursor-pointer"
                  style={{ background: 'rgba(248,113,113,0.1)', color: 'var(--danger)', border: '1px solid rgba(248,113,113,0.2)' }}>
                  {dept} ({cnt})
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <form>
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search gift type, recipient, or department…"
          className="w-full max-w-md px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
        />
      </form>

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
                <td className="px-4 py-3 text-sm">
                  <span>{g.recipient_title} </span>
                  <span className="font-medium">{g.recipient_first_name} {g.recipient_last_name}</span>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--accent2)' }}>{g.department}</td>
                <td className="px-4 py-3 font-mono text-sm" style={{ color: 'var(--danger)' }}>
                  {formatCurrency(g.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
