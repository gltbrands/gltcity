import { sodaFetch } from '@/lib/chicago-api'
import type { LobbyistCombination } from '@/lib/types'
import Link from 'next/link'
import { Suspense } from 'react'

interface PageProps {
  searchParams: Promise<{ q?: string; year?: string }>
}

async function LobbyistGrid({ q, year }: { q?: string; year: string }) {
  const where: string[] = [`year=${year}`]
  if (q) {
    const esc = q.replace(/'/g, "''").toUpperCase()
    where.push(
      `(upper(lobbyist_first_name) like '%${esc}%' OR upper(lobbyist_last_name) like '%${esc}%' OR upper(employer_name) like '%${esc}%' OR upper(client_name) like '%${esc}%')`
    )
  }

  const data = await sodaFetch<LobbyistCombination>('combinations', {
    $limit: 500,
    $where: where.join(' AND '),
    $order: 'lobbyist_last_name ASC',
  })

  // Deduplicate: one card per lobbyist_id
  const map = new Map<number, { combo: LobbyistCombination; employers: Set<string>; clients: Set<string> }>()
  for (const row of data) {
    const ex = map.get(row.lobbyist_id)
    if (ex) { ex.employers.add(row.employer_name); ex.clients.add(row.client_name) }
    else map.set(row.lobbyist_id, { combo: row, employers: new Set([row.employer_name]), clients: new Set([row.client_name]) })
  }

  const lobbyists = Array.from(map.values())

  return (
    <>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>{lobbyists.length} lobbyists found</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
        {lobbyists.map(({ combo, employers, clients }) => (
          <Link
            key={combo.lobbyist_id}
            href={`/lobbyists/${combo.lobbyist_id}`}
            className="card hover:scale-[1.01] transition-all block"
            style={{ textDecoration: 'none' }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-sm" style={{ color: 'var(--accent)' }}>
                  {combo.lobbyist_first_name} {combo.lobbyist_last_name}
                </p>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted)' }}>
                  {Array.from(employers).join(', ')}
                </p>
              </div>
              <span className="badge badge-low shrink-0">{clients.size} client{clients.size !== 1 ? 's' : ''}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {Array.from(clients).slice(0, 3).map(c => (
                <span key={c} className="text-xs px-2 py-0.5 rounded-full truncate max-w-[160px]"
                  style={{ background: 'rgba(34,211,238,0.08)', color: 'var(--accent)', border: '1px solid rgba(34,211,238,0.2)' }}>
                  {c}
                </span>
              ))}
              {clients.size > 3 && (
                <span className="text-xs" style={{ color: 'var(--muted)' }}>+{clients.size - 3} more</span>
              )}
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

      <div className="flex gap-3 items-center">
        <form className="flex-1 max-w-md">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search lobbyist, firm, or client…"
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          />
        </form>
        <div className="flex gap-2">
          {['2025', '2024', '2023', '2022'].map(yr => (
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

      <Suspense fallback={<p style={{ color: 'var(--muted)' }}>Loading lobbyists…</p>}>
        <LobbyistGrid q={q} year={year} />
      </Suspense>
    </div>
  )
}
