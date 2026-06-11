import { sodaFetch } from '@/lib/chicago-api'
import type { Client } from '@/lib/types'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{ q?: string; year?: string; state?: string }>
}

export default async function ClientsPage({ searchParams }: PageProps) {
  const { q, year = '2025', state } = await searchParams

  const where: string[] = [`year=${year}`]
  if (q) where.push(`upper(name) like '%${q.replace(/'/g, "''").toUpperCase()}%'`)
  if (state) where.push(`state='${state}'`)

  const data = await sodaFetch<Client>('clients', {
    $limit: 500,
    $order: 'name ASC',
    $where: where.join(' AND '),
  })

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-black">Client Directory</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Entities that have hired registered lobbyists — organizations, corporations, NGOs
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <form className="flex-1 min-w-48">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search client name…"
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          />
        </form>
        <div className="flex gap-2">
          {['2025', '2024', '2023'].map(yr => (
            <Link
              key={yr}
              href={`/clients?year=${yr}${q ? `&q=${q}` : ''}`}
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

      <p className="text-sm" style={{ color: 'var(--muted)' }}>{data.length} clients</p>

      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              {['Client Name', 'City', 'State', 'Country', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold"
                  style={{ color: 'var(--muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((c, i) => (
              <tr key={c.client_id} className="border-t"
                style={{ borderColor: 'var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--accent2)' }}>{c.name}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>{c.city ?? '—'}</td>
                <td className="px-4 py-3 text-xs">{c.state ?? '—'}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>{c.country ?? '—'}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/activity?client=${c.client_id}`}
                    className="text-xs px-2 py-1 rounded-md"
                    style={{ background: 'rgba(34,211,238,0.1)', color: 'var(--accent)' }}
                  >
                    View activity
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
