import { NextRequest, NextResponse } from 'next/server'
import { sodaFetch } from '@/lib/chicago-api'
import type { Gift } from '@/lib/types'

export const revalidate = 3600

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const department = searchParams.get('department')
  const lobbyist = searchParams.get('lobbyist')
  const limit = parseInt(searchParams.get('limit') ?? '500')

  const where: string[] = []
  if (department) {
    const esc = department.replace(/'/g, "''").toUpperCase()
    where.push(`upper(department) like '%${esc}%'`)
  }
  if (lobbyist) where.push(`lobbyist_id=${lobbyist}`)

  const data = await sodaFetch<Gift>('gifts', {
    $limit: limit,
    $order: 'period_start DESC',
    ...(where.length ? { $where: where.join(' AND ') } : {}),
  })

  return NextResponse.json(data)
}
