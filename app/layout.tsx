import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers' // Import the new Providers component

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AR.IO Gateway Admin Dashboard',
  description: 'Admin dashboard for AR.IO Gateway management',
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers> {/* Use the new Providers component */}
          {children}
        </Providers>
      </body>
    </html>
  )
}
