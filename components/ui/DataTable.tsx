'use client'

interface Column<T> {
  key: keyof T | string
  label: string
  render?: (row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  onRowClick?: (row: T) => void
  emptyMsg?: string
}

export default function DataTable<T extends Record<string, unknown>>({
  columns, data, onRowClick, emptyMsg = 'No records found'
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
            {columns.map(col => (
              <th
                key={String(col.key)}
                className={`px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider ${col.className ?? ''}`}
                style={{ color: 'var(--muted)' }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-10" style={{ color: 'var(--muted)' }}>
                {emptyMsg}
              </td>
            </tr>
          ) : data.map((row, i) => (
            <tr
              key={i}
              onClick={() => onRowClick?.(row)}
              className="border-t transition-colors"
              style={{
                borderColor: 'var(--border)',
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                cursor: onRowClick ? 'pointer' : 'default',
              }}
              onMouseEnter={e => { if (onRowClick) (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(34,211,238,0.04)' }}
              onMouseLeave={e => { if (onRowClick) (e.currentTarget as HTMLTableRowElement).style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}
            >
              {columns.map(col => (
                <td key={String(col.key)} className={`px-4 py-3 ${col.className ?? ''}`}>
                  {col.render ? col.render(row) : String(row[col.key as keyof T] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
