'use client'

import { SessionProvider } from 'next-auth/react'
import React from 'react'
import { getAuthBasePath } from '@/lib/base-path'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  // Dynamically set basePath from environment variable
  const basePath = getAuthBasePath()
    
  return (
    <SessionProvider basePath={basePath}>
      {children}
    </SessionProvider>
  )
}
