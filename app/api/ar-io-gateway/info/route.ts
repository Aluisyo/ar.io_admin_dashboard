import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Try both common ports for AR.IO Gateway
    const ports = [3000, 4000]
    let gatewayInfo = null
    let lastError = null

    for (const port of ports) {
      try {
        const infoUrl = `http://localhost:${port}/ar-io/info`
        const response = await fetch(infoUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          // Add timeout to prevent hanging
          signal: AbortSignal.timeout(5000)
        })

        if (response.ok) {
          gatewayInfo = await response.json()
          gatewayInfo._connectedPort = port // Track which port worked
          break // Success, exit loop
        } else {
          lastError = `HTTP ${response.status}: ${response.statusText}`
        }
      } catch (error: any) {
        lastError = error.message
        continue // Try next port
      }
    }

    if (!gatewayInfo) {
      return NextResponse.json({ 
        error: 'Gateway info not available',
        details: lastError || 'Unable to connect to gateway on ports 3000 or 4000',
        available: false
      }, { status: 503 })
    }

    return NextResponse.json({
      available: true,
      port: gatewayInfo._connectedPort || 'unknown',
      info: gatewayInfo,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Error fetching AR.IO gateway info:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch gateway info',
      details: error.message,
      available: false
    }, { status: 500 })
  }
}
