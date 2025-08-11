import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/providers' 



export const metadata: Metadata = {
  title: 'AR.IO Gateway Admin Dashboard',
  description: 'Admin dashboard for AR.IO Gateway management'
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
