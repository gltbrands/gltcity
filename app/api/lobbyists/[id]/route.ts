import { NextRequest, NextResponse } from 'next/server'
import { sodaFetch } from '@/lib/chicago-api'
import type {
  LobbyistCombination, LobbyingActivity, Compensation,
  Contribution, Gift, ExpenditureLarge
} from '@/lib/types'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const lobbyistId = parseInt(id)

  const [combos, activities, compensation, contributions, gifts, expenditures] = await Promise.all([
    sodaFetch<LobbyistCombination>('combinations', { $where: `lobbyist_id=${lobbyistId}`, $limit: 500 }),
    sodaFetch<LobbyingActivity>('activity', { $where: `lobbyist_id=${lobbyistId}`, $limit: 500, $order: 'period_start DESC' }),
    sodaFetch<Compensation>('compensation', { $where: `lobbyist_id=${lobbyistId}`, $limit: 500 }),
    sodaFetch<Contribution>('contributions', { $where: `lobbyist_id=${lobbyistId}`, $limit: 500 }),
    sodaFetch<Gift>('gifts', { $where: `lobbyist_id=${lobbyistId}`, $limit: 500 }),
    sodaFetch<ExpenditureLarge>('expendituresLarge', { $where: `lobbyist_id=${lobbyistId}`, $limit: 500 }),
  ])

  const first = combos[0]

  return NextResponse.json({
    lobbyist_id: lobbyistId,
    name: first ? `${first.lobbyist_first_name} ${first.lobbyist_last_name}` : `Lobbyist #${id}`,
    employers: [...new Set(combos.map(c => c.employer_name))],
    clients: [...new Set(combos.map(c => c.client_name))],
    years: [...new Set(combos.map(c => c.year))].sort((a, b) => b - a),
    activities,
    compensation,
    contributions,
    gifts,
    expenditures,
    totals: {
      compensation: compensation.reduce((s, r) => s + parseFloat(String(r.compensation_amount ?? 0)), 0),
      contributions: contributions.reduce((s, r) => s + parseFloat(String(r.amount ?? 0)), 0),
      expenditures: expenditures.reduce((s, r) => s + parseFloat(String(r.amount ?? 0)), 0),
      gifts: gifts.reduce((s, r) => s + parseFloat(String(r.value ?? 0)), 0),
    },
  })
}
