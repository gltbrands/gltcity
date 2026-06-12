import { NextResponse } from 'next/server'
import { sodaFetch } from '@/lib/chicago-api'
import type { Gift, Contribution, LobbyingActivity, ExpenditureLarge, AnomalyAlert } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [gifts, contributions, activity, expenditures] = await Promise.all([
    sodaFetch<Gift>('gifts', { $limit: 1000, $order: 'period_start DESC' }),
    sodaFetch<Contribution>('contributions', { $limit: 2000, $order: 'contribution_date DESC' }),
    sodaFetch<LobbyingActivity>('activity', { $limit: 2000, $order: 'period_start DESC' }),
    sodaFetch<ExpenditureLarge>('expendituresLarge', { $limit: 1000, $order: 'expenditure_date DESC' }),
  ])

  const alerts: AnomalyAlert[] = []

  // 1. Quid-pro-quo: lobbyist contributed to recipient AND lobbied their dept in same quarter
  const contribByLobbyist = new Map<number, Contribution[]>()
  for (const c of contributions) {
    const arr = contribByLobbyist.get(c.lobbyist_id) ?? []
    arr.push(c)
    contribByLobbyist.set(c.lobbyist_id, arr)
  }

  const activityByLobbyist = new Map<number, LobbyingActivity[]>()
  for (const a of activity) {
    const arr = activityByLobbyist.get(a.lobbyist_id) ?? []
    arr.push(a)
    activityByLobbyist.set(a.lobbyist_id, arr)
  }

  for (const [lid, contribs] of contribByLobbyist) {
    const acts = activityByLobbyist.get(lid) ?? []
    for (const contrib of contribs) {
      const contribPeriod = contrib.period_start?.slice(0, 7)
      for (const act of acts) {
        const actPeriod = act.period_start?.slice(0, 7)
        if (contribPeriod === actPeriod && contrib.recipient && act.department) {
          alerts.push({
            id: `qpq-${contrib.contribution_id}-${act.lobbying_activity_id}`,
            type: 'quid_pro_quo',
            severity: contrib.amount >= 1000 ? 'high' : 'medium',
            title: 'Contribution & Lobbying in Same Quarter',
            description: `${contrib.lobbyist_first_name} ${contrib.lobbyist_last_name} contributed $${contrib.amount} to "${contrib.recipient}" while lobbying ${act.department} for ${act.client_name} in the same reporting period.`,
            lobbyist_name: `${contrib.lobbyist_first_name} ${contrib.lobbyist_last_name}`,
            client_name: act.client_name,
            department: act.department,
            amount: contrib.amount,
            date: contrib.contribution_date,
            entities: [
              `${contrib.lobbyist_first_name} ${contrib.lobbyist_last_name}`,
              contrib.recipient,
              act.department,
              act.client_name,
            ],
          })
        }
      }
    }
  }

  // 2. Gift-to-lobby timing: gift to dept official within 90 days of lobbying that dept
  for (const gift of gifts) {
    const giftDate = new Date(gift.period_start)
    const giftDept = gift.department?.toUpperCase()
    if (!giftDept) continue

    for (const act of activity) {
      if (act.lobbyist_id !== gift.lobbyist_id) continue
      const actDate = new Date(act.period_start)
      const diffDays = Math.abs((actDate.getTime() - giftDate.getTime()) / 86400000)
      if (diffDays <= 90 && act.department?.toUpperCase().includes(giftDept.split(' ')[0])) {
        alerts.push({
          id: `gift-${gift.gift_id}-${act.lobbying_activity_id}`,
          type: 'gift_timing',
          severity: gift.value >= 100 ? 'high' : 'medium',
          title: 'Gift to Official Near Lobbying Event',
          description: `${gift.lobbyist_firstname} ${gift.lobbyist_lastname} gave ${gift.gift} ($${gift.value}) to ${gift.recipient_title} ${gift.recipient_first_name} ${gift.recipient_last_name} (${gift.department}) within 90 days of lobbying ${act.department} for ${act.client_name}.`,
          lobbyist_name: `${gift.lobbyist_firstname} ${gift.lobbyist_lastname}`,
          client_name: act.client_name,
          department: gift.department,
          amount: gift.value,
          date: gift.period_start,
          entities: [
            `${gift.lobbyist_firstname} ${gift.lobbyist_lastname}`,
            `${gift.recipient_first_name} ${gift.recipient_last_name}`,
            gift.department,
          ],
        })
        break
      }
    }
  }

  // 3. Event/fundraiser expenditures (dark money pattern)
  const darkMoney = expenditures.filter(e =>
    e.purpose && /event|fundrais|reception|gala|dinner|sponsor/i.test(e.purpose)
  )
  for (const exp of darkMoney) {
    alerts.push({
      id: `dm-${exp.expenditure_id}`,
      type: 'dark_money',
      severity: exp.amount >= 1000 ? 'high' : 'low',
      title: 'Event/Fundraiser Expenditure',
      description: `${exp.lobbyist_first_name} ${exp.lobbyist_last_name} spent $${exp.amount} on "${exp.purpose}" for client ${exp.client_name}. Recipient: ${exp.recipient}.`,
      lobbyist_name: `${exp.lobbyist_first_name} ${exp.lobbyist_last_name}`,
      client_name: exp.client_name,
      amount: exp.amount,
      date: exp.expenditure_date,
      entities: [
        `${exp.lobbyist_first_name} ${exp.lobbyist_last_name}`,
        exp.client_name,
        exp.recipient,
      ],
    })
  }

  // Sort by severity then deduplicate to top 100
  const sorted = alerts
    .sort((a, b) => {
      const sev = { high: 0, medium: 1, low: 2 }
      return sev[a.severity] - sev[b.severity]
    })
    .slice(0, 100)

  return NextResponse.json(sorted)
}
