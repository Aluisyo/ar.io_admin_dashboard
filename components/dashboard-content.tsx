'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Cpu, HardDrive, MemoryStick, Activity, Server, Database, TrendingUp, AlertTriangle, BarChart3, Network, Globe, Zap, Layers, GitBranch, Timer, CheckCircle2, RotateCcw, Power, FolderArchive, Download } from 'lucide-react'
import dynamic from 'next/dynamic'
import { Layout, Data } from 'plotly.js';
import { notifyRestart, notifyStopAll, notifyStartAll, notifyBackup, notifyUpdate, notifyError } from '@/lib/add-notification'
import { apiGet, apiPost } from '@/lib/api-utils'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

interface SystemStats {
  cpu: number
  memory: number
  storage: number
}

interface ServiceStatus {
  name: string
  container: string
  status: 'running' | 'stopped' | 'error'
  uptime: string
  cpu: number
  memory: number
  ports: string[]
  serviceId: string
}

interface PrometheusMetrics {
  available: boolean
  metrics?: any
  timestamp?: string
  error?: string
  details?: string
  metricsCount?: number
}

interface DashboardContentProps {
  onSectionChange: (section: string, service?: string) => void
}

export function DashboardContent({ onSectionChange }: DashboardContentProps) {
  const [stats, setStats] = useState<SystemStats>({ cpu: 0, memory: 0, storage: 0 })
  const [services, setServices] = useState<ServiceStatus[]>([])
  const [prometheusMetrics, setPrometheusMetrics] = useState<PrometheusMetrics | null>(null)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [actionResults, setActionResults] = useState<Record<string, { success: boolean, message: string }>>({})
  const [showPruneOption, setShowPruneOption] = useState(false)
  const [performPrune, setPerformPrune] = useState(false)
  const [forceUpdate, setForceUpdate] = useState(false)
  const [handleChanges, setHandleChanges] = useState<'stash' | 'reset' | 'backup'>('stash')
  
  // Store historical data points for real-time charts
  const [historicalData, setHistoricalData] = useState<{
    timestamps: Date[],
    memory: number[],
    cpu: number[],
    storage: number[]
  }>({ timestamps: [], memory: [], cpu: [], storage: []})  
  
  // State for real-time chart data
  const [chartData, setChartData] = useState<Record<string, any>>({})  
  
  const nonAdminServices = services.filter(s => s.serviceId !== 'admin')
  const runningServices = services.filter(s => s.status === 'running').length
  const runningNonAdminServices = nonAdminServices.filter(s => s.status === 'running').length
  const stoppedNonAdminServices = nonAdminServices.filter(s => s.status === 'stopped').length
  const shouldShowStartAll = runningNonAdminServices === 0 && stoppedNonAdminServices > 0
  
  // Move fetch functions to component scope so they can be accessed by other functions
  // Use useCallback to prevent infinite re-renders in useEffect
  const fetchStats = useCallback(async () => {
    try {
      const response = await apiGet('/api/system/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
        
        // Update historical data for real-time charts (keep last 20 points)
        setHistoricalData(prev => {
          const newTimestamps = [...prev.timestamps, new Date()].slice(-20)
          const newMemory = [...prev.memory, data.memory].slice(-20)
          const newCpu = [...prev.cpu, data.cpu].slice(-20)
          const newStorage = [...prev.storage, data.storage].slice(-20)
          
          return {
            timestamps: newTimestamps,
            memory: newMemory,
            cpu: newCpu,
            storage: newStorage
          }
        })
      }
    } catch (error) {
      console.error('Failed to fetch system stats:', error)
    }
  }, [])

  const fetchServices = useCallback(async () => {
    try {
      const response = await apiGet('/api/docker/containers')
      if (response.ok) {
        const data = await response.json()
        setServices(data)
      }
    } catch (error) {
      console.error('Failed to fetch services:', error)
    }
  }, [])

  const fetchPrometheusMetrics = useCallback(async () => {
    try {
      const response = await apiGet('/api/prometheus/metrics')
      if (response.ok) {
        const data = await response.json()
        console.log('Prometheus metrics data:', data)
        console.log('Metrics available:', data.available)
        console.log('Metrics count:', data.metricsCount)
        console.log('Metrics object keys:', Object.keys(data.metrics || {}))
        setPrometheusMetrics(data)
        
        // Update chart data with real-time Prometheus data
        updateChartData(data)
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }))
        console.error('Prometheus API error:', response.status, errorData)
        setPrometheusMetrics({
          available: false,
          error: errorData.error || `HTTP ${response.status}`,
          details: errorData.details || response.statusText
        })
      }
    } catch (error) {
      console.error('Failed to fetch Prometheus metrics:', error)
      setPrometheusMetrics({
        available: false,
        error: 'Network error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }, [])
  
  const updateChartData = useCallback((prometheusData: PrometheusMetrics) => {
    const now = new Date()
    
    setChartData(prevData => {
      const newData = { ...prevData }
      
      // Update file system usage with historical storage data
      if (historicalData.timestamps.length > 0) {
        newData.fsUsage = historicalData.timestamps.map((timestamp, index) => ({
          x: timestamp,
          y: historicalData.storage[index]
        }))
      }
      
      // Initialize other charts with placeholder data if Prometheus has metrics
      if (prometheusData.available && prometheusData.metrics) {
        // ArNS Resolution - use Prometheus metrics if available
        if (prometheusData.metrics.arns && Array.isArray(prometheusData.metrics.arns)) {
          // Look for ArNS resolution time metrics (p50, p95, p99)
          const p50Metric = prometheusData.metrics.arns.find((m: any) => 
            m.name?.includes('resolution_time') && m.name?.includes('p50')
          )
          const p99Metric = prometheusData.metrics.arns.find((m: any) => 
            m.name?.includes('resolution_time') && (m.name?.includes('p99') || m.name?.includes('p95'))
          )
          
          // Use real data if available, fallback to reasonable defaults
          const p50Value = p50Metric ? p50Metric.value * 1000 : 150 // Convert to ms if needed
          const p99Value = p99Metric ? p99Metric.value * 1000 : 300 // Convert to ms if needed
          
          // Update historical data (keep last 10 points)
          const existingP50 = prevData.arnsResolution?.p50 || []
          const existingP99 = prevData.arnsResolution?.p99 || []
          
          newData.arnsResolution = {
            p50: [...existingP50, { x: now, y: p50Value }].slice(-10),
            p99: [...existingP99, { x: now, y: p99Value }].slice(-10)
          }
        }
        
        // Cache hit rate from ArNS metrics
        if (prometheusData.metrics.arns && Array.isArray(prometheusData.metrics.arns)) {
          const cacheHitMetric = prometheusData.metrics.arns.find((m: any) => 
            m.name?.includes('cache') && m.name?.includes('hit')
          )
          const cacheRatio = prometheusData.metrics.arns.find((m: any) => 
            m.name?.includes('cache_ratio') || m.name?.includes('hit_rate')
          )
          
          // Use real data if available, calculate percentage
          let hitRate = 85 // Default fallback
          if (cacheHitMetric) {
            hitRate = cacheHitMetric.value * 100 // Convert to percentage
          } else if (cacheRatio) {
            hitRate = cacheRatio.value // Assume already percentage
          }
          
          // Update historical data (keep last 10 points)
          const existingData = prevData.cacheHitRate || []
          newData.cacheHitRate = [...existingData, { x: now, y: Math.min(100, Math.max(0, hitRate)) }].slice(-10)
        }
        
        // Response time from HTTP metrics
        if (prometheusData.metrics.http && Array.isArray(prometheusData.metrics.http)) {
          const responseTimeMetric = prometheusData.metrics.http.find((m: any) => 
            m.name?.includes('duration') || m.name?.includes('response_time') || m.name?.includes('latency')
          )
          const httpDurationMetric = prometheusData.metrics.http.find((m: any) => 
            m.name === 'http_request_duration_seconds' || m.name?.includes('http_duration')
          )
          
          let responseTime = 200 // Default fallback in ms
          if (responseTimeMetric) {
            // Convert to milliseconds if needed
            responseTime = responseTimeMetric.value > 10 ? responseTimeMetric.value : responseTimeMetric.value * 1000
          } else if (httpDurationMetric) {
            // Convert seconds to milliseconds
            responseTime = httpDurationMetric.value * 1000
          }
          
          // Update historical data (keep last 10 points)
          const existingData = prevData.responseTime || []
          newData.responseTime = [...existingData, { x: now, y: Math.max(0, responseTime) }].slice(-10)
        }
        
        // GraphQL requests from HTTP metrics
        if (prometheusData.metrics.http && Array.isArray(prometheusData.metrics.http)) {
          const graphqlMetric = prometheusData.metrics.http.find((m: any) => 
            m.name?.toLowerCase().includes('graphql') || m.name?.includes('gql')
          )
          const httpRequestsMetric = prometheusData.metrics.http.find((m: any) => 
            m.name?.includes('http_requests_total') || (m.name?.includes('request') && m.name?.includes('total'))
          )
          const requestsCount = prometheusData.metrics.http.find((m: any) => 
            m.name?.includes('requests') && !m.name?.includes('duration')
          )
          
          let requestCount = 15 // Default fallback
          if (graphqlMetric) {
            requestCount = graphqlMetric.value
          } else if (httpRequestsMetric) {
            // Use a fraction of total HTTP requests as GraphQL estimate
            requestCount = Math.round(httpRequestsMetric.value * 0.1)
          } else if (requestsCount) {
            requestCount = requestsCount.value
          }
          
          // Update historical data (keep last 10 points)
          const existingData = prevData.graphqlRequests || []
          newData.graphqlRequests = [...existingData, { x: now, y: Math.max(0, requestCount) }].slice(-10)
        }
        
        // I/O metrics from various sources
        let ioReadValue = 750000  // Default fallback
        let ioWriteValue = 550000 // Default fallback
        
        // Check AR.IO specific metrics first
        if (prometheusData.metrics.ario && Array.isArray(prometheusData.metrics.ario)) {
          const ioReadMetric = prometheusData.metrics.ario.find((m: any) => 
            m.name?.includes('io_read') || m.name?.includes('disk_read')
          )
          const ioWriteMetric = prometheusData.metrics.ario.find((m: any) => 
            m.name?.includes('io_write') || m.name?.includes('disk_write')
          )
          
          if (ioReadMetric) ioReadValue = ioReadMetric.value
          if (ioWriteMetric) ioWriteValue = ioWriteMetric.value
        }
        
        // Fallback to HTTP metrics if available
        if (prometheusData.metrics.http && Array.isArray(prometheusData.metrics.http) && ioReadValue === 750000) {
          const networkInMetric = prometheusData.metrics.http.find((m: any) => 
            m.name?.includes('bytes_received') || m.name?.includes('network_in')
          )
          const networkOutMetric = prometheusData.metrics.http.find((m: any) => 
            m.name?.includes('bytes_sent') || m.name?.includes('network_out')
          )
          
          if (networkInMetric) ioReadValue = networkInMetric.value
          if (networkOutMetric) ioWriteValue = networkOutMetric.value
        }
        
        // Update historical data (keep last 10 points)
        const existingReadData = prevData.ioRead || []
        const existingWriteData = prevData.ioWrite || []
        
        newData.ioRead = [...existingReadData, { x: now, y: Math.max(0, ioReadValue) }].slice(-10)
        newData.ioWrite = [...existingWriteData, { x: now, y: Math.max(0, ioWriteValue) }].slice(-10)
      }
      
      return newData
    })
  }, [historicalData])

  useEffect(() => {
    fetchStats()
    fetchServices()
    fetchPrometheusMetrics()
    
    const interval = setInterval(() => {
      fetchStats()
      fetchServices()
      fetchPrometheusMetrics()
    }, 5000)
    return () => clearInterval(interval)
  }, [fetchStats, fetchServices, fetchPrometheusMetrics])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'status-running'
      case 'stopped': return 'status-stopped'
      default: return 'status-unknown'
    }
  }

  const handleQuickAction = async (actionType: string) => {
    setActionLoading(prev => ({ ...prev, [actionType]: true }))
    setActionResults(prev => ({ ...prev, [actionType]: { success: false, message: '' } }))
    
    try {
      let requestBody = {}
      if (actionType === 'update-node') {
        requestBody = { performPrune, forceUpdate, handleChanges }
      }
      
      const response = await apiPost(`/api/actions/${actionType}`, requestBody)
      const data = await response.json()
      
      if (response.ok) {
        console.log(`${actionType} action successful!`, data)
        
        if (actionType === 'restart-all') {
          await notifyRestart()
        } else if (actionType === 'stop-all') {
          await notifyStopAll(data.details || data.message || 'All containers stopped')
        } else if (actionType === 'start-all') {
          await notifyStartAll(data)
        } else if (actionType === 'backup-config') {
          await notifyBackup(data.details)
        } else if (actionType === 'update-node') {
          await notifyUpdate(data.details)
        }
        
        // Set success result with detailed message
        let successMessage = data.message || `${actionType} completed successfully`
        if (data.details && actionType === 'backup-config') {
          successMessage += ` (${data.details.filesBackedUp} files, ${data.details.fileSize}) - saved to ${data.details.backupPath}`
        } else if (data.details && actionType === 'update-node') {
          if (data.details.networkTrafficAvoided === true) {
            successMessage = 'AR.IO Node is already up to date. No updates needed.'
          } else if (data.details.repositoryUpdated === false && data.details.dockerImagesUpdated === false) {
            successMessage = 'AR.IO Node is already up to date. No updates needed.'
          } else {
            const updates = []
            if (data.details.repositoryUpdated) updates.push('code')
            if (data.details.dockerImagesUpdated) {
              if (data.details.dockerImagesBuilt) {
                updates.push('images (built from source)')
              } else {
                updates.push('images (pulled)')
              }
            }
            const updateType = updates.length > 0 ? ` (updated: ${updates.join(', ')})` : ''
            
            let customChangesInfo = ''
            if (data.details.customChangesHandled) {
              customChangesInfo = ` Custom changes ${data.details.customChangesStrategy}: ${data.details.customChangesResult}`
              if (data.details.backupBranch) {
                customChangesInfo += ` Backup: ${data.details.backupBranch}`
              }
            }
            
            successMessage += `${updateType} (${data.details.servicesRunning}/${data.details.totalServices} services)${customChangesInfo}`
          }
        } else if (actionType === 'stop-all') {
          if (data.stopped > 0) {
            successMessage = `Successfully stopped ${data.stopped} container${data.stopped !== 1 ? 's' : ''}`
            if (data.failed > 0) {
              successMessage += ` (${data.failed} failed to stop)`
            }
          } else {
            successMessage = 'No containers were running to stop'
          }
        } else if (actionType === 'start-all') {
          if (data.started > 0) {
            successMessage = `Successfully started ${data.started} container${data.started !== 1 ? 's' : ''}`
            if (data.failed > 0) {
              successMessage += ` (${data.failed} failed to start)`
            }
          } else {
            successMessage = 'No containers were stopped to start'
          }
        } else if (actionType === 'restart-all') {
          if (data.restarted > 0) {
            successMessage = `Successfully restarted ${data.restarted} container${data.restarted !== 1 ? 's' : ''}`
            if (data.failed > 0) {
              successMessage += ` (${data.failed} failed to restart)`
            }
          } else {
            successMessage = 'No containers were found to restart'
          }
        }
        
        setActionResults(prev => ({ 
          ...prev, 
          [actionType]: { success: true, message: successMessage } 
        }))
        
        // Show success message for a few seconds, then clear
        setTimeout(() => {
          setActionResults(prev => ({ ...prev, [actionType]: { success: false, message: '' } }))
          // For restart actions, manually refresh data instead of full page reload
          if (actionType === 'restart-all') {
            // Refresh data after containers have had time to start
            setTimeout(() => {
              fetchStats()
              fetchServices()
              fetchPrometheusMetrics()
            }, 3000)
          }
        }, 5000)
      } else {
        const errorMessage = data.error || `Failed to perform ${actionType} action`
        console.error(`Failed to perform ${actionType} action:`, data)
        
        // Send error notification
        await notifyError(actionType, errorMessage)
        
        setActionResults(prev => ({ 
          ...prev, 
          [actionType]: { success: false, message: `Error: ${errorMessage}` } 
        }))
        
        // Clear error message after 8 seconds
        setTimeout(() => {
          setActionResults(prev => ({ ...prev, [actionType]: { success: false, message: '' } }))
        }, 8000)
      }
    } catch (error) {
      console.error(`Error performing ${actionType} action:`, error)
      const errorMessage = error instanceof Error ? error.message : 'Network error occurred'
      
      setActionResults(prev => ({ 
        ...prev, 
        [actionType]: { success: false, message: `Network error: ${errorMessage}` } 
      }))
      
      // Clear error message after 8 seconds
      setTimeout(() => {
        setActionResults(prev => ({ ...prev, [actionType]: { success: false, message: '' } }))
      }, 8000)
    } finally {
      setActionLoading(prev => ({ ...prev, [actionType]: false }))
    }
  }

  const totalServices = services.length

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Database className="h-5 w-5 icon-primary" />
            Quick Actions
          </CardTitle>
          <CardDescription className="text-gray-300">
            Common administrative tasks for AR.IO node
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button 
              className="group relative p-4 text-left bg-gray-900 hover:bg-gray-800 rounded-lg transition-all duration-300 border border-gray-700 hover:border-gray-500 min-h-[120px] flex flex-col items-start justify-start"
              onClick={() => handleQuickAction('restart-all')}
              disabled={actionLoading['restart-all']}
            >
              <div className="flex items-center justify-between w-full mb-3">
                <div className="p-2 bg-gray-800 rounded-lg group-hover:bg-gray-700 transition-colors">
                  <RotateCcw className={`h-5 w-5 text-white ${actionLoading['restart-all'] ? 'animate-spin' : ''} transition-transform duration-300`} />
                </div>
                {actionLoading['restart-all'] && (
                  <div className="flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse animation-delay-200"></div>
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse animation-delay-400"></div>
                  </div>
                )}
              </div>
              <div className="space-y-1 flex-1">
                <div className="font-semibold text-white text-base leading-tight">Restart All Services</div>
                <div className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                  {actionLoading['restart-all'] ? 'Restarting containers...' : 'Restart all running containers'}
                </div>
              </div>
            </Button>
            
            <Button 
              className="group relative p-4 text-left bg-gray-900 hover:bg-gray-800 rounded-lg transition-all duration-300 border border-gray-700 hover:border-gray-500 min-h-[120px] flex flex-col items-start justify-start"
              onClick={() => handleQuickAction(shouldShowStartAll ? 'start-all' : 'stop-all')}
              disabled={actionLoading['stop-all'] || actionLoading['start-all']}
            >
              <div className="flex items-center justify-between w-full mb-3">
                <div className="p-2 bg-gray-800 rounded-lg group-hover:bg-gray-700 transition-colors">
                  <Power className={`h-5 w-5 text-white transition-all duration-300 ${(actionLoading['stop-all'] || actionLoading['start-all']) ? 'animate-pulse' : ''}`} />
                </div>
                {(actionLoading['stop-all'] || actionLoading['start-all']) && (
                  <div className="flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse animation-delay-200"></div>
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse animation-delay-400"></div>
                  </div>
                )}
              </div>
              <div className="space-y-1 flex-1">
                <div className="font-semibold text-white text-base leading-tight">
                  {shouldShowStartAll ? 'Start All Services' : 'Stop All Services'}
                </div>
                <div className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                  {actionLoading['stop-all'] ? 'Stopping containers...' : 
                   actionLoading['start-all'] ? 'Starting containers...' : 
                   shouldShowStartAll ? 'Start all stopped containers' : 'Stop all running containers'}
                </div>
              </div>
            </Button>
            
            <Button 
              className="group relative p-4 text-left bg-gray-900 hover:bg-gray-800 rounded-lg transition-all duration-300 border border-gray-700 hover:border-gray-500 min-h-[120px] flex flex-col items-start justify-start"
              onClick={() => handleQuickAction('backup-config')}
              disabled={actionLoading['backup-config']}
            >
              <div className="flex items-center justify-between w-full mb-3">
                <div className="p-2 bg-gray-800 rounded-lg group-hover:bg-gray-700 transition-colors">
                  <FolderArchive className={`h-5 w-5 text-white ${actionLoading['backup-config'] ? 'animate-bounce' : ''} transition-transform duration-300`} />
                </div>
                {actionLoading['backup-config'] && (
                  <div className="flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse animation-delay-200"></div>
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse animation-delay-400"></div>
                  </div>
                )}
              </div>
              <div className="space-y-1 flex-1">
                <div className="font-semibold text-white text-base leading-tight">Backup Configuration</div>
                <div className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                  {actionLoading['backup-config'] ? 'Creating backup...' : 'Create configuration backup'}
                </div>
              </div>
            </Button>
            
            <Button 
              className="group relative p-4 text-left bg-gray-900 hover:bg-gray-800 rounded-lg transition-all duration-300 border border-gray-700 hover:border-gray-500 min-h-[120px] flex flex-col items-start justify-start"
              onClick={() => {
                if (showPruneOption) {
                  handleQuickAction('update-node')
                  setShowPruneOption(false)
                } else {
                  setShowPruneOption(true)
                }
              }}
              disabled={actionLoading['update-node']}
            >
              <div className="flex items-center justify-between w-full mb-3">
                <div className="p-2 bg-gray-800 rounded-lg group-hover:bg-gray-700 transition-colors">
                  <Download className={`h-5 w-5 text-white ${actionLoading['update-node'] ? 'animate-pulse' : ''} transition-transform duration-300`} />
                </div>
                {actionLoading['update-node'] && (
                  <div className="flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse animation-delay-200"></div>
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse animation-delay-400"></div>
                  </div>
                )}
              </div>
              <div className="space-y-1 flex-1">
                <div className="font-semibold text-white text-base leading-tight">Update Node</div>
                <div className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                  {actionLoading['update-node'] ? 'Updating node...' : showPruneOption ? 'Configure options below' : 'Update to latest version'}
                </div>
              </div>
            </Button>
          </div>
          
          {/* Docker Prune Option (only shown when user clicks Update Node) */}
          {showPruneOption && (
            <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
              <div className="space-y-4">
                <div className="space-y-3">
                  {/* Force Update Option */}
                  <div className="flex items-start space-x-3">
                    <div className="flex items-center space-x-2 mt-1">
                      <input
                        type="checkbox"
                        id="forceUpdate"
                        checked={forceUpdate}
                        onChange={(e) => setForceUpdate(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <label htmlFor="forceUpdate" className="text-sm font-medium text-white cursor-pointer">
                        Force Update (Skip Version Check)
                      </label>
                    </div>
                  </div>
                  <div className="ml-6 space-y-2">
                    <p className="text-sm text-gray-300">
                      Bypasses version checking and proceeds with update regardless of current version.
                    </p>
                    <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-blue-200 space-y-1">
                          <p className="font-medium">Bandwidth Optimization</p>
                          <p>By default, the system checks current vs. latest versions to avoid unnecessary updates and save bandwidth.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Custom Changes Handling */}
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-white">
                      Handle Custom Changes:
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex items-start space-x-3">
                        <div className="flex items-center space-x-2 mt-1">
                          <input
                            type="radio"
                            id="handleStash"
                            name="handleChanges"
                            value="stash"
                            checked={handleChanges === 'stash'}
                            onChange={(e) => setHandleChanges(e.target.value as 'stash')}
                            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500 focus:ring-2"
                          />
                          <label htmlFor="handleStash" className="text-sm font-medium text-white cursor-pointer">
                            Stash Changes (Recommended)
                          </label>
                        </div>
                      </div>
                      <div className="ml-6">
                        <p className="text-xs text-gray-300">
                          Temporarily saves your custom changes. Use `git stash pop` to restore them after update.
                        </p>
                      </div>
                      
                      <div className="flex items-start space-x-3">
                        <div className="flex items-center space-x-2 mt-1">
                          <input
                            type="radio"
                            id="handleBackup"
                            name="handleChanges"
                            value="backup"
                            checked={handleChanges === 'backup'}
                            onChange={(e) => setHandleChanges(e.target.value as 'backup')}
                            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500 focus:ring-2"
                          />
                          <label htmlFor="handleBackup" className="text-sm font-medium text-white cursor-pointer">
                            Backup to Branch
                          </label>
                        </div>
                      </div>
                      <div className="ml-6">
                        <p className="text-xs text-gray-300">
                          Creates a backup branch with your changes, then resets to clean state.
                        </p>
                      </div>
                      
                      <div className="flex items-start space-x-3">
                        <div className="flex items-center space-x-2 mt-1">
                          <input
                            type="radio"
                            id="handleReset"
                            name="handleChanges"
                            value="reset"
                            checked={handleChanges === 'reset'}
                            onChange={(e) => setHandleChanges(e.target.value as 'reset')}
                            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500 focus:ring-2"
                          />
                          <label htmlFor="handleReset" className="text-sm font-medium text-white cursor-pointer">
                            Discard Changes (Permanent)
                          </label>
                        </div>
                      </div>
                      <div className="ml-6">
                        <p className="text-xs text-gray-300">
                          Permanently discards all custom changes. Cannot be undone.
                        </p>
                        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-2 mt-1">
                          <div className="flex items-start space-x-2">
                            <AlertTriangle className="h-3 w-3 text-red-400 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-red-200">Warning: This will permanently delete your custom changes.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Docker Prune Option */}
                  <div className="flex items-start space-x-3">
                    <div className="flex items-center space-x-2 mt-1">
                      <input
                        type="checkbox"
                        id="performPrune"
                        checked={performPrune}
                        onChange={(e) => setPerformPrune(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <label htmlFor="performPrune" className="text-sm font-medium text-white cursor-pointer">
                        Enable Docker System Prune (Optional)
                      </label>
                    </div>
                  </div>
                </div>
                <div className="ml-6 space-y-2">
                  <p className="text-sm text-gray-300">
                    Removes all unused Docker containers, networks, images, and build cache.
                  </p>
                  <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-yellow-200 space-y-1">
                        <p className="font-medium">Warning: System-wide cleanup</p>
                        <p>This removes ALL unused containers, networks, and images on your system, not just AR.IO related ones.</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 pt-2">
                  <Button
                    onClick={() => handleQuickAction('update-node')}
                    disabled={actionLoading['update-node']}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                  >
                    {actionLoading['update-node'] ? 'Updating...' : 'Start Update'}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowPruneOption(false)
                      setPerformPrune(false)
                      setForceUpdate(false)
                      setHandleChanges('stash')
                    }}
                    variant="ghost"
                    className="text-gray-400 hover:text-white hover:bg-gray-700/50 px-4 py-2 transition-colors border border-gray-600 hover:border-gray-500"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* Action Results Display */}
          {Object.entries(actionResults).map(([action, result]) => {
            if (!result.message) return null;
            
            return (
              <div 
                key={action}
                className={`mt-6 p-4 rounded-xl border-l-4 flex items-start gap-3 transition-all duration-300 ${
                  result.success 
                    ? 'bg-gradient-to-r from-green-900/20 to-green-800/10 border-l-green-400 border border-green-800/50' 
                    : 'bg-gradient-to-r from-red-900/20 to-red-800/10 border-l-red-400 border border-red-800/50'
                }`}
              >
                <div className={`p-2 rounded-lg ${
                  result.success ? 'bg-green-600/20' : 'bg-red-600/20'
                }`}>
                  {result.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-sm ${
                    result.success ? 'text-green-300' : 'text-red-300'
                  }`}>
                    {result.success ? 'Action Completed Successfully' : 'Action Failed'}
                  </div>
                  <div className="text-sm text-gray-300 mt-1 break-words">
                    {result.message}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Header Stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="metric-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">System CPU</CardTitle>
            <div className="p-2 bg-gray-800 rounded-lg">
              <Cpu className="h-4 w-4 icon-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.cpu}%</div>
            <Progress value={stats.cpu} className="mt-3 h-2" />
            <p className="text-xs text-gray-400 mt-2">
              {stats.cpu > 80 ? 'High usage' : stats.cpu > 50 ? 'Moderate usage' : 'Normal usage'}
            </p>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Memory</CardTitle>
            <div className="p-2 bg-gray-800 rounded-lg">
              <MemoryStick className="h-4 w-4 icon-info" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.memory}%</div>
            <Progress value={stats.memory} className="mt-3 h-2" />
            <p className="text-xs text-gray-400 mt-2">
              {stats.memory > 80 ? 'High usage' : stats.memory > 50 ? 'Moderate usage' : 'Normal usage'}
            </p>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Storage</CardTitle>
            <div className="p-2 bg-gray-800 rounded-lg">
              <HardDrive className="h-4 w-4 icon-warning" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.storage}%</div>
            <Progress value={stats.storage} className="mt-3 h-2" />
            <p className="text-xs text-gray-400 mt-2">
              {stats.storage > 80 ? 'High usage' : stats.storage > 50 ? 'Moderate usage' : 'Normal usage'}
            </p>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Services</CardTitle>
            <div className="p-2 bg-gray-800 rounded-lg">
              <Server className="h-4 w-4 icon-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{runningServices}/{totalServices}</div>
            <div className="flex items-center mt-3">
              <div className="flex-1 bg-gray-800 rounded-full h-2">
                <div 
                  className="bg-white h-2 rounded-full transition-all duration-300"
                  style={{ width: `${totalServices > 0 ? (runningServices / totalServices) * 100 : 0}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {runningServices === totalServices ? 'All services running' : `${totalServices - runningServices} services down`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Prometheus Metrics Section */}
      <div className="grid gap-6">
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <BarChart3 className="h-5 w-5 icon-primary" />
              AR.IO Gateway Metrics
              {prometheusMetrics && !prometheusMetrics.available && (
                <AlertTriangle className="h-4 w-4 icon-error ml-2" />
              )}
            </CardTitle>
            <CardDescription className="text-gray-300">
              {prometheusMetrics?.available 
                ? `Live metrics from AR.IO Gateway (${prometheusMetrics.metricsCount || 0} metrics)` 
                : 'AR.IO Gateway metrics unavailable'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {prometheusMetrics?.available && prometheusMetrics.metrics ? (
                <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2">
                  {/* 1. Last Height Imported - Stat Panel */}
                  {prometheusMetrics.metrics.ario && Array.isArray(prometheusMetrics.metrics.ario) && prometheusMetrics.metrics.ario.find((m: any) => m.name === 'last_height_imported') && (
                    <Card className="bg-gray-800 border-gray-700 md:col-span-2 lg:col-span-1">
                      <CardHeader>
                        <CardTitle className="text-white text-lg">Last Height Imported</CardTitle>
                      </CardHeader>
                      <CardContent className="flex items-center justify-center h-40">
                        <div className="text-center">
                          <div className="text-6xl font-bold text-white mb-2">
                            {prometheusMetrics.metrics.ario.find((m: any) => m.name === 'last_height_imported')?.value.toLocaleString()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* 2. Memory Utilization - Real Time */}
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white text-lg">Memory Utilization (Real-Time)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {historicalData.timestamps.length > 0 ? (
                        <Plot
                          data={[{
                            x: historicalData.timestamps,
                            y: historicalData.memory,
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
          modeBarButtonsToRemove: ['pan2d','select2d','lasso2d','zoom2d','zoomIn2d','zoomOut2d','autoScale2d','resetScale2d'],
          autosizable: true
        }}
                        style={{ width: '100%', height: '350px' }}
                        useResizeHandler={true}
                      />
                      ) : (
                        <div className="flex items-center justify-center h-64">
                          <div className="text-gray-400 text-center">
                            <div className="text-lg font-semibold mb-2">{stats.memory}%</div>
                            <div className="text-sm">Current Memory Usage</div>
                            <div className="text-xs mt-2">Collecting historical data...</div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* 3. CPU Utilization - Real Time */}
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white text-lg">CPU Utilization (Real-Time)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {historicalData.timestamps.length > 0 ? (
                        <Plot
                          data={[{
                            x: historicalData.timestamps,
                            y: historicalData.cpu,
                            name: 'CPU Usage %',
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
          modeBarButtonsToRemove: ['pan2d','select2d','lasso2d','zoom2d','zoomIn2d','zoomOut2d','autoScale2d','resetScale2d'],
          autosizable: true
                        }}
                        style={{ width: '100%', height: '350px' }}
                        useResizeHandler={true}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-64">
                          <div className="text-gray-400 text-center">
                            <div className="text-lg font-semibold mb-2">{stats.cpu}%</div>
                            <div className="text-sm">Current CPU Usage</div>
                            <div className="text-xs mt-2">Collecting historical data...</div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* 4. HTTP Request Metrics - Bar Chart */}
                  {prometheusMetrics.metrics.http && Array.isArray(prometheusMetrics.metrics.http) && (
                    <Card className="bg-gray-800 border-gray-700">
                      <CardHeader>
                        <CardTitle className="text-white text-lg">HTTP Request Metrics</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Plot
                          data={[{
                            x: prometheusMetrics.metrics.http.slice(0, 8).map((metric: any) => {
                              // Clean up metric names for better display
                              let name = metric.displayName || metric.name || 'Unknown'
                              if (name.includes('request_duration_seconds')) {
                                return 'Avg Response Time'
                              } else if (name.includes('requests_total')) {
                                return 'Total Requests'
                              } else if (name.includes('active_requests')) {
                                return 'Active Requests'
                              } else if (name.length > 20) {
                                return name.substring(0, 17) + '...'
                              }
                              return name
                            }),
                            y: prometheusMetrics.metrics.http.slice(0, 8).map((metric: any) => 
                              typeof metric.value === 'number' ? metric.value : 0
                            ),
                            type: 'bar',
                            marker: {
                              color: ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316', '#84cc16', '#06b6d4']
                            },
                            hovertemplate: '%{x}<br>Value: %{y}<extra></extra>'
                          }]}
                          layout={{
                            height: 350,
                            margin: { l: 60, r: 20, t: 20, b: 80 },
                            plot_bgcolor: 'transparent',
                            paper_bgcolor: 'transparent',
                            font: { color: '#9ca3af', size: 11 },
                            xaxis: { 
                              showgrid: false, 
                              color: '#9ca3af',
                              tickangle: -45,
                              tickfont: { size: 10 }
                            },
                            yaxis: { 
                              showgrid: true, 
                              gridcolor: '#374151', 
                              color: '#9ca3af',
                              title: { text: 'Value', font: { color: '#9ca3af' } }
                            },
                            showlegend: false
                          }}
                          config={{
                            displayModeBar: false,
                            staticPlot: false,
                            scrollZoom: false,
                            doubleClick: false,
                            showTips: true,
                            displaylogo: false,
                            responsive: true,
                            modeBarButtonsToRemove: ['pan2d','select2d','lasso2d','zoom2d','zoomIn2d','zoomOut2d','autoScale2d','resetScale2d'],
                            autosizable: true
                          }}
                          style={{ width: '100%', height: '350px' }}
                          useResizeHandler={true}
                        />
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* 5. ArNS Resolution - Time Series */}
                  {prometheusMetrics.metrics.arns && Array.isArray(prometheusMetrics.metrics.arns) && (
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
          modeBarButtonsToRemove: ['pan2d','select2d','lasso2d','zoom2d','zoomIn2d','zoomOut2d','autoScale2d','resetScale2d'],
          autosizable: true
        }}
                          style={{ width: '100%', height: '350px' }}
                          useResizeHandler={true}
                        />
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* 6. ArNS Cache Hit Rate - Time Series */}
                  {prometheusMetrics.metrics.arns && Array.isArray(prometheusMetrics.metrics.arns) && (
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
          modeBarButtonsToRemove: ['pan2d','select2d','lasso2d','zoom2d','zoomIn2d','zoomOut2d','autoScale2d','resetScale2d'],
          autosizable: true
        }}
                          style={{ width: '100%', height: '350px' }}
                          useResizeHandler={true}
                        />
                      </CardContent>
                    </Card>
                  )}
                  
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
                          yaxis: { showgrid: true, gridcolor: '#374151', color: '#9ca3af', title: 'ms' }
                        }}
        config={{ 
          displayModeBar: false,
          staticPlot: false,
          scrollZoom: false,
          doubleClick: false,
          showTips: true,
          displaylogo: false,
          responsive: true,
          modeBarButtonsToRemove: ['pan2d','select2d','lasso2d','zoom2d','zoomIn2d','zoomOut2d','autoScale2d','resetScale2d'],
          autosizable: true
        }}
                        style={{ width: '100%', height: '350px' }}
                        useResizeHandler={true}
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
          modeBarButtonsToRemove: ['pan2d','select2d','lasso2d','zoom2d','zoomIn2d','zoomOut2d','autoScale2d','resetScale2d'],
          autosizable: true
        }}
                        style={{ width: '100%', height: '350px' }}
                        useResizeHandler={true}
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
                          yaxis: { showgrid: true, gridcolor: '#374151', color: '#9ca3af', title: '%' }
                        }}
        config={{ 
          displayModeBar: false,
          staticPlot: false,
          scrollZoom: false,
          doubleClick: false,
          showTips: true,
          displaylogo: false,
          responsive: true,
          modeBarButtonsToRemove: ['pan2d','select2d','lasso2d','zoom2d','zoomIn2d','zoomOut2d','autoScale2d','resetScale2d'],
          autosizable: true
        }}
                        style={{ width: '100%', height: '350px' }}
                        useResizeHandler={true}
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
                          yaxis: { showgrid: true, gridcolor: '#374151', color: '#9ca3af', title: 'bytes/sec', fixedrange: true },
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
          modeBarButtonsToRemove: ['pan2d','select2d','lasso2d','zoom2d','zoomIn2d','zoomOut2d','autoScale2d','resetScale2d'],
          autosizable: true
        }}
                        style={{ width: '100%', height: '350px' }}
                        useResizeHandler={true}
                      />
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 icon-error mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Prometheus Unavailable</h3>
                  <p className="text-gray-400 mb-2">
                    {prometheusMetrics?.error === 'Network error' 
                      ? 'Unable to connect to Prometheus server'
                      : prometheusMetrics?.error || 'Unknown error'
                    }
                  </p>
                  {prometheusMetrics?.details && (
                    <p className="text-xs text-gray-500">
                      Details: {prometheusMetrics.details}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      {/* Services Overview */}
      <div className="grid gap-6 lg:grid-cols-1">
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Activity className="h-5 w-5 icon-info" />
              Container Status
            </CardTitle>
            <CardDescription className="text-gray-300">
              Real-time status of all AR.IO containers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service, index) => (
                <button 
                  key={index} 
                  className="flex flex-col p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-white transition-colors text-left"
                  onClick={() => onSectionChange('service', service.serviceId)} // Navigate to service detail
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        service.status === 'running' ? 'bg-green-500' : 
                        service.status === 'stopped' ? 'bg-red-500' : 'bg-gray-400'
                      }`} />
                      <p className="font-medium text-white text-sm">{service.name}</p>
                    </div>
                    <Badge className={`status-indicator ${getStatusColor(service.status)} text-xs`}>
                      {service.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-400 mb-2">
                    Container: {service.container}
                  </div>
                  {service.ports && service.ports.length > 0 && (
                    <div className="text-xs text-gray-400 mb-2">
                      Ports: {service.ports.join(', ')}
                    </div>
                  )}
                  <div className="text-xs text-gray-400">
                    Uptime: {service.uptime}
                  </div>
                  {service.status === 'running' && (
                    <div className="text-xs text-gray-400 mt-1">
                      CPU: {service.cpu}% | RAM: {service.memory}%
                    </div>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
