import { NextRequest, NextResponse } from 'next/server'

interface AOCUInfo {
  address: string
  timestamp: number
}

const AO_CU_ENDPOINTS = [
  'http://ar-io-node-ao-cu-1:6363',  // Docker service name (full container name)
  'http://ao-cu:6363',               // Docker service name (short alias, if configured)
  'http://localhost:6363',
  'http://127.0.0.1:6363'
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
  const endpoints = [...AO_CU_ENDPOINTS]
  let lastError: string | null = null

  for (const endpoint of endpoints) {
    try {
      console.log(`Attempting to fetch AO CU info from: ${endpoint}`)
      
      const response = await fetchWithTimeout(endpoint, 5000)
      
      if (response.ok) {
        const data: AOCUInfo = await response.json()
        
        console.log(`Successfully fetched AO CU info from: ${endpoint}`)
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
  console.log('All AO CU endpoints failed')
  return NextResponse.json({
    success: false,
    error: `Failed to connect to AO compute unit. Last error: ${lastError}`,
    endpoints
  }, { status: 503 })
}
