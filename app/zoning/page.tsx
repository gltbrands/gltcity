export default function ZoningPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-black">Zoning & Ward Map</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Chicago ward boundaries, zoning classes, and geographic lobbying intensity. Phase 2.
        </p>
      </div>
      <div className="card p-10 text-center">
        <p className="text-4xl mb-4">🗺</p>
        <p className="font-bold text-lg mb-2">Interactive Map: Coming in Phase 2</p>
        <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--muted)' }}>
          The ward map will overlay lobbying activity intensity on Chicago's 50 wards, show aldermanic voting patterns on development, and allow parcel-level zoning lookups cross-referenced with who's been lobbying each department.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 max-w-lg mx-auto text-left">
          {[
            ['50 Wards', 'Alderman name, tenure, voting record'],
            ['Zoning Classes', 'Current designation by parcel'],
            ['TIF Districts', '144+ active districts, $ captured'],
            ['Lobbying Heatmap', 'Activity density by geography'],
          ].map(([title, desc]) => (
            <div key={title} className="p-3 rounded-lg" style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.15)' }}>
              <p className="text-xs font-bold" style={{ color: 'var(--accent)' }}>{title}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
