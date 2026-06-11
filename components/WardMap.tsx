'use client'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState, useMemo } from 'react'
import L from 'leaflet'
import Link from 'next/link'

interface Ward {
  ward: number
  alderman: string
  alderman_raw: string
  address: string
  city: string
  state: string
  zipcode: string
  phone: string
  email: string
  website: string
  photo_link: string
  lat: number | null
  lng: number | null
  geom: GeoJSON.MultiPolygon | GeoJSON.Polygon
}

const CHICAGO_CENTER: L.LatLngExpression = [41.8375, -87.6866]
const DEFAULT_ZOOM = 11

function wardColor(ward: number, selected: boolean, hovered: boolean) {
  if (selected) return '#22d3ee'
  if (hovered) return '#38bdf8'
  // Alternate subtle colors by ward range
  if (ward <= 10) return '#0ea5e9'
  if (ward <= 20) return '#818cf8'
  if (ward <= 30) return '#34d399'
  if (ward <= 40) return '#f472b6'
  return '#fb923c'
}

export default function WardMap({ wards }: { wards: Ward[] }) {
  const mapRef = useRef<L.Map | null>(null)
  const layerRefs = useRef<Map<number, L.GeoJSON>>(new Map())
  const [selected, setSelected] = useState<number | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [contributions, setContributions] = useState<{ recipient: string; total: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedWard = useMemo(() => wards.find(w => w.ward === selected), [wards, selected])

  // Compute polygon centroid for flyTo
  function centroid(ward: Ward): L.LatLngExpression | null {
    try {
      const geom = ward.geom
      const coords = geom.type === 'MultiPolygon'
        ? (geom as GeoJSON.MultiPolygon).coordinates[0][0]
        : (geom as GeoJSON.Polygon).coordinates[0]
      if (!coords?.length) return null
      const lats = coords.map(c => c[1])
      const lngs = coords.map(c => c[0])
      return [
        lats.reduce((a, b) => a + b, 0) / lats.length,
        lngs.reduce((a, b) => a + b, 0) / lngs.length,
      ]
    } catch { return null }
  }

  // Init map once
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return
    const map = L.map(containerRef.current, {
      center: CHICAGO_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
    })
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map)
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  // Add/update ward polygons when wards or selection changes
  useEffect(() => {
    const map = mapRef.current
    if (!map || !wards.length) return

    // Clear existing layers
    layerRefs.current.forEach(layer => map.removeLayer(layer))
    layerRefs.current.clear()

    for (const ward of wards) {
      const isSelected = ward.ward === selected
      const isHovered = ward.ward === hovered

      const layer = L.geoJSON(ward.geom as GeoJSON.GeoJsonObject, {
        style: {
          fillColor: wardColor(ward.ward, isSelected, isHovered),
          fillOpacity: isSelected ? 0.55 : isHovered ? 0.3 : 0.18,
          color: isSelected ? '#22d3ee' : 'rgba(255,255,255,0.25)',
          weight: isSelected ? 2.5 : 1,
        },
      })

      layer.on('click', () => setSelected(ward.ward === selected ? null : ward.ward))
      layer.on('mouseover', () => setHovered(ward.ward))
      layer.on('mouseout', () => setHovered(null))

      // Tooltip
      layer.bindTooltip(
        `<div style="background:#111827;border:1px solid #1e293b;border-radius:6px;padding:6px 10px;color:#e2e8f0;font-size:12px;font-weight:600">
          Ward ${ward.ward} · ${ward.alderman}
        </div>`,
        { sticky: true, opacity: 1, className: 'leaflet-tooltip-custom' }
      )

      layer.addTo(map)
      layerRefs.current.set(ward.ward, layer)
    }
  }, [wards, selected, hovered])

  // Fly to selected ward
  useEffect(() => {
    if (!selected || !mapRef.current) return
    const ward = wards.find(w => w.ward === selected)
    if (!ward) return
    const c = centroid(ward)
    if (c) mapRef.current.flyTo(c, 13, { duration: 0.8 })
    // Fetch contribution data for this alderman
    const lastName = ward.alderman_raw.split(',')[0]?.trim()
    if (lastName) {
      fetch(`/api/contributions?recipient=${encodeURIComponent(lastName)}&limit=200`)
        .then(r => r.json())
        .then((data: Array<{ recipient: string; amount: number }>) => {
          const total = data.reduce((s, c) => s + parseFloat(String(c.amount ?? 0)), 0)
          if (total > 0) setContributions({ recipient: lastName, total })
        })
        .catch(() => {})
    }
  }, [selected, wards])

  const filtered = useMemo(() =>
    wards.filter(w =>
      !search ||
      w.alderman.toLowerCase().includes(search.toLowerCase()) ||
      String(w.ward).includes(search)
    ),
    [wards, search]
  )

  return (
    <div className="flex h-full" style={{ background: 'var(--background)' }}>
      {/* Left panel */}
      <div
        className="flex flex-col shrink-0 overflow-hidden"
        style={{ width: 280, borderRight: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        {/* Header */}
        <div className="px-4 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-black text-base">
            <span style={{ color: 'var(--accent)' }}>50 Wards</span>
            <span className="text-white"> · Chicago</span>
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Click a name or ward polygon to select</p>
        </div>

        {/* Search */}
        <div className="px-3 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <input
            type="search"
            placeholder="Search alderman or ward #…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.map(ward => (
            <button
              key={ward.ward}
              onClick={() => setSelected(ward.ward === selected ? null : ward.ward)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all border-b"
              style={{
                borderColor: 'var(--border)',
                background: selected === ward.ward ? 'rgba(34,211,238,0.1)' : 'transparent',
                borderLeft: selected === ward.ward ? '3px solid var(--accent)' : '3px solid transparent',
              }}
            >
              <div
                className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black"
                style={{
                  background: selected === ward.ward ? 'rgba(34,211,238,0.2)' : 'rgba(255,255,255,0.06)',
                  color: wardColor(ward.ward, selected === ward.ward, false),
                }}
              >
                {ward.ward}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: selected === ward.ward ? 'var(--accent)' : 'var(--foreground)' }}>
                  {ward.alderman}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>Ward {ward.ward}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Map + info panel */}
      <div className="flex-1 flex flex-col relative">
        {/* Info panel slides up when selected */}
        {selectedWard && (
          <div
            className="absolute bottom-0 left-0 right-0 z-[1000] p-4"
            style={{ background: 'rgba(17,24,39,0.97)', borderTop: '1px solid var(--border)', backdropFilter: 'blur(8px)' }}
          >
            <div className="flex items-start gap-4 max-w-4xl">
              {selectedWard.photo_link && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedWard.photo_link}
                  alt={selectedWard.alderman}
                  className="w-16 h-16 rounded-xl object-cover shrink-0"
                  style={{ border: '2px solid var(--accent)' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(34,211,238,0.15)', color: 'var(--accent)' }}>
                    Ward {selectedWard.ward}
                  </span>
                  <h3 className="font-black text-base text-white">{selectedWard.alderman}</h3>
                  <button onClick={() => setSelected(null)} className="ml-auto text-xs px-2 py-1 rounded" style={{ color: 'var(--muted)' }}>✕</button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <p style={{ color: 'var(--muted)' }}>Office</p>
                    <p className="mt-0.5">{selectedWard.address}</p>
                    <p style={{ color: 'var(--muted)' }}>{selectedWard.city}, {selectedWard.state} {selectedWard.zipcode}</p>
                  </div>
                  <div>
                    <p style={{ color: 'var(--muted)' }}>Phone</p>
                    <p className="mt-0.5">{selectedWard.phone || '—'}</p>
                  </div>
                  <div>
                    <p style={{ color: 'var(--muted)' }}>Email</p>
                    <a href={`mailto:${selectedWard.email}`} className="mt-0.5 block truncate" style={{ color: 'var(--accent)' }}>
                      {selectedWard.email || '—'}
                    </a>
                  </div>
                  <div>
                    <p style={{ color: 'var(--muted)' }}>Links</p>
                    <div className="flex gap-2 mt-0.5 flex-wrap">
                      {selectedWard.website && (
                        <a href={selectedWard.website} target="_blank" rel="noopener noreferrer"
                          className="px-2 py-0.5 rounded text-xs" style={{ background: 'rgba(34,211,238,0.1)', color: 'var(--accent)' }}>
                          Website
                        </a>
                      )}
                      <Link href={`/contributions?q=${encodeURIComponent(selectedWard.alderman_raw.split(',')[0] ?? '')}`}
                        className="px-2 py-0.5 rounded text-xs" style={{ background: 'rgba(251,191,36,0.1)', color: 'var(--warn)' }}>
                        Contributions
                      </Link>
                      <Link href={`/gifts?department=city council`}
                        className="px-2 py-0.5 rounded text-xs" style={{ background: 'rgba(248,113,113,0.1)', color: 'var(--danger)' }}>
                        Gifts
                      </Link>
                      <Link href={`/activity?department=city+council`}
                        className="px-2 py-0.5 rounded text-xs" style={{ background: 'rgba(167,139,250,0.1)', color: 'var(--accent2)' }}>
                        Activity
                      </Link>
                    </div>
                    {contributions && (
                      <p className="text-xs mt-1" style={{ color: 'var(--warn)' }}>
                        💰 ~${contributions.total.toLocaleString(undefined, { maximumFractionDigits: 0 })} in lobbyist contributions
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Map container */}
        <div ref={containerRef} className="flex-1" style={{ minHeight: 400 }} />
      </div>
    </div>
  )
}
