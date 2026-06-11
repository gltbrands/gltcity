import { sodaFetch, sodaCount, formatDate } from '@/lib/chicago-api'
import type { LobbyingActivity } from '@/lib/types'
import Link from 'next/link'

const PAGE_SIZE = 100

interface PageProps {
  searchParams: Promise<{ q?: string; department?: string; action?: string; page?: string; year?: string }>
}

export default async function ActivityPage({ searchParams }: PageProps) {
  const { q, department, action, page = '1', year } = await searchParams
  const pageNum = Math.max(1, parseInt(page, 10))
  const offset = (pageNum - 1) * PAGE_SIZE

  const where: string[] = []
  if (q) {
    const esc = q.replace(/'/g, "''").toUpperCase()
    where.push(`(upper(action_sought) like '%${esc}%' OR upper(department) like '%${esc}%' OR upper(client_name) like '%${esc}%')`)
  }
  if (department) where.push(`upper(department) like '%${department.toUpperCase()}%'`)
  if (action) where.push(`action='${action}'`)
  if (year) where.push(`period_start >= '${year}-01-01' AND period_start <= '${year}-12-31'`)

  const whereStr = where.length ? where.join(' AND ') : undefined

  const [data, total] = await Promise.all([
    sodaFetch<LobbyingActivity>('activity', {
      $limit: PAGE_SIZE,
      $offset: offset,
      $order: 'period_start DESC',
      ...(whereStr ? { $where: whereStr } : {}),
    }),
    sodaCount('activity', whereStr),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const buildUrl = (p: number) => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (department) params.set('department', department)
    if (action) params.set('action', action)
    if (year) params.set('year', year)
    params.set('page', String(p))
    return `/activity?${params.toString()}`
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-black">Lobbying Activity</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          <span className="font-semibold" style={{ color: 'var(--foreground)' }}>{total.toLocaleString()}</span> lobbying actions on record — reported quarterly to the Board of Ethics
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <form className="flex-1 min-w-48">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search department, client, or action…"
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          />
        </form>
        <div className="flex gap-2 flex-wrap">
          {['', 'Legislative', 'Administrative', 'Both'].map(a => (
            <Link
              key={a}
              href={`/activity?${new URLSearchParams({ ...(q ? { q } : {}), ...(department ? { department } : {}), ...(year ? { year } : {}), ...(a ? { action: a } : {}) }).toString()}`}
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{
                background: action === a || (!action && !a) ? 'rgba(34,211,238,0.15)' : 'var(--surface)',
                color: action === a || (!action && !a) ? 'var(--accent)' : 'var(--muted)',
                border: '1px solid var(--border)',
              }}
            >
              {a || 'All Actions'}
            </Link>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href={`/activity?${new URLSearchParams({ ...(q ? { q } : {}), ...(action ? { action } : {}), ...(department ? { department } : {}) }).toString()}`}
            className="px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{
              background: !year ? 'rgba(167,139,250,0.15)' : 'var(--surface)',
              color: !year ? 'var(--accent2)' : 'var(--muted)',
              border: '1px solid var(--border)',
            }}
          >
            All Years
          </Link>
          {['2025', '2024', '2023', '2022', '2021'].map(yr => (
            <Link
              key={yr}
              href={`/activity?${new URLSearchParams({ ...(q ? { q } : {}), ...(action ? { action } : {}), ...(department ? { department } : {}), year: yr }).toString()}`}
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{
                background: year === yr ? 'rgba(167,139,250,0.15)' : 'var(--surface)',
                color: year === yr ? 'var(--accent2)' : 'var(--muted)',
                border: '1px solid var(--border)',
              }}
            >
              {yr}
            </Link>
          ))}
        </div>
      </div>

      {/* Pagination info */}
      <div className="flex items-center justify-between text-sm" style={{ color: 'var(--muted)' }}>
        <span>Showing {(offset + 1).toLocaleString()}–{Math.min(offset + PAGE_SIZE, total).toLocaleString()} of {total.toLocaleString()}</span>
        <div className="flex gap-2">
          {pageNum > 1 && (
            <Link href={buildUrl(pageNum - 1)}
              className="px-3 py-1 rounded-lg text-sm"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
              ← Prev
            </Link>
          )}
          <span className="px-3 py-1 text-xs rounded-lg"
            style={{ background: 'rgba(34,211,238,0.08)', color: 'var(--accent)' }}>
            Page {pageNum} of {totalPages.toLocaleString()}
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

      {/* Records */}
      <div className="space-y-2">
        {data.map((a, i) => (
          <div key={i} className="flex items-start gap-4 p-4 rounded-xl"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="shrink-0">
              <span className={`badge badge-${(a.action ?? '').toLowerCase().replace(' ', '')}`}>
                {a.action === 'Both' ? 'BOTH' : (a.action ?? '').slice(0, 3).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold">{a.client_name}</p>
                <p className="text-xs shrink-0" style={{ color: 'var(--muted)' }}>{formatDate(a.period_start)}</p>
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--accent)' }}>📍 {a.department}</p>
              <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>{a.action_sought}</p>
              <Link href={`/lobbyists/${a.lobbyist_id}`}>
                <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--accent2)' }}>
                  👤 {a.lobbyist_first_name} {a.lobbyist_last_name}
                </p>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom pagination */}
      <div className="flex justify-center gap-3 pt-2">
        {pageNum > 1 && (
          <Link href={buildUrl(pageNum - 1)}
            className="px-5 py-2 rounded-xl text-sm font-medium"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
            ← Previous
          </Link>
        )}
        {pageNum < totalPages && (
          <Link href={buildUrl(pageNum + 1)}
            className="px-5 py-2 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(34,211,238,0.1)', color: 'var(--accent)', border: '1px solid rgba(34,211,238,0.2)' }}>
            Next Page →
          </Link>
        )}
      </div>
    </div>
  )
}
