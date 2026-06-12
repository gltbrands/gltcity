import { NextResponse } from 'next/server'
import { sodaFetch } from '@/lib/chicago-api'

export const dynamic = 'force-dynamic'

export async function GET() {
  const data = await sodaFetch<{ department: string; cnt: string }>('activity', {
    $select: 'department, count(*) as cnt',
    $group: 'department',
    $order: 'cnt DESC',
    $limit: 100,
    $where: "department IS NOT NULL AND department != ''",
  })

  return NextResponse.json(data.map(d => ({
    department: d.department,
    count: parseInt(d.cnt, 10),
  })))
}
