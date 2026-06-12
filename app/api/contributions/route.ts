import { NextRequest, NextResponse } from 'next/server'
import { sodaFetch } from '@/lib/chicago-api'
import type { Contribution } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const lobbyist = searchParams.get('lobbyist')
  const recipient = searchParams.get('recipient')
  const minAmount = searchParams.get('min')
  const limit = parseInt(searchParams.get('limit') ?? '500')

  const where: string[] = []
  if (lobbyist) where.push(`lobbyist_id=${lobbyist}`)
  if (recipient) {
    const esc = recipient.replace(/'/g, "''").toUpperCase()
    where.push(`upper(recipient) like '%${esc}%'`)
  }
  if (minAmount) where.push(`amount>=${minAmount}`)

  const data = await sodaFetch<Contribution>('contributions', {
    $limit: limit,
    $order: 'contribution_date DESC',
    ...(where.length ? { $where: where.join(' AND ') } : {}),
  })

  return NextResponse.json(data)
}
