'use client'
import dynamic from 'next/dynamic'

const WardMap = dynamic(() => import('./WardMap'), { ssr: false })

interface Ward {
  ward: number
  alderman: string
  alderman_raw: string
  address: string
  city: string
  state: string
  zipcode: string
  phone: string
  email: string
  website: string
  photo_link: string
  lat: number | null
  lng: number | null
  geom: object
}

export default function WardMapLoader({ wards }: { wards: Ward[] }) {
  return <WardMap wards={wards as any} />
}
