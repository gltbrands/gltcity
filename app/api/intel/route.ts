import { NextRequest, NextResponse } from 'next/server'
import { sodaFetch } from '@/lib/chicago-api'
import type { LobbyistCombination, LobbyingActivity, Contribution, Compensation, Gift, ExpenditureLarge } from '@/lib/types'
import { classifyTopic, TOPICS, type TopicKey } from '@/lib/topics'

export const dynamic = 'force-dynamic'

function esc(s: string) { return s.replace(/'/g, "''").toUpperCase() }

function powerBrokerScore(compensation: number, clients: number, departments: number, contributions: number): number {
  const compScore    = Math.min(Math.log10(compensation + 1) / Math.log10(500_000) * 35, 35)
  const clientScore  = Math.min(clients / 30 * 25, 25)
  const deptScore    = Math.min(departments / 10 * 20, 20)
  const contribScore = Math.min(Math.log10(contributions + 1) / Math.log10(100_000) * 20, 20)
  return Math.round(compScore + clientScore + deptScore + contribScore)
}

export type TimelineEvent = {
  id: string
  type: 'contribution' | 'activity' | 'gift' | 'expenditure' | 'compensation'
  date: string
  amount?: number
  description: string
  subtype?: string
  recipient?: string
  department?: string
  clientName?: string
  lobbyistId?: number
  entityRef?: string
  flagged?: boolean
  proximityNote?: string
}

export type ProximityAlert = {
  severity: 'critical' | 'high' | 'medium'
  daysBetween: number
  contribDate: string
  contribAmount: number
  contribRecipient: string
  activityDate: string
  activityDept: string
  activityAction: string
  activityClient: string
  note: string
}

export type IntelResult = {
  query: string
  entityName: string
  entityType: 'lobbyist' | 'client' | 'multi'
  lobbyistId?: number
  employerName?: string
  summary: {
    totalCompensation: number
    totalContributions: number
    totalExpenditure: number
    totalGifts: number
    activityCount: number
    departments: string[]
    clients: string[]
    recipients: string[]
    topRecipients: Array<{ name: string; total: number }>
    sectorBreakdown: Partial<Record<TopicKey, number>>
    powerBrokerScore: number
    yearRange: string
    fixerIndex: number
  }
  timeline: TimelineEvent[]
  proximityAlerts: ProximityAlert[]
  relatedLobbyists: Array<{ name: string; id: number; total: number }>
  relatedClients: Array<{ name: string; id: number; count: number }>
}

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
    if (!q || q.length < 2) {
      return NextResponse.json({ error: 'query too short' }, { status: 400 })
    }

    const Q = esc(q)

    const [combos, actByClient, contribsByRecipient] = await Promise.all([
      sodaFetch<LobbyistCombination>('combinations', {
        $where: `upper(lobbyist_first_name) like '%${Q}%' OR upper(lobbyist_last_name) like '%${Q}%' OR upper(client_name) like '%${Q}%' OR upper(employer_name) like '%${Q}%'`,
        $limit: 200,
      }),
      sodaFetch<LobbyingActivity>('activity', {
        $where: `upper(client_name) like '%${Q}%'`,
        $limit: 300,
        $order: 'period_start DESC',
      }),
      sodaFetch<Contribution>('contributions', {
        $where: `upper(recipient) like '%${Q}%'`,
        $limit: 500,
        $order: 'contribution_date DESC',
      }),
    ])

    const lobbyistIds = [...new Set(combos.filter(c =>
      `${c.lobbyist_first_name} ${c.lobbyist_last_name}`.toUpperCase().includes(Q) ||
      c.lobbyist_last_name.toUpperCase().includes(Q)
    ).map(c => c.lobbyist_id))]

    const clientIds = [...new Set(combos.filter(c =>
      c.client_name.toUpperCase().includes(Q)
    ).map(c => c.client_id))]

    const isLobbyist = lobbyistIds.length > 0
    const isAlderman = contribsByRecipient.length > 0 && !isLobbyist

    const primaryLobbyistId = lobbyistIds[0] ?? null
    const primaryClientId = clientIds[0] ?? actByClient[0]?.client_id ?? null

    const whereL = primaryLobbyistId ? `lobbyist_id=${primaryLobbyistId}` : `1=0`
    const whereC = primaryClientId ? `client_id=${primaryClientId}` : `1=0`

    const [activities, contributions, compensation, gifts, expenditures] = await Promise.all([
      primaryLobbyistId
        ? sodaFetch<LobbyingActivity>('activity', { $where: whereL, $limit: 500, $order: 'period_start DESC' })
        : actByClient.slice(0, 300),
      primaryLobbyistId
        ? sodaFetch<Contribution>('contributions', { $where: whereL, $limit: 500, $order: 'contribution_date DESC' })
        : isAlderman ? contribsByRecipient : [],
      primaryLobbyistId
        ? sodaFetch<Compensation>('compensation', { $where: whereL, $limit: 300 })
        : sodaFetch<Compensation>('compensation', { $where: whereC, $limit: 300 }),
      primaryLobbyistId
        ? sodaFetch<Gift>('gifts', { $where: whereL, $limit: 200, $order: 'period_start DESC' })
        : [],
      primaryLobbyistId
        ? sodaFetch<ExpenditureLarge>('expendituresLarge', { $where: whereL, $limit: 200 })
        : sodaFetch<ExpenditureLarge>('expendituresLarge', { $where: whereC, $limit: 200 }),
    ])

    const totalComp   = compensation.reduce((s, r) => s + parseFloat(String(r.compensation_amount ?? 0)), 0)
    const totalContrib = contributions.reduce((s, r) => s + parseFloat(String(r.amount ?? 0)), 0)
    const totalExpend  = expenditures.reduce((s, r) => s + parseFloat(String(r.amount ?? 0)), 0)
    const totalGifts   = gifts.reduce((s, r) => s + parseFloat(String(r.value ?? 0)), 0)

    const departments = [...new Set(activities.map(a => a.department).filter(Boolean))]
    const clients = [...new Set(activities.map(a => a.client_name).filter(Boolean))]

    const recipientMap = new Map<string, number>()
    for (const c of contributions) {
      recipientMap.set(c.recipient, (recipientMap.get(c.recipient) ?? 0) + parseFloat(String(c.amount ?? 0)))
    }
    const topRecipients = Array.from(recipientMap.entries())
      .sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([name, total]) => ({ name, total }))

    const sectorMap = new Map<TopicKey, number>()
    for (const a of activities) {
      const topic = classifyTopic(a.department ?? '', a.action_sought ?? '')
      sectorMap.set(topic, (sectorMap.get(topic) ?? 0) + 1)
    }
    const sectorBreakdown: Partial<Record<TopicKey, number>> = {}
    for (const [k, v] of sectorMap) sectorBreakdown[k] = v

    const pbScore = powerBrokerScore(totalComp, clients.length, departments.length, totalContrib)
    const fixerIndex = Math.min(100, Math.round((departments.length * 8) + (clients.length * 2) + (sectorMap.size * 5)))

    const dates = [
      ...activities.map(a => a.period_start),
      ...contributions.map(c => c.contribution_date),
      ...compensation.map(c => c.period_start),
    ].filter(Boolean).map(d => new Date(d).getFullYear()).filter(y => y > 2000)
    const minYear = dates.length ? Math.min(...dates) : 2020
    const maxYear = dates.length ? Math.max(...dates) : 2025

    const timeline: TimelineEvent[] = []

    for (const c of contributions) {
      timeline.push({
        id: `contrib-${c.contribution_id}`,
        type: 'contribution',
        date: c.contribution_date,
        amount: parseFloat(String(c.amount ?? 0)),
        description: `Contribution to ${c.recipient}`,
        recipient: c.recipient,
        lobbyistId: c.lobbyist_id,
        entityRef: `/contributions?q=${encodeURIComponent(c.recipient)}`,
      })
    }
    for (const a of activities) {
      timeline.push({
        id: `activity-${a.lobbying_activity_id}`,
        type: 'activity',
        date: a.period_start,
        description: `Lobbied ${a.department}`,
        subtype: a.action,
        department: a.department,
        clientName: a.client_name,
        lobbyistId: a.lobbyist_id,
        entityRef: `/activity`,
      })
    }
    for (const c of compensation) {
      timeline.push({
        id: `comp-${c.compensation_id}`,
        type: 'compensation',
        date: c.period_start,
        amount: parseFloat(String(c.compensation_amount ?? 0)),
        description: `Paid by ${c.client_name}`,
        clientName: c.client_name,
        lobbyistId: c.lobbyist_id,
        entityRef: `/compensation`,
      })
    }
    for (const g of gifts) {
      timeline.push({
        id: `gift-${g.gift_id}`,
        type: 'gift',
        date: g.period_start,
        amount: parseFloat(String(g.value ?? 0)),
        description: `${g.gift} → ${g.recipient_title ?? ''} ${g.recipient_first_name} ${g.recipient_last_name}`.trim(),
        department: g.department,
        recipient: `${g.recipient_first_name} ${g.recipient_last_name}`,
        lobbyistId: g.lobbyist_id,
        entityRef: `/gifts`,
      })
    }
    for (const e of expenditures) {
      timeline.push({
        id: `expend-${e.expenditure_id}`,
        type: 'expenditure',
        date: e.expenditure_date,
        amount: parseFloat(String(e.amount ?? 0)),
        description: `${e.purpose} - ${e.recipient}`,
        recipient: e.recipient,
        clientName: e.client_name,
        lobbyistId: e.lobbyist_id,
        entityRef: `/expenditures`,
      })
    }

    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Proximity analysis
    const proximityAlerts: ProximityAlert[] = []
    const contribsWithDates = contributions.filter(c => c.contribution_date)
    const activitiesWithDates = activities.filter(a => a.period_start)

    for (const contrib of contribsWithDates) {
      const cDate = new Date(contrib.contribution_date).getTime()
      const amount = parseFloat(String(contrib.amount ?? 0))
      if (amount < 100) continue

      for (const act of activitiesWithDates) {
        const aDate = new Date(act.period_start).getTime()
        const daysBetween = (aDate - cDate) / (1000 * 60 * 60 * 24)

        if (daysBetween >= 0 && daysBetween <= 90) {
          const severity: ProximityAlert['severity'] =
            daysBetween <= 30 ? 'critical' : daysBetween <= 60 ? 'high' : 'medium'

          proximityAlerts.push({
            severity,
            daysBetween: Math.round(daysBetween),
            contribDate: contrib.contribution_date,
            contribAmount: amount,
            contribRecipient: contrib.recipient,
            activityDate: act.period_start,
            activityDept: act.department ?? '',
            activityAction: (act.action_sought ?? '').slice(0, 120),
            activityClient: act.client_name ?? '',
            note: `$${amount.toLocaleString()} → ${contrib.recipient} then ${Math.round(daysBetween)}d later lobbied ${act.department} for ${act.client_name}`,
          })

          const tContrib = timeline.find(t => t.id === `contrib-${contrib.contribution_id}`)
          const tAct = timeline.find(t => t.id === `activity-${act.lobbying_activity_id}`)
          if (tContrib) { tContrib.flagged = true; tContrib.proximityNote = `${Math.round(daysBetween)}d before ${act.department}` }
          if (tAct) { tAct.flagged = true; tAct.proximityNote = `${Math.round(daysBetween)}d after $${amount.toLocaleString()} to ${contrib.recipient}` }
        }
      }
    }

    proximityAlerts.sort((a, b) => {
      const sevOrder = { critical: 0, high: 1, medium: 2 }
      if (sevOrder[a.severity] !== sevOrder[b.severity]) return sevOrder[a.severity] - sevOrder[b.severity]
      return b.contribAmount - a.contribAmount
    })

    const relatedLobbyists = [...new Set(combos.map(c => c.lobbyist_id))]
      .filter(id => id !== primaryLobbyistId)
      .slice(0, 10)
      .map(id => {
        const c = combos.find(x => x.lobbyist_id === id)!
        const lname = `${c.lobbyist_first_name} ${c.lobbyist_last_name}`
        const total = contributions.filter(x => x.lobbyist_id === id)
          .reduce((s, x) => s + parseFloat(String(x.amount ?? 0)), 0)
        return { name: lname, id, total }
      })

    const relatedClients = [...new Set(activities.map(a => a.client_id))]
      .slice(0, 10)
      .map(id => {
        const a = activities.find(x => x.client_id === id)!
        const count = activities.filter(x => x.client_id === id).length
        return { name: a.client_name, id, count }
      })
      .sort((a, b) => b.count - a.count)

    let entityName = q
    let entityType: IntelResult['entityType'] = 'multi'
    let employerName: string | undefined

    if (isLobbyist && primaryLobbyistId) {
      const first = combos.find(c => c.lobbyist_id === primaryLobbyistId)
      if (first) {
        entityName = `${first.lobbyist_first_name} ${first.lobbyist_last_name}`
        employerName = first.employer_name
        entityType = 'lobbyist'
      }
    } else if (primaryClientId) {
      const first = actByClient[0] ?? activities[0]
      if (first) { entityName = first.client_name; entityType = 'client' }
    }

    const result: IntelResult = {
      query: q, entityName, entityType,
      lobbyistId: primaryLobbyistId ?? undefined,
      employerName,
      summary: {
        totalCompensation: Math.round(totalComp),
        totalContributions: Math.round(totalContrib),
        totalExpenditure: Math.round(totalExpend),
        totalGifts: Math.round(totalGifts),
        activityCount: activities.length,
        departments, clients,
        recipients: topRecipients.map(r => r.name),
        topRecipients, sectorBreakdown,
        powerBrokerScore: pbScore,
        yearRange: minYear === maxYear ? String(maxYear) : `${minYear}–${maxYear}`,
        fixerIndex,
      },
      timeline: timeline.slice(0, 200),
      proximityAlerts: proximityAlerts.slice(0, 50),
      relatedLobbyists,
      relatedClients,
    }

    return NextResponse.json(result)
  } catch (e) {
    console.error('intel route error:', e)
    return NextResponse.json({ error: 'Failed to load intelligence data' }, { status: 500 })
  }
}
