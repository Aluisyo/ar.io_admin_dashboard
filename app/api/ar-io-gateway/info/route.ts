import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Define possible endpoints for AR.IO Gateway info
    // Try Docker network hostnames first, then localhost
    const infoUrls = [
      'http://envoy:3000/ar-io/info',          // Docker network (primary)
      'http://core:4000/ar-io/info',           // Docker network (direct to core)
      'http://localhost:3000/ar-io/info',      // Local development
      'http://localhost:4000/ar-io/info'       // Local development (direct)
    ]
    
    let gatewayInfo = null
    let lastError = null
    let connectedUrl = null

    for (const infoUrl of infoUrls) {
      try {
        console.log(`Trying AR.IO Gateway info at: ${infoUrl}`)
        const response = await fetch(infoUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          // Add timeout to prevent hanging
          signal: AbortSignal.timeout(5000)
        })

        if (response.ok) {
          console.log(`Successfully connected to AR.IO Gateway info at: ${infoUrl}`)
          gatewayInfo = await response.json()
          connectedUrl = infoUrl
          break // Success, exit loop
        } else {
          console.log(`Failed to fetch from ${infoUrl}: HTTP ${response.status}`)
          lastError = `HTTP ${response.status}: ${response.statusText}`
        }
      } catch (error: any) {
        console.log(`Error fetching from ${infoUrl}:`, error.message)
        lastError = error.message
        continue // Try next URL
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
      connectedUrl: connectedUrl,
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
