export const revalidate = 3600
import { sodaFetch } from '@/lib/chicago-api'
import type { Gift, Contribution, LobbyingActivity, ExpenditureLarge, AnomalyAlert } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/chicago-api'
import Link from 'next/link'

const TYPE_LABELS: Record<string, string> = {
  quid_pro_quo: 'Quid Pro Quo',
  gift_timing: 'Gift Near Lobbying',
  dark_money: 'Event/Fundraiser Spend',
  volume_spike: 'Volume Spike',
  concentration: 'Network Concentration',
}

const TYPE_ICONS: Record<string, string> = {
  quid_pro_quo: '🔗',
  gift_timing: '🎁',
  dark_money: '🌑',
  volume_spike: '📈',
  concentration: '🕸',
}

async function buildAlerts(): Promise<AnomalyAlert[]> {
  const [gifts, contributions, activity, expenditures] = await Promise.all([
    sodaFetch<Gift>('gifts', { $limit: 2000, $order: 'period_start DESC' }),
    sodaFetch<Contribution>('contributions', { $limit: 10000, $order: 'contribution_date DESC' }),
    sodaFetch<LobbyingActivity>('activity', { $limit: 5000, $order: 'period_start DESC' }),
    sodaFetch<ExpenditureLarge>('expendituresLarge', { $limit: 5000, $order: 'expenditure_date DESC' }),
  ])

  const alerts: AnomalyAlert[] = []

  const actByLobbyist = new Map<number, LobbyingActivity[]>()
  for (const a of activity) {
    const arr = actByLobbyist.get(a.lobbyist_id) ?? []
    arr.push(a)
    actByLobbyist.set(a.lobbyist_id, arr)
  }

  // Quid pro quo
  for (const c of contributions) {
    const acts = actByLobbyist.get(c.lobbyist_id) ?? []
    const cPeriod = c.period_start?.slice(0, 7)
    for (const a of acts) {
      if (a.period_start?.slice(0, 7) === cPeriod) {
        alerts.push({
          id: `qpq-${c.contribution_id}-${a.lobbying_activity_id}`,
          type: 'quid_pro_quo',
          severity: parseFloat(String(c.amount)) >= 1000 ? 'high' : 'medium',
          title: 'Contribution & Lobbying Same Quarter',
          description: `${c.lobbyist_first_name} ${c.lobbyist_last_name} gave $${c.amount} to "${c.recipient}" in the same quarter they lobbied ${a.department} for ${a.client_name}.`,
          lobbyist_name: `${c.lobbyist_first_name} ${c.lobbyist_last_name}`,
          client_name: a.client_name,
          department: a.department,
          amount: parseFloat(String(c.amount)),
          date: c.contribution_date,
          entities: [c.recipient, a.department, a.client_name],
        })
        break
      }
    }
  }

  // Gift timing
  for (const g of gifts) {
    const acts = actByLobbyist.get(g.lobbyist_id) ?? []
    const gDate = new Date(g.period_start)
    const gDept = g.department?.toUpperCase()
    if (!gDept) continue
    for (const a of acts) {
      const aDate = new Date(a.period_start)
      const diff = Math.abs((aDate.getTime() - gDate.getTime()) / 86400000)
      if (diff <= 90 && a.department?.toUpperCase().includes(gDept.split(' ')[0])) {
        alerts.push({
          id: `gift-${g.gift_id}`,
          type: 'gift_timing',
          severity: parseFloat(String(g.value)) >= 100 ? 'high' : 'medium',
          title: 'Gift to Official Near Lobbying Event',
          description: `${g.lobbyist_firstname} ${g.lobbyist_lastname} gave ${g.gift} ($${g.value}) to ${g.recipient_title} ${g.recipient_first_name} ${g.recipient_last_name} (${g.department}) within 90 days of lobbying ${a.department}.`,
          lobbyist_name: `${g.lobbyist_firstname} ${g.lobbyist_lastname}`,
          department: g.department,
          amount: parseFloat(String(g.value)),
          date: g.period_start,
          entities: [`${g.recipient_first_name} ${g.recipient_last_name}`, g.department],
        })
        break
      }
    }
  }

  // Dark money events
  for (const e of expenditures) {
    if (e.purpose && /event|fundrais|reception|gala|dinner|sponsor/i.test(e.purpose)) {
      alerts.push({
        id: `dm-${e.expenditure_id}`,
        type: 'dark_money',
        severity: parseFloat(String(e.amount)) >= 1000 ? 'high' : 'low',
        title: 'Event/Fundraiser Expenditure',
        description: `${e.lobbyist_first_name} ${e.lobbyist_last_name} spent ${formatCurrency(parseFloat(String(e.amount)))} on "${e.purpose}" for ${e.client_name}. Recipient: ${e.recipient}.`,
        lobbyist_name: `${e.lobbyist_first_name} ${e.lobbyist_last_name}`,
        client_name: e.client_name,
        amount: parseFloat(String(e.amount)),
        date: e.expenditure_date,
        entities: [e.client_name, e.recipient],
      })
    }
  }

  return alerts.sort((a, b) => {
    const sev = { high: 0, medium: 1, low: 2 }
    return sev[a.severity] - sev[b.severity]
  }).slice(0, 150)
}

export default async function AnomaliesPage() {
  const alerts = await buildAlerts()
  const high = alerts.filter(a => a.severity === 'high')
  const medium = alerts.filter(a => a.severity === 'medium')
  const low = alerts.filter(a => a.severity === 'low')

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-black">Anomaly Alerts</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          AI-detected patterns: quid-pro-quo timing, gift proximity, event spending, dark money flows
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card" style={{ borderColor: 'rgba(248,113,113,0.3)' }}>
          <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--danger)' }}>High Severity</p>
          <p className="text-3xl font-black mt-1" style={{ color: 'var(--danger)' }}>{high.length}</p>
        </div>
        <div className="card" style={{ borderColor: 'rgba(251,191,36,0.3)' }}>
          <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--warn)' }}>Medium Severity</p>
          <p className="text-3xl font-black mt-1" style={{ color: 'var(--warn)' }}>{medium.length}</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Low Severity</p>
          <p className="text-3xl font-black mt-1">{low.length}</p>
        </div>
      </div>

      <div className="space-y-3">
        {alerts.map(alert => (
          <div
            key={alert.id}
            className="p-4 rounded-xl"
            style={{
              background: alert.severity === 'high' ? 'rgba(248,113,113,0.06)' : alert.severity === 'medium' ? 'rgba(251,191,36,0.04)' : 'var(--surface)',
              border: `1px solid ${alert.severity === 'high' ? 'rgba(248,113,113,0.25)' : alert.severity === 'medium' ? 'rgba(251,191,36,0.2)' : 'var(--border)'}`,
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-lg">{TYPE_ICONS[alert.type]}</span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`badge badge-${alert.severity}`}>{alert.severity}</span>
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                      {TYPE_LABELS[alert.type]}
                    </span>
                  </div>
                  <p className="text-sm font-semibold mt-1">{alert.title}</p>
                </div>
              </div>
              {alert.amount && (
                <p className="font-mono text-sm shrink-0" style={{ color: 'var(--warn)' }}>
                  {formatCurrency(alert.amount)}
                </p>
              )}
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>{alert.description}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {alert.lobbyist_name && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,174,239,0.1)', color: 'var(--accent)' }}>
                  👤 {alert.lobbyist_name}
                </span>
              )}
              {alert.client_name && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(167,139,250,0.1)', color: 'var(--accent2)' }}>
                  🏢 {alert.client_name}
                </span>
              )}
              {alert.department && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(74,222,128,0.1)', color: 'var(--success)' }}>
                  🏛 {alert.department}
                </span>
              )}
              {alert.date && (
                <span className="text-xs" style={{ color: 'var(--muted)' }}>{formatDate(alert.date)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
