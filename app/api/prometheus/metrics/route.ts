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

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Try AR.IO Gateway metrics first (most important)
    let metricsUrl = 'http://localhost:3000/ar-io/__gateway_metrics'
    let response = await fetch(metricsUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain',
      },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(5000)
    })
    
    // If AR.IO gateway metrics fail, fallback to node-exporter (system metrics)
    if (!response.ok) {
      console.log('AR.IO Gateway metrics not available, trying node-exporter...')
      metricsUrl = 'http://localhost:9100/metrics'
      response = await fetch(metricsUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/plain',
        },
        signal: AbortSignal.timeout(5000)
      })
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
