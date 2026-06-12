import { NextRequest, NextResponse } from 'next/server'
import { sodaFetch } from '@/lib/chicago-api'
import type { LobbyistCombination } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const q = searchParams.get('q')
  const year = searchParams.get('year') ?? '2025'
  const limit = parseInt(searchParams.get('limit') ?? '500')
  const offset = parseInt(searchParams.get('offset') ?? '0')

  const where = [`year=${year}`]
  if (q) {
    const escaped = q.replace(/'/g, "''")
    where.push(
      `(upper(lobbyist_first_name) like '%${escaped.toUpperCase()}%' OR upper(lobbyist_last_name) like '%${escaped.toUpperCase()}%' OR upper(employer_name) like '%${escaped.toUpperCase()}%' OR upper(client_name) like '%${escaped.toUpperCase()}%')`
    )
  }

  const data = await sodaFetch<LobbyistCombination>('combinations', {
    $limit: limit,
    $offset: offset,
    $where: where.join(' AND '),
    $order: 'lobbyist_last_name ASC',
  })

  // Deduplicate by lobbyist_id - aggregate employer/clients
  const map = new Map<number, { combo: LobbyistCombination; employers: Set<string>; clients: Set<string> }>()
  for (const row of data) {
    const existing = map.get(row.lobbyist_id)
    if (existing) {
      existing.employers.add(row.employer_name)
      existing.clients.add(row.client_name)
    } else {
      map.set(row.lobbyist_id, {
        combo: row,
        employers: new Set([row.employer_name]),
        clients: new Set([row.client_name]),
      })
    }
  }

  const results = Array.from(map.values()).map(({ combo, employers, clients }) => ({
    lobbyist_id: combo.lobbyist_id,
    first_name: combo.lobbyist_first_name,
    last_name: combo.lobbyist_last_name,
    name: `${combo.lobbyist_first_name} ${combo.lobbyist_last_name}`,
    employers: Array.from(employers),
    clients: Array.from(clients),
    client_count: clients.size,
  }))

  return NextResponse.json(results)
}
