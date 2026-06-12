import type { Metadata, Viewport } from 'next'
import './globals.css'
import 'leaflet/dist/leaflet.css'
import Sidebar from '@/components/layout/Sidebar'

export const metadata: Metadata = {
  title: 'WARDBOSS: Chicago Lobbying Intelligence',
  description: 'City of Chicago lobbying data. Public records platform.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full flex overflow-hidden" style={{ background: 'var(--background)' }}>
        <Sidebar />
        <main
          className="flex-1 overflow-y-auto p-4 pt-16 md:p-6 md:pt-6 lg:p-8"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          {children}
        </main>
      </body>
    </html>
  )
}
