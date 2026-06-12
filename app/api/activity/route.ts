import { NextRequest, NextResponse } from 'next/server'
import { sodaFetch } from '@/lib/chicago-api'
import type { LobbyingActivity } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const q = searchParams.get('q')
  const department = searchParams.get('department')
  const action = searchParams.get('action')
  const client = searchParams.get('client')
  const lobbyist = searchParams.get('lobbyist')
  const limit = parseInt(searchParams.get('limit') ?? '200')
  const offset = parseInt(searchParams.get('offset') ?? '0')

  const where: string[] = []
  if (q) {
    const esc = q.replace(/'/g, "''").toUpperCase()
    where.push(`(upper(action_sought) like '%${esc}%' OR upper(department) like '%${esc}%' OR upper(client_name) like '%${esc}%')`)
  }
  if (department) where.push(`upper(department) like '%${department.toUpperCase()}%'`)
  if (action) where.push(`action='${action}'`)
  if (client) where.push(`client_id=${client}`)
  if (lobbyist) where.push(`lobbyist_id=${lobbyist}`)

  const data = await sodaFetch<LobbyingActivity>('activity', {
    $limit: limit,
    $offset: offset,
    $order: 'period_start DESC',
    ...(where.length ? { $where: where.join(' AND ') } : {}),
  })

  return NextResponse.json(data)
}
