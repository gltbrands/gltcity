export const dynamic = 'force-dynamic'
import { sodaFetch, sodaCount } from '@/lib/chicago-api'
import type { Client } from '@/lib/types'
import Link from 'next/link'

const PAGE_SIZE = 100

interface PageProps {
  searchParams: Promise<{ q?: string; year?: string; state?: string; page?: string }>
}

export default async function ClientsPage({ searchParams }: PageProps) {
  const { q, year, state, page = '1' } = await searchParams
  const pageNum = Math.max(1, parseInt(page, 10))
  const offset = (pageNum - 1) * PAGE_SIZE

  const where: string[] = []
  if (year) where.push(`year=${year}`)
  if (q) where.push(`upper(name) like '%${q.replace(/'/g, "''").toUpperCase()}%'`)
  if (state) where.push(`state='${state}'`)

  let data: Client[] = []
  let total = 0
  try {
    ;[data, total] = await Promise.all([
      sodaFetch<Client>('clients', {
        $limit: PAGE_SIZE,
        $offset: offset,
        $order: 'name ASC',
        ...(where.length ? { $where: where.join(' AND ') } : {}),
      }),
      sodaCount('clients', where.length ? where.join(' AND ') : undefined),
    ])
  } catch (e) { console.error('clients fetch error:', e) }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const buildUrl = (p: number) => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (year) params.set('year', year)
    if (state) params.set('state', state)
    params.set('page', String(p))
    return `/clients?${params.toString()}`
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-black">Client Directory</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          {total.toLocaleString()} total entities that have hired registered lobbyists
        </p>
      </div>

      <div className="flex gap-3 items-center flex-wrap">
        <form className="flex-1 min-w-52 max-w-md">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search client name…"
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          />
        </form>
        <div className="flex gap-2 flex-wrap">
          <Link
            href={`/clients?${q ? `q=${q}&` : ''}${state ? `state=${state}` : ''}`}
            className="px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{
              background: !year ? 'rgba(0,174,239,0.15)' : 'var(--surface)',
              color: !year ? 'var(--accent)' : 'var(--muted)',
              border: '1px solid var(--border)',
            }}
          >
            All Years
          </Link>
          {['2025', '2024', '2023', '2022'].map(yr => (
            <Link
              key={yr}
              href={`/clients?year=${yr}${q ? `&q=${q}` : ''}`}
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{
                background: year === yr ? 'rgba(0,174,239,0.15)' : 'var(--surface)',
                color: year === yr ? 'var(--accent)' : 'var(--muted)',
                border: '1px solid var(--border)',
              }}
            >
              {yr}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between text-sm" style={{ color: 'var(--muted)' }}>
        <span>Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total.toLocaleString()}</span>
        <div className="flex gap-2">
          {pageNum > 1 && (
            <Link href={buildUrl(pageNum - 1)}
              className="px-3 py-1 rounded-lg text-sm"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
              ← Prev
            </Link>
          )}
          <span className="px-3 py-1 rounded-lg text-sm"
            style={{ background: 'rgba(167,139,250,0.1)', color: 'var(--accent2)', border: '1px solid rgba(167,139,250,0.2)' }}>
            {pageNum} / {totalPages}
          </span>
          {pageNum < totalPages && (
            <Link href={buildUrl(pageNum + 1)}
              className="px-3 py-1 rounded-lg text-sm"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
              Next →
            </Link>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              {['Client Name', 'City', 'State', 'Year', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold"
                  style={{ color: 'var(--muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((c, i) => (
              <tr key={`${c.client_id}-${c.year}`} className="border-t"
                style={{ borderColor: 'var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--accent2)' }}>{c.name}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>{c.city ?? '—'}</td>
                <td className="px-4 py-3 text-xs">{c.state ?? '—'}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>{c.year}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/activity?client=${c.client_id}`}
                    className="text-xs px-2 py-1 rounded-md"
                    style={{ background: 'rgba(0,174,239,0.1)', color: 'var(--accent)' }}
                  >
                    Activity →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom pagination */}
      <div className="flex justify-center gap-2">
        {pageNum > 1 && (
          <Link href={buildUrl(pageNum - 1)}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
            ← Previous
          </Link>
        )}
        {pageNum < totalPages && (
          <Link href={buildUrl(pageNum + 1)}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'rgba(167,139,250,0.1)', color: 'var(--accent2)', border: '1px solid rgba(167,139,250,0.2)' }}>
            Next Page →
          </Link>
        )}
      </div>
    </div>
  )
}
