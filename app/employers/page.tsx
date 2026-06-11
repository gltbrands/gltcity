import { sodaFetch } from '@/lib/chicago-api'
import type { Employer } from '@/lib/types'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{ q?: string; year?: string }>
}

export default async function EmployersPage({ searchParams }: PageProps) {
  const { q, year = '2025' } = await searchParams

  const where: string[] = [`year=${year}`]
  if (q) where.push(`upper(name) like '%${q.replace(/'/g, "''").toUpperCase()}%'`)

  const data = await sodaFetch<Employer>('employers', {
    $limit: 5000,
    $order: 'name ASC',
    $where: where.join(' AND '),
  })

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-black">Lobbying Firms & Employers</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Organizations that employ registered lobbyists
        </p>
      </div>

      <div className="flex gap-3">
        <form className="flex-1 max-w-md">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search firm name…"
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          />
        </form>
        <div className="flex gap-2">
          {['2025', '2024', '2023'].map(yr => (
            <Link key={yr} href={`/employers?year=${yr}${q ? `&q=${q}` : ''}`}
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{
                background: year === yr ? 'rgba(34,211,238,0.15)' : 'var(--surface)',
                color: year === yr ? 'var(--accent)' : 'var(--muted)',
                border: '1px solid var(--border)',
              }}>
              {yr}
            </Link>
          ))}
        </div>
      </div>

      <p className="text-sm" style={{ color: 'var(--muted)' }}>{data.length} firms</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.map(e => (
          <div key={e.employer_id} className="card">
            <p className="font-bold text-sm" style={{ color: 'var(--accent)' }}>{e.name}</p>
            {e.city && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                {e.city}{e.state ? `, ${e.state}` : ''}
              </p>
            )}
            {e.phone && <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{e.phone}</p>}
            <Link
              href={`/lobbyists?q=${encodeURIComponent(e.name)}`}
              className="inline-block mt-2 text-xs px-2 py-1 rounded-md"
              style={{ background: 'rgba(34,211,238,0.1)', color: 'var(--accent)' }}
            >
              View lobbyists →
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
