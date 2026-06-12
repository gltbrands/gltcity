'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'

interface Node {
  id: string; label: string; type: 'lobbyist' | 'client' | 'department'
  count: number; lobbyistId?: number
  x: number; y: number; vx: number; vy: number; fx?: number; fy?: number
}
interface Edge { source: string; target: string; weight: number }

const TYPE_COLORS = {
  lobbyist:   { fill: '#00AEEF', stroke: '#0072b5', label: 'Lobbyist' },
  client:     { fill: '#a78bfa', stroke: '#7c3aed', label: 'Client' },
  department: { fill: '#4ade80', stroke: '#16a34a', label: 'Department' },
}

const W = 900
const H = 620

function initPositions(nodes: Node[]): Node[] {
  const lobbyists = nodes.filter(n => n.type === 'lobbyist')
  const clients   = nodes.filter(n => n.type === 'client')
  const depts     = nodes.filter(n => n.type === 'department')

  const place = (arr: Node[], cx: number, cy: number, radius: number) => {
    arr.forEach((n, i) => {
      const angle = (i / Math.max(arr.length, 1)) * 2 * Math.PI
      n.x = cx + radius * Math.cos(angle) + (Math.random() - 0.5) * 20
      n.y = cy + radius * Math.sin(angle) + (Math.random() - 0.5) * 20
      n.vx = 0; n.vy = 0
    })
  }
  place(lobbyists, W * 0.22, H / 2, H * 0.38)
  place(clients,   W * 0.5,  H / 2, H * 0.38)
  place(depts,     W * 0.78, H / 2, H * 0.32)
  return nodes
}

export default function NetworkPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef   = useRef<number | null>(null)
  const nodesRef  = useRef<Node[]>([])
  const edgesRef  = useRef<Edge[]>([])
  const [graphData, setGraphData] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null)
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [hovered, setHovered] = useState<Node | null>(null)
  const [selected, setSelected] = useState<Node | null>(null)
  const [dragging, setDragging] = useState<Node | null>(null)
  const [typeFilter, setTypeFilter] = useState<'all' | 'lobbyist' | 'client' | 'department'>('all')

  useEffect(() => {
    setLoading(true)
    const url = filter ? `/api/network?department=${encodeURIComponent(filter)}` : '/api/network'
    fetch(url)
      .then(r => r.json())
      .then((d: { nodes: Omit<Node,'x'|'y'|'vx'|'vy'>[]; edges: Edge[] }) => {
        const nodes: Node[] = d.nodes.map(n => ({ ...n, x: 0, y: 0, vx: 0, vy: 0 }))
        initPositions(nodes)
        nodesRef.current = nodes
        edgesRef.current = d.edges
        setGraphData({ nodes, edges: d.edges })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [filter])

  const tick = useCallback(() => {
    const nodes = nodesRef.current
    const edges = edgesRef.current
    if (!nodes.length) return

    const alpha = 0.08
    const repulsion = 1800
    const spring = 0.04
    const idealLen = 140
    const damping = 0.85

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j]
        const dx = b.x - a.x, dy = b.y - a.y
        const dist = Math.sqrt(dx*dx + dy*dy) || 1
        const force = repulsion / (dist * dist)
        const fx = dx/dist * force, fy = dy/dist * force
        if (!a.fx) { a.vx -= fx * alpha; a.vy -= fy * alpha }
        if (!b.fx) { b.vx += fx * alpha; b.vy += fy * alpha }
      }
    }

    const nodeMap = new Map(nodes.map(n => [n.id, n]))
    for (const e of edges.slice(0, 300)) {
      const a = nodeMap.get(e.source), b = nodeMap.get(e.target)
      if (!a || !b) continue
      const dx = b.x - a.x, dy = b.y - a.y
      const dist = Math.sqrt(dx*dx + dy*dy) || 1
      const force = spring * (dist - idealLen)
      const fx = dx/dist * force, fy = dy/dist * force
      if (!a.fx) { a.vx += fx; a.vy += fy }
      if (!b.fx) { b.vx -= fx; b.vy -= fy }
    }

    for (const n of nodes) {
      if (n.fx !== undefined) { n.x = n.fx; n.y = n.fy!; continue }
      n.vx += (W/2 - n.x) * 0.003
      n.vy += (H/2 - n.y) * 0.003
      n.vx *= damping; n.vy *= damping
      n.x = Math.max(30, Math.min(W-30, n.x + n.vx))
      n.y = Math.max(30, Math.min(H-30, n.y + n.vy))
    }
  }, [])

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const nodes = nodesRef.current
    const edges = edgesRef.current

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#0a0f1a'
    ctx.fillRect(0, 0, W, H)

    const nodeMap = new Map(nodes.map(n => [n.id, n]))
    const maxWeight = Math.max(...edges.map(e => e.weight), 1)
    const visFilter = typeFilter !== 'all'

    for (const e of edges.slice(0, 400)) {
      const a = nodeMap.get(e.source), b = nodeMap.get(e.target)
      if (!a || !b) continue
      if (visFilter && a.type !== typeFilter && b.type !== typeFilter) continue
      const opacity = 0.05 + (e.weight / maxWeight) * 0.3
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.strokeStyle = `rgba(0,174,239,${opacity})`
      ctx.lineWidth = Math.max(0.5, (e.weight / maxWeight) * 2.5)
      ctx.stroke()
    }

    for (const n of nodes) {
      if (visFilter && n.type !== typeFilter) {
        ctx.beginPath()
        ctx.arc(n.x, n.y, 3, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.08)'
        ctx.fill()
        continue
      }
      const colors = TYPE_COLORS[n.type]
      const isHov = hovered?.id === n.id
      const isSel = selected?.id === n.id
      const r = Math.max(5, Math.min(18, 5 + Math.log(n.count + 1) * 2.5))

      if (isHov || isSel) {
        ctx.beginPath()
        ctx.arc(n.x, n.y, r + 8, 0, Math.PI * 2)
        ctx.fillStyle = `${colors.fill}25`
        ctx.fill()
      }

      ctx.beginPath()
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
      ctx.fillStyle = isSel ? '#fff' : colors.fill
      ctx.globalAlpha = 0.85
      ctx.fill()
      ctx.strokeStyle = colors.stroke
      ctx.lineWidth = isSel ? 2.5 : 1
      ctx.stroke()
      ctx.globalAlpha = 1

      if (isHov || isSel || r > 12) {
        const lbl = n.label.length > 20 ? n.label.slice(0, 18) + '…' : n.label
        ctx.font = `${isSel ? 'bold ' : ''}10px monospace`
        ctx.fillStyle = isHov || isSel ? '#fff' : 'rgba(255,255,255,0.55)'
        ctx.textAlign = 'center'
        ctx.fillText(lbl, n.x, n.y - r - 5)
      }
    }
  }, [hovered, selected, typeFilter])

  useEffect(() => {
    if (!graphData) return
    let stopped = false
    let ticks = 0
    function loop() {
      if (stopped) return
      tick()
      render()
      ticks++
      if (ticks < 300 || dragging) {
        animRef.current = requestAnimationFrame(loop)
      } else { render() }
    }
    animRef.current = requestAnimationFrame(loop)
    return () => { stopped = true; if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [graphData, tick, render, dragging])

  useEffect(() => { render() }, [hovered, selected, typeFilter, render])

  function getNodeAt(x: number, y: number): Node | null {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const scaleX = W / rect.width, scaleY = H / rect.height
    const cx = (x - rect.left) * scaleX, cy = (y - rect.top) * scaleY
    for (const n of nodesRef.current) {
      const r = Math.max(8, Math.min(18, 5 + Math.log(n.count + 1) * 2.5))
      if ((n.x - cx)**2 + (n.y - cy)**2 <= (r + 4)**2) return n
    }
    return null
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (dragging) {
      const rect = canvasRef.current!.getBoundingClientRect()
      dragging.fx = (e.clientX - rect.left) * (W / rect.width)
      dragging.fy = (e.clientY - rect.top)  * (H / rect.height)
      render()
    } else {
      setHovered(getNodeAt(e.clientX, e.clientY))
    }
  }
  function handleMouseDown(e: React.MouseEvent) {
    const n = getNodeAt(e.clientX, e.clientY)
    if (n) { setDragging(n); setSelected(n) }
  }
  function handleMouseUp() {
    if (dragging) { dragging.fx = undefined; dragging.fy = undefined }
    setDragging(null)
  }
  function handleClick(e: React.MouseEvent) {
    const n = getNodeAt(e.clientX, e.clientY)
    setSelected(prev => (n?.id === prev?.id ? null : n))
  }

  const stats = graphData ? {
    lobbyists: graphData.nodes.filter(n => n.type === 'lobbyist').length,
    clients:   graphData.nodes.filter(n => n.type === 'client').length,
    depts:     graphData.nodes.filter(n => n.type === 'department').length,
  } : null

  return (
    <div className="space-y-4 max-w-6xl">
      <div>
        <h1 className="text-2xl font-black">Network Graph</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Force-directed relationship map. Drag nodes to explore. Click to select + investigate.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="search"
          placeholder="Filter by department…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="px-4 py-2 rounded-xl text-sm outline-none"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)', minWidth: 200 }}
        />
        <div className="flex gap-1">
          {(['all', 'lobbyist', 'client', 'department'] as const).map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                background: typeFilter === t ? (t === 'all' ? 'rgba(0,174,239,0.15)' : `${TYPE_COLORS[t as keyof typeof TYPE_COLORS]?.fill}22`) : 'var(--surface)',
                color: typeFilter === t ? (t === 'all' ? 'var(--accent)' : TYPE_COLORS[t as keyof typeof TYPE_COLORS]?.fill) : 'var(--muted)',
                border: '1px solid var(--border)',
              }}>
              {t === 'all' ? 'All' : TYPE_COLORS[t].label + 's'}
            </button>
          ))}
        </div>
        {stats && (
          <div className="flex gap-3 text-xs ml-2">
            {[
              ['Lobbyists', stats.lobbyists, '#00AEEF'],
              ['Clients', stats.clients, '#a78bfa'],
              ['Depts', stats.depts, '#4ade80'],
            ].map(([label, count, color]) => (
              <span key={String(label)}>
                <span style={{ color: String(color) }}>●</span>{' '}
                <span style={{ color: 'var(--foreground)' }}>{count} {label}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="card p-0 overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10"
            style={{ background: 'rgba(10,15,26,0.8)' }}>
            <p style={{ color: 'var(--muted)' }}>Building network graph…</p>
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{ width: '100%', height: 'auto', display: 'block', cursor: dragging ? 'grabbing' : hovered ? 'pointer' : 'default' }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleClick}
        />
        <div className="absolute bottom-3 left-3 flex gap-3 text-xs px-3 py-2 rounded-lg"
          style={{ background: 'rgba(10,15,26,0.85)' }}>
          {Object.entries(TYPE_COLORS).map(([type, colors]) => (
            <span key={type} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: colors.fill }} />
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>{colors.label}</span>
            </span>
          ))}
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>· Drag to explore</span>
        </div>
      </div>

      {selected && (
        <div className="card" style={{ borderColor: `${TYPE_COLORS[selected.type].fill}44` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ background: TYPE_COLORS[selected.type].fill }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: TYPE_COLORS[selected.type].fill }}>
                {selected.type}
              </span>
              <h3 className="text-base font-bold text-white">{selected.label}</h3>
            </div>
            <button onClick={() => setSelected(null)} className="text-xs px-2 py-1 rounded" style={{ color: 'var(--muted)' }}>✕</button>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{selected.count} connection{selected.count !== 1 ? 's' : ''}</p>
          <div className="flex gap-2 mt-2">
            <Link href={`/intel?q=${encodeURIComponent(selected.label)}`}
              className="text-xs px-3 py-1.5 rounded-lg font-medium"
              style={{ background: 'rgba(0,174,239,0.1)', color: 'var(--accent)' }}>
              🔍 Investigate in Intel
            </Link>
            {selected.type === 'lobbyist' && selected.lobbyistId && (
              <Link href={`/lobbyists/${selected.lobbyistId}`}
                className="text-xs px-3 py-1.5 rounded-lg font-medium"
                style={{ background: 'rgba(0,174,239,0.06)', color: 'var(--muted)' }}>
                Full Profile →
              </Link>
            )}
            {selected.type === 'client' && (
              <Link href={`/clients?q=${encodeURIComponent(selected.label)}`}
                className="text-xs px-3 py-1.5 rounded-lg font-medium"
                style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa' }}>
                Client Record →
              </Link>
            )}
            {selected.type === 'department' && (
              <Link href={`/departments?q=${encodeURIComponent(selected.label)}`}
                className="text-xs px-3 py-1.5 rounded-lg font-medium"
                style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}>
                Dept Activity →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
