import { NextResponse } from 'next/server'
import { sodaCount, sodaFetch } from '@/lib/chicago-api'
import type { Compensation, Contribution, ExpenditureLarge } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [
    lobbyistCount,
    clientCount,
    activityCount,
    compensation,
    contributions,
    expenditures,
  ] = await Promise.all([
    sodaCount('combinations', 'year=2025'),
    sodaCount('clients', 'year=2025'),
    sodaCount('activity'),
    sodaFetch<Compensation>('compensation', { $select: 'sum(compensation_amount) as total' }),
    sodaFetch<Contribution>('contributions', { $select: 'sum(amount) as total' }),
    sodaFetch<ExpenditureLarge>('expendituresLarge', { $select: 'sum(amount) as total' }),
  ])

  return NextResponse.json({
    lobbyists: lobbyistCount,
    clients: clientCount,
    activities: activityCount,
    totalCompensation: parseFloat((compensation[0] as any)?.total ?? '0'),
    totalContributions: parseFloat((contributions[0] as any)?.total ?? '0'),
    totalExpenditures: parseFloat((expenditures[0] as any)?.total ?? '0'),
  })
}
