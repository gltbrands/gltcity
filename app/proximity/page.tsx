'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const SEV_COLOR = { critical: '#ef4444', high: '#f97316', medium: '#fbbf24' } as const
const SEV_BG = {
  critical: 'rgba(239,68,68,0.07)',
  high: 'rgba(249,115,22,0.07)',
  medium: 'rgba(251,191,36,0.07)',
} as const

type ProximityCase = {
  id: string; severity: 'critical' | 'high' | 'medium'
  daysBetween: number; lobbyistId: number; lobbyistName: string
  contribDate: string; contribAmount: number; contribRecipient: string
  activityDate: string; activityDept: string; activityAction: string
  activityClient: string; suspicionScore: number
}
type ProximityData = {
  year: string; window: number; total: number
  critical: number; high: number; medium: number
  cases: ProximityCase[]
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmt(n: number) { return `$${n.toLocaleString()}` }

export default function ProximityPage() {
  const [year, setYear] = useState('2025')
  const [win, setWin] = useState('90')
  const [severity, setSeverity] = useState('')
  const [data, setData] = useState<ProximityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(false)
    fetch(`/api/proximity?year=${year}&window=${win}`)
      .then(r => r.json())
      .then((d: ProximityData) => { setData(d); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [year, win])

  const filtered = data?.cases.filter(c => !severity || c.severity === severity) ?? []

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-black">
          <span style={{ color: '#ef4444' }}>⏱</span> Proximity Alerts
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Contributions followed by lobbying activity within the same time window, by the same lobbyist.
          A 30-year insider calls this "the circuit." Short windows with large amounts are the signal.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1">
          {['2025', '2024', '2023', '2022'].map(y => (
            <button key={y} onClick={() => setYear(y)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{
                background: year === y ? 'rgba(0,174,239,0.15)' : 'var(--surface)',
                color: year === y ? 'var(--accent)' : 'var(--muted)',
                border: '1px solid var(--border)',
              }}>
              {y}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {[['30', '30-Day'], ['60', '60-Day'], ['90', '90-Day']].map(([w, label]) => (
            <button key={w} onClick={() => setWin(w)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{
                background: win === w ? 'rgba(239,68,68,0.15)' : 'var(--surface)',
                color: win === w ? '#ef4444' : 'var(--muted)',
                border: '1px solid var(--border)',
              }}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {[['', 'All'], ['critical', '🔴 Critical'], ['high', '🟠 High'], ['medium', '🟡 Medium']].map(([s, label]) => (
            <button key={s} onClick={() => setSeverity(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                background: severity === s ? 'rgba(255,255,255,0.1)' : 'var(--surface)',
                color: severity === s ? 'var(--foreground)' : 'var(--muted)',
                border: '1px solid var(--border)',
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Alerts', value: data.total, color: 'var(--foreground)' },
            { label: 'Critical (≤30d)', value: data.critical, color: '#ef4444' },
            { label: 'High (≤60d)', value: data.high, color: '#f97316' },
            { label: 'Medium (≤90d)', value: data.medium, color: '#fbbf24' },
          ].map(s => (
            <div key={s.label} className="card">
              <p className="text-xs" style={{ color: 'var(--muted)' }}>{s.label}</p>
              <p className="text-2xl font-black mt-1" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="card flex items-center gap-3 py-8 justify-center">
          <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: '#ef4444', borderTopColor: 'transparent' }} />
          <span style={{ color: 'var(--muted)' }}>Scanning contribution-to-lobbying windows…</span>
        </div>
      )}

      {error && (
        <div className="card py-8 text-center" style={{ color: 'var(--danger)' }}>
          Failed to load proximity data. Try refreshing.
        </div>
      )}

      {!loading && !error && (
        <>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Showing {filtered.length} cases · Sorted by severity then suspicion score
          </p>
          <div className="space-y-3">
            {filtered.map(c => (
              <div key={c.id} className="card"
                style={{ background: SEV_BG[c.severity], border: `1px solid ${SEV_COLOR[c.severity]}2a` }}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold uppercase"
                      style={{ background: `${SEV_COLOR[c.severity]}22`, color: SEV_COLOR[c.severity] }}>
                      {c.severity}
                    </span>
                    <span className="text-xs font-bold" style={{ color: SEV_COLOR[c.severity] }}>
                      {c.daysBetween}d window
                    </span>
                    <Link href={`/lobbyists/${c.lobbyistId}`}
                      className="text-sm font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                      {c.lobbyistName}
                    </Link>
                    <Link href={`/intel?q=${encodeURIComponent(c.lobbyistName)}`}
                      className="text-xs px-2 py-0.5 rounded"
                      style={{ background: 'rgba(0,174,239,0.1)', color: 'var(--accent)' }}>
                      Investigate →
                    </Link>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold" style={{ color: '#fbbf24' }}>{fmt(c.contribAmount)}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>score: {c.suspicionScore}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div className="px-3 py-2 rounded-lg" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)' }}>
                    <p className="font-bold mb-0.5" style={{ color: '#fbbf24' }}>💰 CONTRIBUTION · {fmtDate(c.contribDate)}</p>
                    <p>{fmt(c.contribAmount)} → <span style={{ color: 'var(--foreground)' }}>{c.contribRecipient}</span></p>
                  </div>
                  <div className="px-3 py-2 rounded-lg" style={{ background: 'rgba(0,174,239,0.06)', border: '1px solid rgba(0,174,239,0.15)' }}>
                    <p className="font-bold mb-0.5" style={{ color: 'var(--accent)' }}>📋 ACTIVITY · {fmtDate(c.activityDate)}</p>
                    <p style={{ color: 'var(--foreground)' }}>{c.activityDept}</p>
                    <p className="mt-0.5" style={{ color: 'var(--muted)' }}>Client: {c.activityClient}</p>
                  </div>
                </div>

                {c.activityAction && (
                  <p className="text-xs mt-2 italic" style={{ color: 'var(--muted)' }}>
                    "{c.activityAction.slice(0, 160)}{c.activityAction.length > 160 ? '…' : ''}"
                  </p>
                )}
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="card text-center py-10" style={{ color: 'var(--muted)' }}>
                No proximity cases found for the selected filters.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
