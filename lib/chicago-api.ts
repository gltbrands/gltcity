// Chicago Data Portal - Socrata SODA API Client

const BASE = 'https://data.cityofchicago.org/resource'

export const DATASETS = {
  combinations: '2eqz-3nvz',
  activity:     'pahz-egmi',
  clients:      'g8p5-y4m5',
  employers:    'dmeb-2zra',
  contributions:'p9p7-vfqc',
  gifts:        '5d79-9xqr',
  expendituresLarge: 'xika-473c',
  expendituresSmall: 'eqdx-4qxd',
  compensation: 'dw2f-w78u',
  permits:      'ydr8-5enu',
}

export type DatasetKey = keyof typeof DATASETS

interface SodaParams {
  $limit?: number
  $offset?: number
  $where?: string
  $order?: string
  $select?: string
  $q?: string
  $group?: string
  [key: string]: string | number | undefined
}

export async function sodaFetch<T>(
  dataset: DatasetKey,
  params: SodaParams = {}
): Promise<T[]> {
  const id = DATASETS[dataset]
  const url = new URL(`${BASE}/${id}.json`)

  url.searchParams.set('$limit', String(params.$limit ?? 1000))

  for (const [key, val] of Object.entries(params)) {
    if (key !== '$limit' && val !== undefined) {
      url.searchParams.set(key, String(val))
    }
  }

  const res = await fetch(url.toString(), {
    next: { revalidate: 3600 },
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) throw new Error(`SODA ${dataset}: ${res.status} ${res.statusText}`)
  return res.json() as Promise<T[]>
}

export async function sodaCount(dataset: DatasetKey, whereOrParams?: string | SodaParams): Promise<number> {
  const id = DATASETS[dataset]
  const url = new URL(`${BASE}/${id}.json`)
  url.searchParams.set('$select', 'count(*) as cnt')
  if (typeof whereOrParams === 'string') {
    url.searchParams.set('$where', whereOrParams)
  } else if (whereOrParams) {
    const { $where } = whereOrParams
    if ($where) url.searchParams.set('$where', $where)
  }
  const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
  if (!res.ok) return 0
  const data = await res.json() as [{ cnt: string }]
  return parseInt(data[0]?.cnt ?? '0', 10)
}

export function lobbyistName(first: string, last: string, middle?: string) {
  return [first, middle, last].filter(Boolean).join(' ')
}

export function formatCurrency(n: number | string): string {
  const num = typeof n === 'string' ? parseFloat(n) : n
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num)
}

export function formatDate(d: string): string {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}
