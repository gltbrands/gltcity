'use client'

import { useEffect, useState, useRef } from 'react'

interface Node { id: string; label: string; type: 'lobbyist' | 'client' | 'department'; count: number }
interface Edge { source: string; target: string; weight: number }

const TYPE_COLORS = {
  lobbyist: '#22d3ee',
  client: '#a78bfa',
  department: '#4ade80',
}

export default function NetworkPage() {
  const [data, setData] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null)
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    setLoading(true)
    const url = filter ? `/api/network?department=${encodeURIComponent(filter)}` : '/api/network'
    fetch(url)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [filter])

  const stats = data ? {
    lobbyists: data.nodes.filter(n => n.type === 'lobbyist').length,
    clients: data.nodes.filter(n => n.type === 'client').length,
    departments: data.nodes.filter(n => n.type === 'department').length,
  } : null

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-black">Network Graph</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Visual relationship map — Lobbyists → Clients → Departments
        </p>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <input
          type="search"
          placeholder="Filter by department…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="px-4 py-2 rounded-xl text-sm outline-none"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)', minWidth: 220 }}
        />
        {stats && (
          <div className="flex gap-4 text-xs">
            {[
              ['Lobbyists', stats.lobbyists, 'var(--accent)'],
              ['Clients', stats.clients, 'var(--accent2)'],
              ['Departments', stats.departments, 'var(--success)'],
            ].map(([label, count, color]) => (
              <span key={String(label)}>
                <span style={{ color: String(color) }}>●</span>{' '}
                <span style={{ color: 'var(--foreground)' }}>{count} {label}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="card flex items-center justify-center h-64">
          <p style={{ color: 'var(--muted)' }}>Loading network data…</p>
        </div>
      )}

      {data && !loading && (
        <div className="card overflow-auto" style={{ minHeight: 600 }}>
          <NetworkViz nodes={data.nodes} edges={data.edges} />
        </div>
      )}
    </div>
  )
}

function NetworkViz({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) {
  // Simple static layout — group by type horizontally
  const W = 900
  const H = 600
  const PADDING = 60

  const lobbyists = nodes.filter(n => n.type === 'lobbyist').slice(0, 30)
  const clients = nodes.filter(n => n.type === 'client').slice(0, 30)
  const departments = nodes.filter(n => n.type === 'department').slice(0, 20)

  const positions = new Map<string, { x: number; y: number }>()

  lobbyists.forEach((n, i) => {
    positions.set(n.id, { x: PADDING + 80, y: PADDING + (i * (H - PADDING * 2)) / Math.max(lobbyists.length - 1, 1) })
  })
  clients.forEach((n, i) => {
    positions.set(n.id, { x: W / 2, y: PADDING + (i * (H - PADDING * 2)) / Math.max(clients.length - 1, 1) })
  })
  departments.forEach((n, i) => {
    positions.set(n.id, { x: W - PADDING - 80, y: PADDING + (i * (H - PADDING * 2)) / Math.max(departments.length - 1, 1) })
  })

  const visibleNodeIds = new Set([...lobbyists, ...clients, ...departments].map(n => n.id))
  const visibleEdges = edges.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)).slice(0, 150)

  const maxWeight = Math.max(...edges.map(e => e.weight), 1)

  return (
    <div style={{ overflowX: 'auto' }}>
      <div className="flex gap-4 mb-4 text-xs" style={{ color: 'var(--muted)' }}>
        <span>← LOBBYISTS</span>
        <span className="flex-1 text-center">CLIENTS</span>
        <span>DEPARTMENTS →</span>
      </div>
      <svg ref={undefined} width={W} height={H} style={{ display: 'block', margin: '0 auto' }}>
        {/* Edges */}
        {visibleEdges.map((e, i) => {
          const s = positions.get(e.source)
          const t = positions.get(e.target)
          if (!s || !t) return null
          const opacity = 0.1 + (e.weight / maxWeight) * 0.4
          return (
            <line
              key={i}
              x1={s.x} y1={s.y} x2={t.x} y2={t.y}
              stroke="rgba(34,211,238,0.5)"
              strokeWidth={Math.max(0.5, (e.weight / maxWeight) * 2)}
              strokeOpacity={opacity}
            />
          )
        })}
        {/* Nodes */}
        {[...lobbyists, ...clients, ...departments].map(n => {
          const pos = positions.get(n.id)
          if (!pos) return null
          const r = Math.max(4, Math.min(10, 4 + Math.log(n.count + 1) * 2))
          return (
            <g key={n.id}>
              <circle
                cx={pos.x} cy={pos.y} r={r}
                fill={TYPE_COLORS[n.type]}
                fillOpacity={0.8}
              />
              <text
                x={pos.x} y={pos.y - r - 3}
                textAnchor="middle"
                fill="rgba(255,255,255,0.6)"
                fontSize="8"
              >
                {n.label.length > 16 ? n.label.slice(0, 14) + '…' : n.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
