export const dynamic = 'force-dynamic'
import { sodaFetch } from '@/lib/chicago-api'
import type { LobbyingActivity } from '@/lib/types'

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function DepartmentsPage({ searchParams }: PageProps) {
  const { q } = await searchParams

  const where = q
    ? [`upper(department) like '%${q.replace(/'/g, "''").toUpperCase()}%'`]
    : ["department IS NOT NULL AND department != ''"]

  let rawDepts: { department: string; cnt: string }[] = []
  let topActivity: LobbyingActivity[] = []
  try {
    ;[rawDepts, topActivity] = await Promise.all([
      sodaFetch<{ department: string; cnt: string }>('activity', {
        $select: 'department, count(*) as cnt',
        $group: 'department',
        $order: 'cnt DESC',
        $limit: 500,
        $where: where.join(' AND '),
      }),
      sodaFetch<LobbyingActivity>('activity', {
        $limit: 200,
        $order: 'period_start DESC',
      }),
    ])
  } catch (e) { console.error('departments fetch error:', e) }

  const deptActivity = new Map<string, LobbyingActivity[]>()
  for (const a of topActivity) {
    if (!a.department) continue
    const arr = deptActivity.get(a.department) ?? []
    arr.push(a)
    deptActivity.set(a.department, arr)
  }

  const maxCount = parseInt(rawDepts[0]?.cnt ?? '1', 10)

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-black">City Departments</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Which departments get lobbied most, and on what issues
        </p>
      </div>

      <form>
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Filter departments…"
          className="w-full max-w-md px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
        />
      </form>

      <div className="space-y-3">
        {rawDepts.map(({ department, cnt }) => {
          const count = parseInt(cnt, 10)
          const pct = (count / maxCount) * 100
          const recentActs = (deptActivity.get(department) ?? []).slice(0, 3)

          return (
            <div key={department} className="card">
              <div className="flex items-center justify-between gap-4 mb-2">
                <p className="font-semibold">{department}</p>
                <span className="font-mono text-sm shrink-0" style={{ color: 'var(--accent)' }}>{count.toLocaleString()} activities</span>
              </div>
              <div className="w-full rounded-full h-1.5 mb-3" style={{ background: 'var(--border)' }}>
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{ width: `${pct}%`, background: 'var(--accent)' }}
                />
              </div>
              {recentActs.length > 0 && (
                <div className="space-y-1">
                  {recentActs.map((a, i) => (
                    <p key={i} className="text-xs" style={{ color: 'var(--muted)' }}>
                      • {a.client_name}: {a.action_sought?.slice(0, 100)}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
