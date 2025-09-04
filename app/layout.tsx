import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Providers } from '@/components/providers' // Import the new Providers component
import { AR_IO_FAVICON } from '@/lib/constants'

// const inter = Inter({ subsets: ['latin'] })

// Viewport configuration (Next.js 15+)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
}

export const metadata: Metadata = {
  title: 'AR.IO Gateway Admin Dashboard',
  description: 'Admin dashboard for AR.IO Gateway management',
  icons: {
    icon: [
      {
        url: AR_IO_FAVICON,
        type: 'image/png',
        sizes: '32x32',
      },
      {
        url: AR_IO_FAVICON,
        type: 'image/png', 
        sizes: '16x16',
      },
    ],
    shortcut: AR_IO_FAVICON,
    apple: {
      url: AR_IO_FAVICON,
      sizes: '180x180',
      type: 'image/png',
    },
  },
  manifest: '/manifest.json', // For PWA support if needed
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers> {/* Use the new Providers component */}
          {children}
        </Providers>
      </body>
    </html>
  )
}
