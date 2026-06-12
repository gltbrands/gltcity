import { NextRequest, NextResponse } from 'next/server'
import { sodaFetch, sodaCount } from '@/lib/chicago-api'

export const dynamic = 'force-dynamic'

export type Permit = {
  id: string
  permit_: string
  permit_type: string
  review_type: string
  application_start_date: string
  issue_date: string
  processing_time: string
  street_number: string
  street_direction: string
  street_name: string
  work_description: string
  building_fee_paid: string
  zoning_district: string
  community_area: string
  ward: string
  xcoordinate: string
  ycoordinate: string
  latitude: string
  longitude: string
  contact_1_type: string
  contact_1_name: string
  contact_1_city: string
  contact_1_state: string
  total_fee: string
  reported_cost: string
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10))
  const limit = 50
  const offset = page * limit
  const q = searchParams.get('q') ?? ''
  const ward = searchParams.get('ward') ?? ''
  const type = searchParams.get('type') ?? ''
  const year = searchParams.get('year') ?? ''

  const where: string[] = []
  if (q) where.push(`upper(contact_1_name) like '%${q.toUpperCase().replace(/'/g, "''")}%' OR upper(work_description) like '%${q.toUpperCase().replace(/'/g, "''")}%'`)
  if (ward) where.push(`ward='${ward}'`)
  if (type) where.push(`upper(permit_type)='${type.toUpperCase()}'`)
  if (year) where.push(`issue_date >= '${year}-01-01T00:00:00.000' AND issue_date <= '${year}-12-31T23:59:59.999'`)

  const params = {
    $limit: limit,
    $offset: offset,
    $order: 'issue_date DESC',
    ...(where.length ? { $where: where.join(' AND ') } : {}),
  }

  try {
    const [permits, total] = await Promise.all([
      sodaFetch<Permit>('permits', params),
      sodaCount('permits', params),
    ])
    return NextResponse.json({ permits, total, page, limit })
  } catch (e) {
    console.error('permits fetch error:', e)
    return NextResponse.json({ permits: [], total: 0, page, limit })
  }
}
