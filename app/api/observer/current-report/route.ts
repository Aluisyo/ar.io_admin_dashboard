import { NextRequest, NextResponse } from 'next/server'

interface ObserverReport {
  formatVersion: number
  observerAddress: string
  epochIndex: number
  epochStartTimestamp: number
  epochStartHeight: number
  epochEndTimestamp: number
  generatedAt: number
}

const OBSERVER_ENDPOINTS = [
  'http://ar-io-node-observer-1:5050/ar-io/observer/reports/current',  // Docker service name (full container name)
  'http://observer:5050/ar-io/observer/reports/current',
  'http://localhost:5050/ar-io/observer/reports/current',
  'http://127.0.0.1:5050/ar-io/observer/reports/current'
]

async function fetchWithTimeout(url: string, timeoutMs: number = 5000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

export async function GET(request: NextRequest) {
  const endpoints = [...OBSERVER_ENDPOINTS]
  let lastError: string | null = null

  for (const endpoint of endpoints) {
    try {
      console.log(`Attempting to fetch Observer current report from: ${endpoint}`)
      
      const response = await fetchWithTimeout(endpoint, 5000)
      
      if (response.ok) {
        const fullData = await response.json()
        
        // Check if observer is still pending
        if (fullData.message && fullData.message === 'Report pending') {
          console.log(`Observer report pending from: ${endpoint}`)
          return NextResponse.json({
            success: false,
            error: 'Observer report is still pending. The observer service is starting up.',
            endpoint,
            endpoints
          }, { status: 202 })
        }
        
        // Validate that we have the required fields
        const requiredFields = ['formatVersion', 'observerAddress', 'epochIndex', 'epochStartTimestamp', 'epochStartHeight', 'epochEndTimestamp', 'generatedAt']
        const missingFields = requiredFields.filter(field => fullData[field] === undefined || fullData[field] === null)
        
        if (missingFields.length > 0) {
          console.log(`Observer data incomplete from ${endpoint}, missing fields: ${missingFields.join(', ')}`)
          return NextResponse.json({
            success: false,
            error: `Observer data incomplete. Missing fields: ${missingFields.join(', ')}`,
            endpoint,
            endpoints
          }, { status: 202 })
        }
        
        // Extract only the fields we need
        const data: ObserverReport = {
          formatVersion: fullData.formatVersion,
          observerAddress: fullData.observerAddress,
          epochIndex: fullData.epochIndex,
          epochStartTimestamp: fullData.epochStartTimestamp,
          epochStartHeight: fullData.epochStartHeight,
          epochEndTimestamp: fullData.epochEndTimestamp,
          generatedAt: fullData.generatedAt
        }
        
        console.log(`Successfully fetched Observer current report from: ${endpoint}`)
        return NextResponse.json({
          success: true,
          endpoint,
          data,
          endpoints
        })
      } else {
        lastError = `HTTP ${response.status}: ${response.statusText}`
        console.log(`Failed to fetch from ${endpoint}: ${lastError}`)
      }
    } catch (error: any) {
      lastError = error.message || 'Unknown error'
      console.log(`Error fetching from ${endpoint}: ${lastError}`)
    }
  }

  // If we get here, all endpoints failed
  console.log('All Observer endpoints failed')
  return NextResponse.json({
    success: false,
    error: `Failed to connect to Observer service. Last error: ${lastError}`,
    endpoints
  }, { status: 503 })
}
