import { NextResponse } from 'next/server'
import { sodaFetch } from '@/lib/chicago-api'
import type { Contribution, LobbyingActivity } from '@/lib/types'
import { TOPICS, type TopicKey, type WardIntelResponse } from '@/lib/topics'

export const revalidate = 7200

// ─────────────────────────────────────────────────────────────
// Topic classification — maps department + action_sought → category
// ─────────────────────────────────────────────────────────────
function classifyTopic(department: string, actionSought: string): TopicKey {
  const t = `${department} ${actionSought}`.toLowerCase()
  if (/cannabis|marijuana|dispensary|cultivation|infus|cbd/.test(t)) return 'CANNABIS'
  if (/liquor|alcohol|tavern|\bbar\b|spirit|winery|brew/.test(t)) return 'LIQUOR'
  if (/tif\b|tax increment|developer agreement|develop.*agree|increment financing/.test(t)) return 'TIF'
  if (/zon|rezone|variance|planned dev|map amend|dpd|planning|land use|zba|zoning board/.test(t)) return 'ZONING'
  if (/permit|building|demolit|construct|structur|dob\b|inspection|renovation/.test(t)) return 'CONSTRUCTION'
  if (/contract|procurement|bid\b|rfp\b|vendor|purchase order|supply|award/.test(t)) return 'CONTRACTS'
  if (/cdot|transportation|transit|bike lane|pedestrian|parking|road|traffic|bus|cta/.test(t)) return 'TRANSIT'
  if (/health|hospital|clinic|medical|healthcare|cph\b|hhs\b|public health/.test(t)) return 'HEALTHCARE'
  if (/environment|sustainability|green|climate|water|mwrd|pollution/.test(t)) return 'ENVIRONMENT'
  if (/housing|affordable|tenant|hud\b|cha\b|rental|residential subsid/.test(t)) return 'HOUSING'
  if (/finance|tax\b|budget|bond\b|fiscal|revenue|assessment|treasury/.test(t)) return 'FINANCE'
  if (/ethics|compliance|lobbying|disclosure|conflict/.test(t)) return 'ETHICS'
  return 'OTHER'
}

// ─────────────────────────────────────────────────────────────
// Alderman last-name → ward lookup from live ward offices
// ─────────────────────────────────────────────────────────────
async function buildAldermanIndex(): Promise<Map<string, number>> {
  const appToken = process.env.CHICAGO_APP_TOKEN
  const headers: Record<string, string> = {}
  if (appToken) headers['X-App-Token'] = appToken
  const res = await fetch(
    'https://data.cityofchicago.org/resource/htai-wnw4.json?$limit=55&$order=ward%20ASC',
    { next: { revalidate: 86400 }, headers }
  )
  const data: Array<{ ward: string; alderman: string }> = await res.json()

  const index = new Map<string, number>()
  for (const o of data) {
    const ward = parseInt(o.ward, 10)
    const raw = o.alderman ?? ''
    // "La Spata, Daniel" → extract last name
    const last = raw.split(',')[0]?.trim().toLowerCase() ?? ''
    if (!last) continue
    index.set(last, ward)
    index.set(last.replace(/\s+/g, ''), ward)
    const firstWord = last.split(' ')[0]
    if (firstWord && firstWord.length > 3) index.set(firstWord, ward)
  }
  return index
}

function matchContribToWard(recipient: string, aldermanIndex: Map<string, number>): number | null {
  const r = recipient.toLowerCase()
  for (const [name, ward] of aldermanIndex) {
    if (name.length > 3 && r.includes(name)) return ward
  }
  return null
}

// ─────────────────────────────────────────────────────────────
// Main computation
// ─────────────────────────────────────────────────────────────
export async function GET() {
  const [contributions, activities, aldermanIndex] = await Promise.all([
    sodaFetch<Contribution>('contributions', { $limit: 25000, $order: 'contribution_date DESC' }),
    sodaFetch<LobbyingActivity>('activity', { $limit: 25000, $order: 'period_start DESC' }),
    buildAldermanIndex(),
  ])

  // Build: lobbyist_id → topics they work on (from activity)
  const lobbyistTopics = new Map<number, Map<TopicKey, { count: number; clients: Set<string> }>>()
  for (const act of activities) {
    const topic = classifyTopic(act.department ?? '', act.action_sought ?? '')
    const lid = act.lobbyist_id
    if (!lobbyistTopics.has(lid)) lobbyistTopics.set(lid, new Map())
    const tmap = lobbyistTopics.get(lid)!
    if (!tmap.has(topic)) tmap.set(topic, { count: 0, clients: new Set() })
    const entry = tmap.get(topic)!
    entry.count++
    if (act.client_name) entry.clients.add(act.client_name)
  }

  // Build: ward → topic → { total, count, lobbyists, clients }
  const wardTopics: Record<number, Partial<Record<TopicKey, {
    total: number; count: number
    lobbyists: Map<string, number>; clients: Set<string>
  }>>> = {}
  const overallWard: Record<number, { total: number; count: number }> = {}

  for (const contrib of contributions) {
    const ward = matchContribToWard(contrib.recipient, aldermanIndex)
    if (!ward) continue
    const amount = parseFloat(String(contrib.amount ?? 0))
    const lobbyistName = `${contrib.lobbyist_first_name} ${contrib.lobbyist_last_name}`.trim()

    if (!overallWard[ward]) overallWard[ward] = { total: 0, count: 0 }
    overallWard[ward].total += amount
    overallWard[ward].count++

    const topics = lobbyistTopics.get(contrib.lobbyist_id)
    if (!topics || topics.size === 0) continue
    if (!wardTopics[ward]) wardTopics[ward] = {}
    const wt = wardTopics[ward]
    const totalCount = Array.from(topics.values()).reduce((s, v) => s + v.count, 0)

    for (const [topic, { count, clients }] of topics) {
      if (!wt[topic]) wt[topic] = { total: 0, count: 0, lobbyists: new Map(), clients: new Set() }
      const entry = wt[topic]!
      const share = count / totalCount
      entry.total += amount * share
      entry.count += Math.round(count * share)
      entry.lobbyists.set(lobbyistName, (entry.lobbyists.get(lobbyistName) ?? 0) + amount * share)
      clients.forEach(c => entry.clients.add(c))
    }
  }

  // Compute topic totals + top wards
  const topicTotals: WardIntelResponse['topicTotals'] = {} as WardIntelResponse['topicTotals']
  for (const topicKey of Object.keys(TOPICS) as TopicKey[]) {
    let total = 0; let count = 0
    const wardScores: [number, number][] = []
    for (const [wardStr, topics] of Object.entries(wardTopics)) {
      const ward = parseInt(wardStr)
      const t = topics[topicKey]
      if (t) { total += t.total; count += t.count; wardScores.push([ward, t.total]) }
    }
    topicTotals[topicKey] = {
      total,
      count,
      topWards: wardScores.sort((a, b) => b[1] - a[1]).slice(0, 10).map(([w]) => w),
    }
  }

  // Serialize Maps → plain objects
  const serialized: WardIntelResponse['wardTopics'] = {}
  for (const [wardStr, topics] of Object.entries(wardTopics)) {
    const ward = parseInt(wardStr)
    serialized[ward] = {}
    for (const [topicKey, data] of Object.entries(topics)) {
      const topic = topicKey as TopicKey
      if (!data) continue
      serialized[ward][topic] = {
        total: Math.round(data.total),
        count: data.count,
        topLobbyists: Array.from(data.lobbyists.entries())
          .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => n),
        topClients: Array.from(data.clients).slice(0, 5),
      }
    }
  }

  return NextResponse.json({ wardTopics: serialized, topicTotals, overallWard } satisfies WardIntelResponse)
}
