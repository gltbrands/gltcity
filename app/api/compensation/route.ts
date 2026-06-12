import { NextRequest, NextResponse } from 'next/server'
import { sodaFetch } from '@/lib/chicago-api'
import type { Compensation } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const lobbyist = searchParams.get('lobbyist')
  const client = searchParams.get('client')
  const limit = parseInt(searchParams.get('limit') ?? '500')

  const where: string[] = []
  if (lobbyist) where.push(`lobbyist_id=${lobbyist}`)
  if (client) where.push(`client_id=${client}`)

  const data = await sodaFetch<Compensation>('compensation', {
    $limit: limit,
    $order: 'period_start DESC',
    ...(where.length ? { $where: where.join(' AND ') } : {}),
  })

  return NextResponse.json(data)
}
