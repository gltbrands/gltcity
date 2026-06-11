import { NextRequest, NextResponse } from 'next/server'
import { sodaFetch } from '@/lib/chicago-api'
import type { ExpenditureLarge, ExpenditureSmall } from '@/lib/types'

export const revalidate = 3600

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const lobbyist = searchParams.get('lobbyist')
  const client = searchParams.get('client')
  const purpose = searchParams.get('purpose')
  const limit = parseInt(searchParams.get('limit') ?? '500')

  const where: string[] = []
  if (lobbyist) where.push(`lobbyist_id=${lobbyist}`)
  if (client) where.push(`client_id=${client}`)
  if (purpose) {
    const esc = purpose.replace(/'/g, "''").toUpperCase()
    where.push(`upper(purpose) like '%${esc}%'`)
  }

  const [large, small] = await Promise.all([
    sodaFetch<ExpenditureLarge>('expendituresLarge', {
      $limit: limit,
      $order: 'expenditure_date DESC',
      ...(where.length ? { $where: where.join(' AND ') } : {}),
    }),
    sodaFetch<ExpenditureSmall>('expendituresSmall', {
      $limit: Math.min(limit, 200),
      $order: 'period_start DESC',
      ...(where.length ? { $where: where.join(' AND ') } : {}),
    }),
  ])

  return NextResponse.json({ large, small })
}
