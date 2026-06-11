export default function PermitsPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-black">Building Permits</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Chicago Department of Buildings permit data — Phase 2
        </p>
      </div>
      <div className="card p-10 text-center">
        <p className="text-4xl mb-4">🔨</p>
        <p className="font-bold text-lg mb-2">Coming in Phase 2</p>
        <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--muted)' }}>
          Building permits dataset integration is planned for the next release. This will cross-reference permit applicants with lobbyist clients, map approvals by ward and alderman, and show permit velocity by zone and project type.
        </p>
        <div className="mt-6 p-4 rounded-xl text-left max-w-md mx-auto" style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.15)' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--accent)' }}>Datasets planned:</p>
          <ul className="text-xs space-y-1" style={{ color: 'var(--muted)' }}>
            <li>• Building Permits (ydr8-5enu)</li>
            <li>• Building Violations (22u3-xenr)</li>
            <li>• Certificate of Occupancy</li>
            <li>• Business Licenses (r5kz-chrr)</li>
            <li>• TIF Districts boundary data</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
