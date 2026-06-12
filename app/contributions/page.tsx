export const dynamic = 'force-dynamic'
import { sodaFetch } from '@/lib/chicago-api'
import type { Contribution } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/chicago-api'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{ q?: string; min?: string; year?: string }>
}

export default async function ContributionsPage({ searchParams }: PageProps) {
  const { q, min, year = '2025' } = await searchParams

  const where: string[] = [
    `contribution_date >= '${year}-01-01T00:00:00.000' AND contribution_date <= '${year}-12-31T23:59:59.999'`,
  ]
  if (q) {
    const esc = q.replace(/'/g, "''").toUpperCase()
    where.push(`(upper(recipient) like '%${esc}%' OR upper(lobbyist_first_name) like '%${esc}%' OR upper(lobbyist_last_name) like '%${esc}%')`)
  }
  if (min) where.push(`amount>=${min}`)

  let data: Contribution[] = []
  try {
    data = await sodaFetch<Contribution>('contributions', {
      $limit: 2000,
      $order: 'contribution_date DESC',
      $where: where.join(' AND '),
    })
  } catch (e) { console.error('contributions fetch error:', e) }

  const total = data.reduce((s, r) => s + parseFloat(String(r.amount ?? 0)), 0)

  const recipientMap = new Map<string, number>()
  for (const c of data) {
    recipientMap.set(c.recipient, (recipientMap.get(c.recipient) ?? 0) + parseFloat(String(c.amount ?? 0)))
  }
  const topRecipients = Array.from(recipientMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const merged: Record<string, string | undefined> = { year, ...(q ? { q } : {}), ...(min ? { min } : {}), ...overrides }
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(merged)) { if (v) params.set(k, v) }
    return `/contributions?${params.toString()}`
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-black">Political Contributions</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Contributions by registered lobbyists to City of Chicago candidates & political committees
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card col-span-2">
          <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{year} Total</p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--warn)' }}>{formatCurrency(total)}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{data.length} transactions</p>
        </div>
        <div className="card col-span-2">
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>Top Recipients</p>
          {topRecipients.map(([name, amt]) => (
            <div key={name} className="flex justify-between text-xs py-0.5">
              <span className="truncate mr-2">{name}</span>
              <span className="font-mono shrink-0" style={{ color: 'var(--warn)' }}>{formatCurrency(amt)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 items-center flex-wrap">
        <form className="flex-1 min-w-52 max-w-md">
          <input
            type="search" name="q" defaultValue={q}
            placeholder="Search recipient or lobbyist…"
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          />
        </form>
        <div className="flex gap-2 flex-wrap">
          {['2025', '2024', '2023', '2022'].map(yr => (
            <Link key={yr} href={buildHref({ year: yr, min })}
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
        <div className="flex gap-2 flex-wrap">
          {[['', 'Any $'], ['500', '$500+'], ['1000', '$1k+'], ['5000', '$5k+']].map(([val, label]) => (
            <Link key={val} href={buildHref({ min: val || undefined })}
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{
                background: (min ?? '') === val ? 'rgba(251,191,36,0.15)' : 'var(--surface)',
                color: (min ?? '') === val ? 'var(--warn)' : 'var(--muted)',
                border: '1px solid var(--border)',
              }}>
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              {['Date', 'Lobbyist', 'Recipient', 'Amount'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold"
                  style={{ color: 'var(--muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((c, i) => (
              <tr key={i} className="border-t"
                style={{ borderColor: 'var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>{formatDate(c.contribution_date)}</td>
                <td className="px-4 py-3">
                  <Link href={`/lobbyists/${c.lobbyist_id}`} style={{ color: 'var(--accent)' }}>
                    {c.lobbyist_first_name} {c.lobbyist_last_name}
                  </Link>
                </td>
                <td className="px-4 py-3">{c.recipient}</td>
                <td className="px-4 py-3 font-mono" style={{ color: 'var(--warn)' }}>{formatCurrency(c.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
