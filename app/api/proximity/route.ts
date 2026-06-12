import { NextRequest, NextResponse } from 'next/server'
import { sodaFetch } from '@/lib/chicago-api'
import type { Contribution, LobbyingActivity } from '@/lib/types'

export const dynamic = 'force-dynamic'

export type ProximityCase = {
  id: string
  severity: 'critical' | 'high' | 'medium'
  daysBetween: number
  lobbyistId: number
  lobbyistName: string
  contribDate: string
  contribAmount: number
  contribRecipient: string
  activityDate: string
  activityDept: string
  activityAction: string
  activityClient: string
  suspicionScore: number
}

export async function GET(req: NextRequest) {
  try {
    const year = req.nextUrl.searchParams.get('year') ?? '2025'
    const window = parseInt(req.nextUrl.searchParams.get('window') ?? '90')

    // Use period_start / contribution_date range - not a 'year' field (doesn't exist on these datasets)
    const yearWhere = `period_start >= '${year}-01-01T00:00:00.000' AND period_start <= '${year}-12-31T23:59:59.999'`
    const contribWhere = `contribution_date >= '${year}-01-01T00:00:00.000' AND contribution_date <= '${year}-12-31T23:59:59.999' AND amount > 250`

    const [contributions, activities] = await Promise.all([
      sodaFetch<Contribution>('contributions', {
        $where: contribWhere,
        $limit: 5000,
        $order: 'contribution_date DESC',
      }),
      sodaFetch<LobbyingActivity>('activity', {
        $where: `${yearWhere} AND department IS NOT NULL`,
        $limit: 8000,
        $order: 'period_start DESC',
      }),
    ])

    const contribsByLobbyist = new Map<number, Contribution[]>()
    for (const c of contributions) {
      const arr = contribsByLobbyist.get(c.lobbyist_id) ?? []
      arr.push(c)
      contribsByLobbyist.set(c.lobbyist_id, arr)
    }

    const activitiesByLobbyist = new Map<number, LobbyingActivity[]>()
    for (const a of activities) {
      const arr = activitiesByLobbyist.get(a.lobbyist_id) ?? []
      arr.push(a)
      activitiesByLobbyist.set(a.lobbyist_id, arr)
    }

    const cases: ProximityCase[] = []

    for (const [lobbyistId, contribs] of contribsByLobbyist) {
      const acts = activitiesByLobbyist.get(lobbyistId)
      if (!acts?.length) continue

      const lobbyistName = `${contribs[0].lobbyist_first_name} ${contribs[0].lobbyist_last_name}`

      for (const contrib of contribs) {
        if (!contrib.contribution_date) continue
        const cDate = new Date(contrib.contribution_date).getTime()
        const amount = parseFloat(String(contrib.amount ?? 0))

        for (const act of acts) {
          if (!act.period_start) continue
          const aDate = new Date(act.period_start).getTime()
          const daysBetween = (aDate - cDate) / (1000 * 60 * 60 * 24)

          if (daysBetween >= 0 && daysBetween <= window) {
            const severity: ProximityCase['severity'] =
              daysBetween <= 30 ? 'critical' : daysBetween <= 60 ? 'high' : 'medium'

            const suspicionScore = Math.round(
              (amount / 500) * (1 - daysBetween / window) * 100
            )
            if (suspicionScore < 5) continue

            cases.push({
              id: `${contrib.contribution_id}-${act.lobbying_activity_id}`,
              severity,
              daysBetween: Math.round(daysBetween),
              lobbyistId,
              lobbyistName,
              contribDate: contrib.contribution_date,
              contribAmount: amount,
              contribRecipient: contrib.recipient,
              activityDate: act.period_start,
              activityDept: act.department ?? '',
              activityAction: (act.action_sought ?? '').slice(0, 150),
              activityClient: act.client_name ?? '',
              suspicionScore,
            })
          }
        }
      }
    }

    const deduplicated = new Map<number, ProximityCase>()
    for (const c of cases.sort((a, b) => b.suspicionScore - a.suspicionScore)) {
      const key = parseInt(c.id.split('-')[0])
      if (!deduplicated.has(key)) deduplicated.set(key, c)
    }

    const results = Array.from(deduplicated.values())
      .sort((a, b) => {
        const sevOrder = { critical: 0, high: 1, medium: 2 }
        if (sevOrder[a.severity] !== sevOrder[b.severity]) return sevOrder[a.severity] - sevOrder[b.severity]
        return b.suspicionScore - a.suspicionScore
      })
      .slice(0, 200)

    return NextResponse.json({
      year, window,
      total: results.length,
      critical: results.filter(r => r.severity === 'critical').length,
      high: results.filter(r => r.severity === 'high').length,
      medium: results.filter(r => r.severity === 'medium').length,
      cases: results,
    })
  } catch (e) {
    console.error('proximity route error:', e)
    return NextResponse.json({ year: '2025', window: 90, total: 0, critical: 0, high: 0, medium: 0, cases: [] })
  }
}
