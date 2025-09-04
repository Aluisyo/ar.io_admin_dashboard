import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// Function to parse Prometheus metrics format
function parsePrometheusMetrics(metricsText: string): Record<string, any[]> {
  const lines = metricsText.split('\n')
  const categories: Record<string, any[]> = {
    ario: [],       // AR.IO specific metrics (priority)
    arns: [],       // ArNS related metrics
    node: [],       // Node system metrics
    http: [],       // HTTP request/response metrics
    performance: [], // Performance and latency metrics
    process: [],    // Process-related metrics
    other: []
  }

  for (const line of lines) {
    const trimmedLine = line.trim()
    
    // Skip comments and empty lines
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue
    }
    
    // Parse metric line: metric_name{labels} value timestamp?
    const match = trimmedLine.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)(\{[^}]*\})?\s+([+-]?[0-9]*\.?[0-9]+([eE][+-]?[0-9]+)?)(\s+\d+)?$/)
    
    if (match) {
      const [, metricName, labels, value] = match
      const numericValue = parseFloat(value)
      
      // Categorize metrics based on name patterns (prioritize AR.IO specific metrics)
      let category = 'other'
      
      // AR.IO Core metrics (highest priority) - matching Grafana dashboard
      if (metricName.includes('last_height_imported') || 
          metricName.includes('circuit') ||
          metricName.includes('graphql')) {
        category = 'ario'
      }
      // ArNS specific metrics - matching Grafana dashboard  
      else if (metricName.includes('arns_resolution_time_ms') ||
               metricName.includes('arns_cache_hit_total') ||
               metricName.includes('arns_cache_miss_total') ||
               metricName.includes('arns_name_cache_duration_ms')) {
        category = 'arns'
      }
      // Node system metrics (CPU, memory, disk, etc.)
      else if (metricName.includes('cpu') || metricName.includes('memory') || 
               metricName.includes('disk') || metricName.includes('filesystem') ||
               metricName.includes('load') || metricName.includes('uptime') ||
               metricName.includes('node_')) {
        category = 'node'
      }
      // HTTP metrics
      else if (metricName.includes('http_requests') || metricName.includes('http_request') || 
               metricName.includes('request_duration') || metricName.includes('response')) {
        category = 'http'
      }
      // Performance metrics (latency, duration, etc.)
      else if (metricName.includes('duration') || metricName.includes('latency') ||
               metricName.includes('time_ms') || metricName.includes('seconds_total')) {
        category = 'performance'
      }
      // Process metrics (Go runtime, etc.)
      else if (metricName.includes('process') || metricName.includes('go_') || 
               metricName.includes('thread') || metricName.includes('goroutine') ||
               metricName.includes('gc') || metricName.includes('heap')) {
        category = 'process'
      }
      
      // Clean up metric name for display
      const displayName = metricName
        .replace(/^(node_|go_|process_|http_|prometheus_)/, '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
      
      // Add to category as an object with name and value
      categories[category].push({
        name: metricName,
        displayName: displayName,
        value: isNaN(numericValue) ? value : numericValue,
        labels: labels || ''
      })
    }
  }
  
  // Only return categories that have data
  const result: Record<string, any[]> = {}
  for (const [categoryName, categoryData] of Object.entries(categories)) {
    if (categoryData.length > 0) {
      result[categoryName] = categoryData
    }
  }
  
  return result
}

async function tryFetchMetrics(urls: string[]): Promise<{ response: Response, url: string } | null> {
  for (const url of urls) {
    try {
      console.log(`Trying metrics endpoint: ${url}`)
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/plain',
          'User-Agent': 'AR.IO-Admin-Dashboard/1.0'
        },
        signal: AbortSignal.timeout(8000) // Increased timeout for slower networks
      })
      
      if (response.ok) {
        console.log(`Successfully connected to: ${url}`)
        return { response, url }
      } else {
        console.log(`Failed to fetch from ${url}: HTTP ${response.status}`)
      }
    } catch (error) {
      console.log(`Error fetching from ${url}:`, error instanceof Error ? error.message : error)
    }
  }
  return null
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Define possible endpoints for AR.IO Gateway metrics
    // Try Docker network hostname first, then localhost
    const gatewayUrls = [
      'http://ar-io-node-envoy-1:3000/ar-io/__gateway_metrics',     // Docker network (full container name)
      'http://ar-io-node-core-1:4000/ar-io/__gateway_metrics',      // Docker network (direct to core - full container name)
      'http://envoy:3000/ar-io/__gateway_metrics',                   // Docker network (short alias)
      'http://core:4000/ar-io/__gateway_metrics',                    // Docker network (direct to core - short alias)
      'http://localhost:3000/ar-io/__gateway_metrics',               // Local development (via envoy)
      'http://localhost:4000/ar-io/__gateway_metrics'                // Local development (direct to core)
    ]
    
    // Try AR.IO Gateway metrics first (most important)
    let result = await tryFetchMetrics(gatewayUrls)
    let response: Response
    let metricsUrl: string
    
    if (result) {
      response = result.response
      metricsUrl = result.url
    } else {
      // Fallback to node-exporter (system metrics)
      console.log('AR.IO Gateway metrics not available, trying node-exporter...')
      const nodeExporterUrls = [
        'http://node-exporter:9100/metrics',  // Docker network
        'http://localhost:9100/metrics'       // Local development
      ]
      
      result = await tryFetchMetrics(nodeExporterUrls)
      if (result) {
        response = result.response
        metricsUrl = result.url
      } else {
        return NextResponse.json({ 
          error: 'No Prometheus metrics endpoints available',
          details: 'Tried AR.IO Gateway and Node Exporter endpoints',
          attempted_urls: [...gatewayUrls, ...nodeExporterUrls],
          available: false
        }, { status: 503 })
      }
    }

    if (!response.ok) {
      return NextResponse.json({ 
        error: 'Prometheus metrics not available',
        details: `HTTP ${response.status}: ${response.statusText}`,
        available: false
      }, { status: 503 })
    }

    const metricsText = await response.text()
    const parsedMetrics = parsePrometheusMetrics(metricsText)
    
    const totalMetrics = Object.values(parsedMetrics).reduce((sum, arr) => sum + arr.length, 0)
    
    return NextResponse.json({
      available: true,
      metrics: parsedMetrics,
      timestamp: new Date().toISOString(),
      metricsCount: totalMetrics,
      rawMetricsLength: metricsText.length
    })
  } catch (error: any) {
    console.error('Error fetching Prometheus metrics:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch Prometheus metrics',
      details: error.message,
      available: false
    }, { status: 500 })
  }
}
