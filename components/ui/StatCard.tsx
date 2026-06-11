interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: string
  icon?: string
}

export default function StatCard({ label, value, sub, accent = 'var(--accent)', icon }: StatCardProps) {
  return (
    <div className="card flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
          {label}
        </span>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <div className="text-2xl font-bold mt-1" style={{ color: accent }}>
        {value}
      </div>
      {sub && <div className="text-xs" style={{ color: 'var(--muted)' }}>{sub}</div>}
    </div>
  )
}
