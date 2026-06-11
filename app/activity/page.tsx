import { sodaFetch } from '@/lib/chicago-api'
import type { LobbyingActivity } from '@/lib/types'
import { formatDate } from '@/lib/chicago-api'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{ q?: string; department?: string; action?: string }>
}

export default async function ActivityPage({ searchParams }: PageProps) {
  const { q, department, action } = await searchParams

  const where: string[] = []
  if (q) {
    const esc = q.replace(/'/g, "''").toUpperCase()
    where.push(`(upper(action_sought) like '%${esc}%' OR upper(department) like '%${esc}%' OR upper(client_name) like '%${esc}%')`)
  }
  if (department) where.push(`upper(department) like '%${department.toUpperCase()}%'`)
  if (action) where.push(`action='${action}'`)

  const data = await sodaFetch<LobbyingActivity>('activity', {
    $limit: 200,
    $order: 'period_start DESC',
    ...(where.length ? { $where: where.join(' AND ') } : {}),
  })

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-black">Lobbying Activity</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          All lobbying actions reported quarterly to the Board of Ethics
        </p>
      </div>

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
        <div className="flex gap-2">
          {['', 'Legislative', 'Administrative', 'Both'].map(a => (
            <Link
              key={a}
              href={`/activity?${q ? `q=${q}&` : ''}${a ? `action=${a}` : ''}`}
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{
                background: action === a || (!action && !a) ? 'rgba(34,211,238,0.15)' : 'var(--surface)',
                color: action === a || (!action && !a) ? 'var(--accent)' : 'var(--muted)',
                border: '1px solid var(--border)',
              }}
            >
              {a || 'All'}
            </Link>
          ))}
        </div>
      </div>

      <p className="text-sm" style={{ color: 'var(--muted)' }}>{data.length} records</p>

      <div className="space-y-2">
        {data.map((a, i) => (
          <div key={i} className="flex items-start gap-4 p-4 rounded-xl"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="shrink-0 w-16">
              <span className={`badge badge-${(a.action ?? '').toLowerCase().replace(' ', '')}`}>
                {a.action === 'Both' ? 'BOTH' : (a.action ?? '').slice(0, 3).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold">{a.client_name}</p>
                <p className="text-xs shrink-0" style={{ color: 'var(--muted)' }}>{formatDate(a.period_start)}</p>
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--accent)' }}>
                📍 {a.department}
              </p>
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
    </div>
  )
}
