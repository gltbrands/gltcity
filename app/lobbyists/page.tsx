export const dynamic = 'force-dynamic'
import { sodaFetch } from '@/lib/chicago-api'
import Link from 'next/link'
import { Suspense } from 'react'

interface PageProps {
  searchParams: Promise<{ q?: string; year?: string }>
}

interface LobbyistRow {
  lobbyist_id: string
  lobbyist_first_name: string
  lobbyist_last_name: string
  employer_name: string
  client_count: string
}

async function LobbyistGrid({ q, year }: { q?: string; year: string }) {
  const where: string[] = [`year=${year}`]
  if (q) {
    const esc = q.replace(/'/g, "''").toUpperCase()
    where.push(
      `(upper(lobbyist_first_name) like '%${esc}%' OR upper(lobbyist_last_name) like '%${esc}%' OR upper(employer_name) like '%${esc}%' OR upper(client_name) like '%${esc}%')`
    )
  }

  // Group by lobbyist to get one row per person with client count
  const data = await sodaFetch<LobbyistRow>('combinations', {
    $select: 'lobbyist_id, lobbyist_first_name, lobbyist_last_name, employer_name, count(distinct client_id) as client_count',
    $group: 'lobbyist_id, lobbyist_first_name, lobbyist_last_name, employer_name',
    $where: where.join(' AND '),
    $order: 'lobbyist_last_name ASC',
    $limit: 2000,
  })

  // Merge rows with same lobbyist_id (can have multiple employer rows)
  const map = new Map<string, { first: LobbyistRow; employers: Set<string>; clientCount: number }>()
  for (const row of data) {
    const ex = map.get(row.lobbyist_id)
    if (ex) {
      ex.employers.add(row.employer_name)
      ex.clientCount = Math.max(ex.clientCount, parseInt(row.client_count, 10))
    } else {
      map.set(row.lobbyist_id, {
        first: row,
        employers: new Set([row.employer_name]),
        clientCount: parseInt(row.client_count, 10),
      })
    }
  }

  const lobbyists = Array.from(map.values()).sort((a, b) =>
    a.first.lobbyist_last_name.localeCompare(b.first.lobbyist_last_name)
  )

  return (
    <>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>
        <span className="font-semibold" style={{ color: 'var(--foreground)' }}>{lobbyists.length}</span> lobbyists registered in {year}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mt-3">
        {lobbyists.map(({ first, employers, clientCount }) => (
          <Link
            key={first.lobbyist_id}
            href={`/lobbyists/${first.lobbyist_id}`}
            className="card hover:scale-[1.01] transition-all block"
            style={{ textDecoration: 'none' }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-sm" style={{ color: 'var(--accent)' }}>
                  {first.lobbyist_first_name} {first.lobbyist_last_name}
                </p>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted)' }}>
                  {Array.from(employers).join(' · ')}
                </p>
              </div>
              <span className="badge badge-low shrink-0">{clientCount} client{clientCount !== 1 ? 's' : ''}</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}

export default async function LobbyistsPage({ searchParams }: PageProps) {
  const { q, year = '2025' } = await searchParams

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-black">Lobbyist Registry</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          All registered lobbyists — search by name, employer, or client
        </p>
      </div>

      <div className="flex gap-3 items-center flex-wrap">
        <form className="flex-1 min-w-52 max-w-md">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search lobbyist, firm, or client…"
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          />
        </form>
        <div className="flex gap-2 flex-wrap">
          {['2025', '2024', '2023', '2022', '2021', '2020'].map(yr => (
            <Link
              key={yr}
              href={`/lobbyists?year=${yr}${q ? `&q=${q}` : ''}`}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: year === yr ? 'rgba(34,211,238,0.15)' : 'var(--surface)',
                color: year === yr ? 'var(--accent)' : 'var(--muted)',
                border: '1px solid var(--border)',
              }}
            >
              {yr}
            </Link>
          ))}
        </div>
      </div>

      <Suspense fallback={
        <div className="flex items-center gap-3" style={{ color: 'var(--muted)' }}>
          <div className="animate-spin w-4 h-4 border-2 rounded-full" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          Loading lobbyists…
        </div>
      }>
        <LobbyistGrid q={q} year={year} />
      </Suspense>
    </div>
  )
}
