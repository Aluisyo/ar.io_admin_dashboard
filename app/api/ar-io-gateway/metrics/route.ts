import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// Function to parse Prometheus metrics format
function parsePrometheusMetrics(metricsText: string): Record<string, any> {
  const lines = metricsText.split('\n')
  const metrics: Record<string, any> = {}
  const categories: Record<string, Record<string, any>> = {
    http: {},           // HTTP request statistics
    transaction: {},    // Transaction processing metrics
    system: {},         // System resource usage
    cache: {},          // Cache performance
    bundle: {},         // Bundle processing statistics
    other: {}
  }

  for (const line of lines) {
    const trimmedLine = line.trim()
    
    // Skip comments and empty lines
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue
    }
    
    // Parse metric line: metric_name{labels} value timestamp?
    const match = trimmedLine.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)(\{[^}]*\})?\s+([0-9.+-eE]+)(\s+\d+)?$/)
    
    if (match) {
      const [, metricName, labels, value] = match
      const numericValue = parseFloat(value)
      
      // Categorize metrics based on name patterns for AR.IO Gateway
      let category = 'other'
      
      // HTTP request statistics
      if (metricName.includes('http') || metricName.includes('request') || 
          metricName.includes('response') || metricName.includes('status_code') ||
          metricName.includes('endpoint') || metricName.includes('method')) {
        category = 'http'
      }
      // Transaction processing metrics  
      else if (metricName.includes('transaction') || metricName.includes('tx') || 
               metricName.includes('block') || metricName.includes('arweave') ||
               metricName.includes('data_item') || metricName.includes('chunk')) {
        category = 'transaction'
      }
      // System resource usage
      else if (metricName.includes('cpu') || metricName.includes('memory') || 
               metricName.includes('disk') || metricName.includes('process') ||
               metricName.includes('node') || metricName.includes('heap') ||
               metricName.includes('gc') || metricName.includes('event_loop')) {
        category = 'system'
      }
      // Cache performance
      else if (metricName.includes('cache') || metricName.includes('hit') || 
               metricName.includes('miss') || metricName.includes('redis') ||
               metricName.includes('store') || metricName.includes('lookup')) {
        category = 'cache'
      }
      // Bundle processing statistics
      else if (metricName.includes('bundle') || metricName.includes('ans') || 
               metricName.includes('upload') || metricName.includes('download') ||
               metricName.includes('size') || metricName.includes('bytes') ||
               metricName.includes('throughput')) {
        category = 'bundle'
      }
      
      // Clean up metric name for display
      const displayName = metricName.replace(/^ar_io_/, '').replace(/_/g, ' ')
      
      // Add to category
      categories[category][displayName] = isNaN(numericValue) ? value : numericValue
      
      // Also add to main metrics object
      metrics[metricName] = isNaN(numericValue) ? value : numericValue
    }
  }
  
  // Only return categories that have data
  const result: Record<string, any> = {}
  for (const [categoryName, categoryData] of Object.entries(categories)) {
    if (Object.keys(categoryData).length > 0) {
      result[categoryName] = categoryData
    }
  }
  
  // If no categorized data, return raw metrics
  if (Object.keys(result).length === 0 && Object.keys(metrics).length > 0) {
    result.metrics = metrics
  }
  
  return result
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Define possible endpoints for AR.IO Gateway metrics
    // Try Docker network hostnames first, then localhost
    const metricsUrls = [
<<<<<<< Updated upstream
      'http://ar-io-node-envoy-1:3000/ar-io/__gateway_metrics',     // Docker network (primary - full container name)
      'http://ar-io-node-core-1:4000/ar-io/__gateway_metrics',      // Docker network (direct to core - full container name)
      'http://envoy:3000/ar-io/__gateway_metrics',     // Docker network (primary - short alias)
      'http://core:4000/ar-io/__gateway_metrics',      // Docker network (direct to core - short alias)
=======
      'http://envoy:3000/ar-io/__gateway_metrics',     // Docker network (primary)
      'http://core:4000/ar-io/__gateway_metrics',      // Docker network (direct to core)
>>>>>>> Stashed changes
      'http://localhost:3000/ar-io/__gateway_metrics', // Local development
      'http://localhost:4000/ar-io/__gateway_metrics'  // Local development (direct)
    ]
    
    let gatewayMetrics = null
    let lastError = null
    let connectedUrl = null

    for (const metricsUrl of metricsUrls) {
      try {
        console.log(`Trying AR.IO Gateway metrics at: ${metricsUrl}`)
        const response = await fetch(metricsUrl, {
          method: 'GET',
          headers: {
            'Accept': 'text/plain',
          },
          // Add timeout to prevent hanging
          signal: AbortSignal.timeout(5000)
        })

        if (response.ok) {
          console.log(`Successfully connected to AR.IO Gateway metrics at: ${metricsUrl}`)
          const metricsText = await response.text()
          gatewayMetrics = parsePrometheusMetrics(metricsText)
          gatewayMetrics._rawMetrics = metricsText // Keep raw text for debugging
          connectedUrl = metricsUrl
          break // Success, exit loop
        } else {
          console.log(`Failed to fetch from ${metricsUrl}: HTTP ${response.status}`)
          lastError = `HTTP ${response.status}: ${response.statusText}`
        }
      } catch (error: any) {
        console.log(`Error fetching from ${metricsUrl}:`, error.message)
        lastError = error.message
        continue // Try next URL
      }
    }

    if (!gatewayMetrics) {
      return NextResponse.json({ 
        error: 'Gateway metrics not available',
        details: lastError || 'Unable to connect to gateway on ports 3000 or 4000',
        available: false
      }, { status: 503 })
    }

    return NextResponse.json({
      available: true,
      connectedUrl: connectedUrl,
      metrics: gatewayMetrics,
      timestamp: new Date().toISOString(),
      metricsCount: Object.keys(gatewayMetrics).filter(key => !key.startsWith('_')).length
    })
  } catch (error: any) {
    console.error('Error fetching AR.IO gateway metrics:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch gateway metrics',
      details: error.message,
      available: false
    }, { status: 500 })
  }
}
