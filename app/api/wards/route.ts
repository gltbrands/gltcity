import { NextResponse } from 'next/server'

export const revalidate = 86400 // 24h — ward boundaries don't change often

interface RawBoundary {
  ward: string
  the_geom: {
    type: string
    coordinates: number[][][][]
  }
}

interface RawOffice {
  ward: string
  alderman: string
  address?: string
  city?: string
  state?: string
  zipcode?: string
  ward_phone?: string
  email?: string
  website?: string
  photo_link?: string
  latitude?: string
  longitude?: string
  city_hall_address?: string
  city_hall_phone?: string
}

export async function GET() {
  const base = 'https://data.cityofchicago.org/resource'
  const token = process.env.CHICAGO_APP_TOKEN
  const auth = token ? `?$$app_token=${token}` : ''

  const [boundaries, offices] = await Promise.all([
    fetch(`${base}/p293-wvbd.json?$limit=55${auth ? '&' + auth.slice(1) : ''}`, { next: { revalidate: 86400 } })
      .then(r => r.json() as Promise<RawBoundary[]>),
    fetch(`${base}/htai-wnw4.json?$limit=55&$order=ward%20ASC${auth ? '&' + auth.slice(1) : ''}`, { next: { revalidate: 3600 } })
      .then(r => r.json() as Promise<RawOffice[]>),
  ])

  // Build office lookup by ward number
  const officeMap = new Map<number, RawOffice>()
  for (const o of offices) {
    officeMap.set(parseInt(o.ward, 10), o)
  }

  // Merge boundaries + offices
  const wards = boundaries
    .filter(b => b.the_geom)
    .map(b => {
      const wardNum = parseInt(b.ward, 10)
      const office = officeMap.get(wardNum)

      // Parse alderman name: format is "Last, First" → "First Last"
      let alderman = office?.alderman ?? `Ward ${wardNum}`
      const commaIdx = alderman.indexOf(',')
      if (commaIdx > -1) {
        const last = alderman.slice(0, commaIdx).trim()
        const first = alderman.slice(commaIdx + 1).trim()
        alderman = `${first} ${last}`
      }

      return {
        ward: wardNum,
        alderman,
        alderman_raw: office?.alderman ?? '',
        address: office?.address ?? '',
        city: office?.city ?? 'Chicago',
        state: office?.state ?? 'IL',
        zipcode: office?.zipcode ?? '',
        phone: office?.ward_phone ?? '',
        email: office?.email ?? '',
        website: office?.website ?? '',
        photo_link: office?.photo_link ?? '',
        lat: office?.latitude ? parseFloat(office.latitude) : null,
        lng: office?.longitude ? parseFloat(office.longitude) : null,
        geom: b.the_geom,
      }
    })
    .sort((a, b) => a.ward - b.ward)

  return NextResponse.json(wards)
}
