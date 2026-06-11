import { NextRequest, NextResponse } from 'next/server'
import { sodaFetch } from '@/lib/chicago-api'
import type { LobbyingActivity } from '@/lib/types'

export const revalidate = 3600

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const department = searchParams.get('department')
  const lobbyist = searchParams.get('lobbyist')
  const client = searchParams.get('client')

  const where: string[] = []
  if (department) where.push(`upper(department) like '%${department.toUpperCase()}%'`)
  if (lobbyist) where.push(`lobbyist_id=${lobbyist}`)
  if (client) where.push(`client_id=${client}`)

  const data = await sodaFetch<LobbyingActivity>('activity', {
    $limit: 1000,
    $order: 'period_start DESC',
    ...(where.length ? { $where: where.join(' AND ') } : {}),
  })

  // Build nodes + edges for force graph
  const nodes = new Map<string, { id: string; label: string; type: string; count: number }>()
  const edgeMap = new Map<string, { source: string; target: string; weight: number; actions: string[] }>()

  for (const row of data) {
    const lobbyistNode = `l-${row.lobbyist_id}`
    const clientNode = `c-${row.client_id}`
    const deptNode = `d-${row.department}`

    if (!nodes.has(lobbyistNode)) {
      nodes.set(lobbyistNode, {
        id: lobbyistNode,
        label: `${row.lobbyist_first_name} ${row.lobbyist_last_name}`,
        type: 'lobbyist',
        count: 0,
      })
    }
    nodes.get(lobbyistNode)!.count++

    if (!nodes.has(clientNode)) {
      nodes.set(clientNode, { id: clientNode, label: row.client_name, type: 'client', count: 0 })
    }
    nodes.get(clientNode)!.count++

    if (row.department && !nodes.has(deptNode)) {
      nodes.set(deptNode, { id: deptNode, label: row.department, type: 'department', count: 0 })
    }
    if (row.department) nodes.get(deptNode)!.count++

    // Lobbyist → Client edge
    const lcKey = `${lobbyistNode}|${clientNode}`
    if (!edgeMap.has(lcKey)) edgeMap.set(lcKey, { source: lobbyistNode, target: clientNode, weight: 0, actions: [] })
    edgeMap.get(lcKey)!.weight++

    // Client → Department edge
    if (row.department) {
      const cdKey = `${clientNode}|${deptNode}`
      if (!edgeMap.has(cdKey)) edgeMap.set(cdKey, { source: clientNode, target: deptNode, weight: 0, actions: [] })
      const edge = edgeMap.get(cdKey)!
      edge.weight++
      if (row.action_sought && !edge.actions.includes(row.action_sought)) {
        edge.actions.push(row.action_sought.slice(0, 60))
      }
    }
  }

  return NextResponse.json({
    nodes: Array.from(nodes.values()),
    edges: Array.from(edgeMap.values()),
  })
}
