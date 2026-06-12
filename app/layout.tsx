import type { Metadata } from 'next'
import './globals.css'
import 'leaflet/dist/leaflet.css'
import Sidebar from '@/components/layout/Sidebar'

export const metadata: Metadata = {
  title: 'GLTCity: Chicago Lobbying Intelligence',
  description: 'City of Chicago lobbying data. Public records platform.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full flex overflow-hidden" style={{ background: 'var(--background)' }}>
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </body>
    </html>
  )
}
