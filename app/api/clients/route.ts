import { NextRequest, NextResponse } from 'next/server'
import { sodaFetch } from '@/lib/chicago-api'
import type { Client } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const q = searchParams.get('q')
  const year = searchParams.get('year') ?? '2025'
  const state = searchParams.get('state')
  const limit = parseInt(searchParams.get('limit') ?? '500')
  const offset = parseInt(searchParams.get('offset') ?? '0')

  const where: string[] = [`year=${year}`]
  if (q) {
    const esc = q.replace(/'/g, "''").toUpperCase()
    where.push(`upper(name) like '%${esc}%'`)
  }
  if (state) where.push(`state='${state}'`)

  const data = await sodaFetch<Client>('clients', {
    $limit: limit,
    $offset: offset,
    $order: 'name ASC',
    $where: where.join(' AND '),
  })

  return NextResponse.json(data)
}
