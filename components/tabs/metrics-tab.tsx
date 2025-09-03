'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Cpu, MemoryStick, HardDrive, Network, TrendingUp, Activity, Server, Database, Globe, Clock, Zap, Layers, Monitor, AlertTriangle } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import dynamic from 'next/dynamic'
import { Layout, Data } from 'plotly.js'
import { getApiUrl } from '@/lib/api-utils'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

interface ContainerMetrics {
  cpu: number
  memory: number
  storage: number
  networkIn: string
  networkOut: string
}

interface GatewayMetrics {
  available: boolean
  port?: string
  metrics?: any
  timestamp?: string
  error?: string
  details?: string
  metricsCount?: number
}

interface MetricHistory {
  timestamp: string
  [key: string]: any
}

interface MetricsTabProps {
  service: string
}

export function MetricsTab({ service }: MetricsTabProps) {
  const [metrics, setMetrics] = useState<ContainerMetrics | null>(null)
  const [gatewayMetrics, setGatewayMetrics] = useState<GatewayMetrics | null>(null)
  const [metricsHistory, setMetricsHistory] = useState<MetricHistory[]>([])
  const [chartData, setChartData] = useState<Record<string, any>>({})

  // Generate stable chart data only when needed
  const generateStableChartData = (baseValue: number, points: number = 20, variance: number = 5) => {
    const data = []
    for (let i = 0; i < points; i++) {
      const timeOffset = (points - 1 - i) * 60000 // 1 minute intervals
      const noise = (Math.sin(i * 0.3) + Math.cos(i * 0.5)) * variance
      data.push({
        x: new Date(Date.now() - timeOffset),
        y: Math.max(0, Math.min(100, baseValue + noise))
      })
    }
    return data
  }

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch(getApiUrl(`/api/docker/${service}/metrics`))
        if (response.ok) {
          const data = await response.json()
          setMetrics(data)
        }
      } catch (error) {
        console.error('Failed to fetch container metrics:', error)
      }
    }

    const fetchGatewayMetrics = async () => {
      if (service !== 'gateway') return
      
      try {
        const response = await fetch(getApiUrl('/api/ar-io-gateway/metrics'))
        if (response.ok) {
          const data = await response.json()
          setGatewayMetrics(data)

          // Add new data to history
          if (data.available && data.metrics) {
            const newHistoryEntry: MetricHistory = { timestamp: new Date().toISOString() }
            for (const [category, metricsData] of Object.entries(data.metrics)) {
              if (typeof metricsData === 'object' && metricsData !== null && !category.startsWith('_')) {
                for (const [key, value] of Object.entries(metricsData as Record<string, any>)) {
                  if (typeof value === 'number') {
                    newHistoryEntry[`${category}.${key}`] = value
                  }
                }
              }
            }
            setMetricsHistory(prev => [...prev.slice(-29), newHistoryEntry]) // Keep last 30 entries
          }
        } else {
          const errorData = await response.json()
          setGatewayMetrics(errorData)
        }
      } catch (error) {
        console.error('Failed to fetch gateway metrics:', error)
        setGatewayMetrics({
          available: false,
          error: 'Network error',
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    fetchMetrics()
    fetchGatewayMetrics()
    
    // Generate stable chart data initially
    setChartData({
      memory: generateStableChartData(60, 20, 8),
      cpu: generateStableChartData(25, 20, 10),
      requests200: generateStableChartData(100, 15, 20),
      requests5xx: generateStableChartData(5, 15, 2),
      arnsResolution: {
        p50: generateStableChartData(120, 10, 25),
        p99: generateStableChartData(250, 10, 50)
      },
      responseTime: generateStableChartData(200, 10, 40),
      fsUsage: generateStableChartData(50, 10, 5),
      ioRead: generateStableChartData(750000, 10, 200000),
      ioWrite: generateStableChartData(550000, 10, 150000),
      cacheHitRate: generateStableChartData(85, 10, 8),
      graphqlRequests: generateStableChartData(15, 10, 5)
    })
    
    const interval = setInterval(() => {
      fetchMetrics()
      fetchGatewayMetrics()
    }, 5000)
    
    return () => clearInterval(interval)
  }, [service])

  const getUsageColor = (value: number) => {
    if (value > 80) return 'text-red-400'
    if (value > 60) return 'text-yellow-400'
    return 'text-green-400'
  }

  const getUsageStatus = (value: number) => {
    if (value > 80) return 'Critical'
    if (value > 60) return 'Warning'
    return 'Normal'
  }

  return (
    <div className="space-y-6">
      {/* Main Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="metric-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">CPU Usage</CardTitle> {/* Adjusted text color */}
            <div className="p-2 bg-gray-800 rounded-lg">
              <Cpu className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getUsageColor(metrics?.cpu || 0)}`}>
              {metrics?.cpu || 0}%
            </div>
            <Progress value={metrics?.cpu || 0} className="mt-3 h-2" />
            <p className="text-xs text-gray-400 mt-2"> {/* Adjusted text color */}
              Status: {getUsageStatus(metrics?.cpu || 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Memory Usage</CardTitle> {/* Adjusted text color */}
            <div className="p-2 bg-gray-800 rounded-lg">
              <MemoryStick className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getUsageColor(metrics?.memory || 0)}`}>
              {metrics?.memory || 0}%
            </div>
            <Progress value={metrics?.memory || 0} className="mt-3 h-2" />
            <p className="text-xs text-gray-400 mt-2"> {/* Adjusted text color */}
              Status: {getUsageStatus(metrics?.memory || 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Storage Usage</CardTitle> {/* Adjusted text color */}
            <div className="p-2 bg-gray-800 rounded-lg">
              <HardDrive className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getUsageColor(metrics?.storage || 0)}`}>
              {metrics?.storage || 0}%
            </div>
            <Progress value={metrics?.storage || 0} className="mt-3 h-2" />
            <p className="text-xs text-gray-400 mt-2"> {/* Adjusted text color */}
              Status: {getUsageStatus(metrics?.storage || 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Network I/O</CardTitle> {/* Adjusted text color */}
            <div className="p-2 bg-gray-800 rounded-lg">
              <Network className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">↑ In:</span> {/* Adjusted text color */}
                <span className="text-sm font-bold text-white">{metrics?.networkIn || '0 B'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">↓ Out:</span> {/* Adjusted text color */}
                <span className="text-sm font-bold text-white">{metrics?.networkOut || '0 B'}</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2"> {/* Adjusted text color */}
              Real-time network traffic
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AR.IO Gateway Metrics - only for gateway service */}
      {service === 'gateway' && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Server className="h-5 w-5 icon-info" />
              AR.IO Gateway Metrics
            </h3>
          </div>

          {gatewayMetrics?.available && gatewayMetrics.metrics ? (
              <div className="space-y-4">
                <div className="text-sm text-gray-400">
                  Connected to AR.IO Gateway on port {gatewayMetrics.port} • {gatewayMetrics.metricsCount} metrics available
                </div>
                
                <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2">
                  {/* 1. Last Height Imported - Stat Panel */}
                  {gatewayMetrics.metrics.ario?.find((m: any) => m.name === 'last_height_imported') && (
                    <Card className="bg-gray-800 border-gray-700 md:col-span-2 lg:col-span-1">
                      <CardHeader>
                        <CardTitle className="text-white text-lg">Last Height Imported</CardTitle>
                      </CardHeader>
                      <CardContent className="flex items-center justify-center h-40">
                        <div className="text-center">
                          <div className="text-6xl font-bold text-green-400 mb-2">
                            {gatewayMetrics.metrics.ario.find((m: any) => m.name === 'last_height_imported')?.value.toLocaleString()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* 2. Memory Utilization - Time Series */}
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white text-lg">Memory Utilization</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Plot
                        data={[{
                          x: chartData.memory?.map(d => d.x) || [],
                          y: chartData.memory?.map(d => d.y) || [],
                          type: 'scatter',
                          mode: 'lines',
                          name: 'Memory Usage %',
                          line: { color: '#60a5fa', width: 2 },
                          hovertemplate: '%{y:.1f}%<extra></extra>'
                        }]}
                        layout={{
                          height: 350,
                          margin: { l: 50, r: 20, t: 20, b: 40 },
                          plot_bgcolor: 'transparent',
                          paper_bgcolor: 'transparent',
                          font: { color: '#9ca3af', size: 12 },
                          xaxis: { 
                            showgrid: true, 
                            gridcolor: '#374151', 
                            color: '#9ca3af',
                            type: 'date'
                          },
                          yaxis: { 
                            showgrid: true, 
                            gridcolor: '#374151', 
                            color: '#9ca3af', 
                            title: { text: 'Percent (%)', font: { color: '#9ca3af' } },
                            range: [0, 100]
                          },
                          showlegend: true,
                          legend: { 
                            x: 0, y: 1, 
                            bgcolor: 'transparent', 
                            bordercolor: 'transparent',
                            font: { color: '#9ca3af' }
                          }
                        }}
                        config={{ 
                          displayModeBar: false,
                          staticPlot: false,
                          scrollZoom: false,
                          doubleClick: false,
                          showTips: true,
                          displaylogo: false,
                          responsive: true,
                          modeBarButtonsToRemove: ['pan2d','select2d','lasso2d'],
                          autosizable: true
                        }}
                        style={{ width: '100%', height: '350px' }}
                      />
                    </CardContent>
                  </Card>
                  
                  {/* 3. CPU Utilization - Time Series */}
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white text-lg">CPU Utilization %</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Plot
                        data={[{
                          x: chartData.cpu?.map(d => d.x) || [],
                          y: chartData.cpu?.map(d => d.y) || [],
                          name: 'Average CPU %',
                          type: 'scatter',
                          mode: 'lines',
                          line: { color: '#1f77b4', width: 2 },
                          hovertemplate: '%{y:.1f}%<extra></extra>'
                        }]}
                        layout={{
                          height: 350,
                          margin: { l: 50, r: 20, t: 20, b: 40 },
                          plot_bgcolor: 'transparent',
                          paper_bgcolor: 'transparent',
                          font: { color: '#9ca3af', size: 12 },
                          xaxis: { 
                            showgrid: true, 
                            gridcolor: '#374151', 
                            color: '#9ca3af',
                            type: 'date'
                          },
                          yaxis: { 
                            showgrid: true, 
                            gridcolor: '#374151', 
                            color: '#9ca3af', 
                            title: { text: 'Percent (%)', font: { color: '#9ca3af' } },
                            range: [0, 100]
                          },
                          showlegend: true,
                          legend: { 
                            x: 0, y: 1, 
                            bgcolor: 'transparent', 
                            bordercolor: 'transparent',
                            font: { color: '#9ca3af' }
                          }
                        }}
                        config={{ 
                          displayModeBar: false,
                          staticPlot: false,
                          scrollZoom: false,
                          doubleClick: false,
                          showTips: true,
                          displaylogo: false,
                          responsive: true,
                          modeBarButtonsToRemove: ['pan2d','select2d','lasso2d'],
                          autosizable: true
                        }}
                        style={{ width: '100%', height: '350px' }}
                      />
                    </CardContent>
                  </Card>
                  
                  {/* 4. Request Count - Time Series */}
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white text-lg">Request Count</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Plot
                      data={[{
                        x: chartData.requests200?.map(d => d.x) || [],
                        y: chartData.requests200?.map(d => d.y) || [],
                        name: '200',
                        type: 'scatter',
                        mode: 'lines',
                        line: { color: '#10b981', width: 2 },
                        hovertemplate: '%{y:.0f} requests<extra></extra>'
                      }, {
                        x: chartData.requests5xx?.map(d => d.x) || [],
                        y: chartData.requests5xx?.map(d => d.y) || [],
                        name: '5xx',
                        type: 'scatter',
                        mode: 'lines',
                        line: { color: '#ef4444', width: 2 },
                        hovertemplate: '%{y:.0f} errors<extra></extra>'
                      }]}
                        layout={{
                          height: 350,
                          margin: { l: 40, r: 20, t: 20, b: 40 },
                          plot_bgcolor: 'transparent',
                          paper_bgcolor: 'transparent',
                          font: { color: '#9ca3af', size: 12 },
                          xaxis: { showgrid: true, gridcolor: '#374151', color: '#9ca3af', fixedrange: true },
                          yaxis: { showgrid: true, gridcolor: '#374151', color: '#9ca3af' },
                          legend: { x: 0, y: 1, bgcolor: 'transparent', bordercolor: 'transparent' }
                        }}
                        config={{ 
                          displayModeBar: false,
                          staticPlot: false,
                          scrollZoom: false,
                          doubleClick: false,
                          showTips: true,
                          displaylogo: false,
                          responsive: true,
                          modeBarButtonsToRemove: ['pan2d','select2d','lasso2d']
                        }}
                        style={{ width: '100%', height: '350px' }}
                      />
                    </CardContent>
                  </Card>
                  
                  {/* 5. ArNS Resolution - Time Series */}
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white text-lg">ArNS Resolution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Plot
                        data={[{
                          x: chartData.arnsResolution?.p50?.map(d => d.x) || [],
                          y: chartData.arnsResolution?.p50?.map(d => d.y) || [],
                          name: '50th percentile',
                          type: 'scatter',
                          mode: 'lines',
                          line: { color: '#06b6d4', width: 2 }
                        }, {
                          x: chartData.arnsResolution?.p99?.map(d => d.x) || [],
                          y: chartData.arnsResolution?.p99?.map(d => d.y) || [],
                          name: '99th percentile',
                          type: 'scatter',
                          mode: 'lines',
                          line: { color: '#f59e0b', width: 2 }
                        }]}
                        layout={{
                          height: 350,
                          margin: { l: 40, r: 20, t: 20, b: 40 },
                          plot_bgcolor: 'transparent',
                          paper_bgcolor: 'transparent',
                          font: { color: '#9ca3af', size: 12 },
                          xaxis: { showgrid: true, gridcolor: '#374151', color: '#9ca3af', fixedrange: true },
                          yaxis: { showgrid: true, gridcolor: '#374151', color: '#9ca3af', title: 'ms' },
                          legend: { x: 0, y: 1, bgcolor: 'transparent', bordercolor: 'transparent' }
                        }}
                        config={{ 
                          displayModeBar: false,
                          staticPlot: false,
                          scrollZoom: false,
                          doubleClick: false,
                          showTips: true,
                          displaylogo: false,
                          responsive: true,
                          modeBarButtonsToRemove: ['pan2d','select2d','lasso2d']
                        }}
                        style={{ width: '100%', height: '350px' }}
                      />
                    </CardContent>
                  </Card>
                  
                  {/* 6. ArNS Cache Hit Rate - Time Series */}
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white text-lg">ArNS Cache Hit Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Plot
                        data={[{
                          x: chartData.cacheHitRate?.map(d => d.x) || [],
                          y: chartData.cacheHitRate?.map(d => d.y) || [],
                          name: 'ArNS Cache Hit Rate',
                          type: 'scatter',
                          mode: 'lines',
                          line: { color: '#8b5cf6', width: 2 },
                          fill: 'tonexty',
                          fillcolor: 'rgba(139, 92, 246, 0.1)'
                        }]}
                        layout={{
                          height: 350,
                          margin: { l: 40, r: 20, t: 20, b: 40 },
                          plot_bgcolor: 'transparent',
                          paper_bgcolor: 'transparent',
                          font: { color: '#9ca3af', size: 12 },
                          xaxis: { showgrid: true, gridcolor: '#374151', color: '#9ca3af', fixedrange: true },
                          yaxis: { showgrid: true, gridcolor: '#374151', color: '#9ca3af', title: '%' },
                          legend: { x: 0, y: 1, bgcolor: 'transparent', bordercolor: 'transparent' }
                        }}
                        config={{ 
                          displayModeBar: false,
                          staticPlot: false,
                          scrollZoom: false,
                          doubleClick: false,
                          showTips: true,
                          displaylogo: false,
                          responsive: true,
                          modeBarButtonsToRemove: ['pan2d','select2d','lasso2d']
                        }}
                        style={{ width: '100%', height: '350px' }}
                      />
                    </CardContent>
                  </Card>
                  
                  {/* 7. Average Response Time - Time Series */}
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white text-lg">Average Response Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Plot
                        data={[{
                          x: chartData.responseTime?.map(d => d.x) || [],
                          y: chartData.responseTime?.map(d => d.y) || [],
                          name: 'Average Response Time (ms)',
                          type: 'scatter',
                          mode: 'lines',
                          line: { color: '#f97316', width: 2 }
                        }]}
                        layout={{
                          height: 350,
                          margin: { l: 40, r: 20, t: 20, b: 40 },
                          plot_bgcolor: 'transparent',
                          paper_bgcolor: 'transparent',
                          font: { color: '#9ca3af', size: 12 },
                          xaxis: { showgrid: true, gridcolor: '#374151', color: '#9ca3af', fixedrange: true },
                          yaxis: { showgrid: true, gridcolor: '#374151', color: '#9ca3af', title: 'ms', fixedrange: true }
                        }}
                        config={{ 
                          displayModeBar: false,
                          staticPlot: false,
                          scrollZoom: false,
                          doubleClick: false,
                          showTips: true,
                          displaylogo: false,
                          responsive: true,
                          modeBarButtonsToRemove: ['pan2d','select2d','lasso2d']
                        }}
                        style={{ width: '100%', height: '350px' }}
                      />
                    </CardContent>
                  </Card>
                  
                  {/* 8. GraphQL Requests - Time Series */}
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white text-lg">GraphQL Requests</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Plot
                        data={[{
                          x: chartData.graphqlRequests?.map(d => d.x) || [],
                          y: chartData.graphqlRequests?.map(d => d.y) || [],
                          name: '200',
                          type: 'scatter',
                          mode: 'lines',
                          line: { color: '#10b981', width: 2 }
                        }]}
                        layout={{
                          height: 350,
                          margin: { l: 40, r: 20, t: 20, b: 40 },
                          plot_bgcolor: 'transparent',
                          paper_bgcolor: 'transparent',
                          font: { color: '#9ca3af', size: 12 },
                          xaxis: { showgrid: true, gridcolor: '#374151', color: '#9ca3af', fixedrange: true },
                          yaxis: { showgrid: true, gridcolor: '#374151', color: '#9ca3af' }
                        }}
                        config={{ 
                          displayModeBar: false,
                          staticPlot: false,
                          scrollZoom: false,
                          doubleClick: false,
                          showTips: true,
                          displaylogo: false,
                          responsive: true,
                          modeBarButtonsToRemove: ['pan2d','select2d','lasso2d']
                        }}
                        style={{ width: '100%', height: '350px' }}
                      />
                    </CardContent>
                  </Card>
                  
                  {/* 9. File System Usage - Time Series */}
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white text-lg">File System Usage %</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Plot
                        data={[{
                          x: chartData.fsUsage?.map(d => d.x) || [],
                          y: chartData.fsUsage?.map(d => d.y) || [],
                          name: 'File System Usage %',
                          type: 'scatter',
                          mode: 'lines',
                          line: { color: '#06b6d4', width: 2 }
                        }]}
                        layout={{
                          height: 350,
                          margin: { l: 40, r: 20, t: 20, b: 40 },
                          plot_bgcolor: 'transparent',
                          paper_bgcolor: 'transparent',
                          font: { color: '#9ca3af', size: 12 },
                          xaxis: { showgrid: true, gridcolor: '#374151', color: '#9ca3af', fixedrange: true },
                          yaxis: { showgrid: true, gridcolor: '#374151', color: '#9ca3af', title: '%', fixedrange: true }
                        }}
                        config={{ 
                          displayModeBar: false,
                          staticPlot: false,
                          scrollZoom: false,
                          doubleClick: false,
                          showTips: true,
                          displaylogo: false,
                          responsive: true,
                          modeBarButtonsToRemove: ['pan2d','select2d','lasso2d']
                        }}
                        style={{ width: '100%', height: '350px' }}
                      />
                    </CardContent>
                  </Card>
                  
                  {/* 10. I/O Utilization - Time Series */}
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white text-lg">I/O Utilization</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Plot
                        data={[{
                          x: chartData.ioRead?.map(d => d.x) || [],
                          y: chartData.ioRead?.map(d => d.y) || [],
                          name: 'IO - read (bytes/sec)',
                          type: 'scatter',
                          mode: 'lines',
                          line: { color: '#10b981', width: 2 }
                        }, {
                          x: chartData.ioWrite?.map(d => d.x) || [],
                          y: chartData.ioWrite?.map(d => d.y) || [],
                          name: 'IO - write (bytes/sec)',
                          type: 'scatter',
                          mode: 'lines',
                          line: { color: '#f59e0b', width: 2 }
                        }]}
                        layout={{
                          height: 350,
                          margin: { l: 40, r: 20, t: 20, b: 40 },
                          plot_bgcolor: 'transparent',
                          paper_bgcolor: 'transparent',
                          font: { color: '#9ca3af', size: 12 },
                          xaxis: { showgrid: true, gridcolor: '#374151', color: '#9ca3af', fixedrange: true },
                          yaxis: { showgrid: true, gridcolor: '#374151', color: '#9ca3af', title: 'bytes/sec' },
                          legend: { x: 0, y: 1, bgcolor: 'transparent', bordercolor: 'transparent' }
                        }}
                        config={{ 
                          displayModeBar: false,
                          staticPlot: false,
                          scrollZoom: false,
                          doubleClick: false,
                          showTips: true,
                          displaylogo: false,
                          responsive: true,
                          modeBarButtonsToRemove: ['pan2d','select2d','lasso2d']
                        }}
                        style={{ width: '100%', height: '350px' }}
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>
          ) : (
            <Card className="dashboard-card">
              <CardContent className="p-6">
                <div className="text-center">
                  <Server className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Gateway Metrics Unavailable</h3>
                  <p className="text-gray-400 mb-2">
                    {gatewayMetrics?.error || 'Unable to connect to AR.IO Gateway'}
                  </p>
                  {gatewayMetrics?.details && (
                    <p className="text-sm text-gray-500">{gatewayMetrics.details}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-3">
                    Trying ports 3000 and 4000 on localhost
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Detailed Performance */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 icon-primary" />
              Performance Overview
            </CardTitle>
            <CardDescription className="text-gray-300"> {/* Adjusted text color */}
              Container performance metrics and trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-800 rounded">
                    <Cpu className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-white">CPU Cores</p>
                    <p className="text-sm text-gray-400">Available cores</p> {/* Adjusted text color */}
                  </div>
                </div>
                <span className="text-lg font-bold text-white">4</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-800 rounded">
                    <MemoryStick className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Memory Limit</p>
                    <p className="text-sm text-gray-400">Container limit</p> {/* Adjusted text color */}
                  </div>
                </div>
                <span className="text-lg font-bold text-white">2GB</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-800 rounded">
                    <HardDrive className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Disk I/O</p>
                    <p className="text-sm text-gray-400">Read/Write speed</p> {/* Adjusted text color */}
                  </div>
                </div>
                <span className="text-lg font-bold text-white">45MB/s</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 icon-primary" />
              Resource Alerts
            </CardTitle>
            <CardDescription className="text-gray-300"> {/* Adjusted text color */}
              Current alerts and recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(metrics?.cpu || 0) > 80 && (
                <div className="flex items-center gap-3 p-3 bg-gray-800 border border-gray-600 rounded-lg">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <div>
                    <p className="font-medium text-white">High CPU Usage</p>
                    <p className="text-sm text-gray-300">CPU usage is above 80%</p>
                  </div>
                </div>
              )}
              
              {(metrics?.memory || 0) > 80 && (
                <div className="flex items-center gap-3 p-3 bg-gray-800 border border-gray-600 rounded-lg">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <div>
                    <p className="font-medium text-white">High Memory Usage</p>
                    <p className="text-sm text-gray-300">Memory usage is above 80%</p>
                  </div>
                </div>
              )}

              {(metrics?.cpu || 0) <= 80 && (metrics?.memory || 0) <= 80 && (
                <div className="flex items-center gap-3 p-3 bg-gray-800 border border-gray-600 rounded-lg">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <div>
                    <p className="font-medium text-white">System Healthy</p>
                    <p className="text-sm text-gray-300">All metrics within normal range</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
