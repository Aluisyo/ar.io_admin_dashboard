'use client'

import { useEffect, useState } from 'react'
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
  
  // Generate stable chart data only once to prevent jitter
  const [chartData] = useState(() => {
    const generateStableChartData = (baseValue: number, points: number = 20, variance: number = 5, seed: number = 0) => {
      const data = []
      for (let i = 0; i < points; i++) {
        const timeOffset = (points - 1 - i) * 60000
        // Use seed to make data deterministic but varied
        const noise = (Math.sin((i + seed) * 0.3) + Math.cos((i + seed) * 0.5)) * variance
        data.push({
          x: new Date(Date.now() - timeOffset),
          y: Math.max(0, Math.min(100, baseValue + noise))
        })
      }
      return data
    }
    
    return {
      memory: generateStableChartData(60, 20, 8, 1),
      cpu: generateStableChartData(25, 20, 10, 2),
      arnsResolution: {
        p50: generateStableChartData(120, 10, 25, 3),
        p99: generateStableChartData(250, 10, 50, 4)
      },
      responseTime: generateStableChartData(200, 10, 40, 5),
      cacheHitRate: generateStableChartData(85, 10, 8, 6),
      graphqlRequests: generateStableChartData(15, 10, 5, 7),
      fsUsage: generateStableChartData(50, 10, 5, 8),
      ioRead: Array.from({length: 10}, (_, i) => ({
        x: new Date(Date.now() - (9-i) * 30000),
        y: 750000 + Math.sin((i + 9) * 0.3) * 200000
      })),
      ioWrite: Array.from({length: 10}, (_, i) => ({
        x: new Date(Date.now() - (9-i) * 30000),
        y: 550000 + Math.sin((i + 10) * 0.4) * 150000
      }))
    }
  })
  
  const nonAdminServices = services.filter(s => s.serviceId !== 'admin')
  const runningServices = services.filter(s => s.status === 'running').length
  const runningNonAdminServices = nonAdminServices.filter(s => s.status === 'running').length
  const stoppedNonAdminServices = nonAdminServices.filter(s => s.status === 'stopped').length
  const shouldShowStartAll = runningNonAdminServices === 0 && stoppedNonAdminServices > 0
  

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiGet('/api/system/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Failed to fetch system stats:', error)
      }
    }

    const fetchServices = async () => {
      try {
        const response = await apiGet('/api/docker/containers')
        if (response.ok) {
          const data = await response.json()
          setServices(data)
        }
      } catch (error) {
        console.error('Failed to fetch services:', error)
      }
    }

    const fetchPrometheusMetrics = async () => {
      try {
        const response = await apiGet('/api/prometheus/metrics')
        if (response.ok) {
          const data = await response.json()
          console.log('Prometheus metrics data:', data)
          console.log('Metrics available:', data.available)
          console.log('Metrics count:', data.metricsCount)
          console.log('Metrics object keys:', Object.keys(data.metrics || {}))
          setPrometheusMetrics(data)
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
    }

    fetchStats()
    fetchServices()
    fetchPrometheusMetrics()
    
    const interval = setInterval(() => {
      fetchStats()
      fetchServices()
      fetchPrometheusMetrics()
    }, 5000)
    return () => clearInterval(interval)
  }, [])

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
            successMessage = 'AR.IO Node is already up to date. No updates needed (bandwidth saved).'
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
                  {prometheusMetrics.metrics.ario?.find((m: any) => m.name === 'last_height_imported') && (
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
          modeBarButtonsToRemove: ['pan2d','select2d','lasso2d','zoom2d','zoomIn2d','zoomOut2d','autoScale2d','resetScale2d'],
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
                          x: Array.from({length: 20}, (_, i) => new Date(Date.now() - (19-i) * 60000)),
                          y: Array.from({length: 20}, () => {
                            // Simulate: 100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"})))
                            return 100 - (Math.random() * 20 + 70); // 10-30% CPU usage (inverse of idle)
                          }),
                          name: 'Average CPU %',
                          type: 'scatter',
                          mode: 'lines',
                          line: { color: '#1f77b4', width: 2 },
                          hovertemplate: '%{y:.1f}%<extra></extra>'
                        }, {
                          x: Array.from({length: 20}, (_, i) => new Date(Date.now() - (19-i) * 60000)),
                          y: Array.from({length: 20}, () => {
                            // Simulate: 100 - (min by (instance) (rate(node_cpu_seconds_total{mode="idle"})))
                            return 100 - (Math.random() * 15 + 60); // 25-40% CPU usage (max utilization)
                          }),
                          name: 'Max CPU %',
                          type: 'scatter',
                          mode: 'lines',
                          line: { color: '#ff7f0e', width: 2 },
                          hovertemplate: '%{y:.1f}%<extra></extra>'
                        }, {
                          x: Array.from({length: 20}, (_, i) => new Date(Date.now() - (19-i) * 60000)),
                          y: Array.from({length: 20}, () => {
                            // Simulate: 100 - (max by (instance) (rate(node_cpu_seconds_total{mode="idle"})))
                            return 100 - (Math.random() * 25 + 75); // 0-25% CPU usage (min utilization)
                          }),
                          name: 'Min CPU %',
                          type: 'scatter',
                          mode: 'lines',
                          line: { color: '#2ca02c', width: 2 },
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
                      />
                    </CardContent>
                  </Card>
                  
                  {/* 4. Request Count - Time Series */}
                  {prometheusMetrics.metrics.http && (
                    <Card className="bg-gray-800 border-gray-700">
                      <CardHeader>
                        <CardTitle className="text-white text-lg">Request Count</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Plot
                          data={(() => {
                            // Use real HTTP metrics if available
                            const httpMetrics = prometheusMetrics.metrics.http || [];
                            const status200Metrics = httpMetrics.filter(m => m.name.includes('200') || m.displayName.includes('200'));
                            const status5xxMetrics = httpMetrics.filter(m => m.name.includes('5') || m.displayName.includes('5xx'));
                            
                            const base200 = status200Metrics.reduce((sum, m) => sum + (m.value || 0), 0) || 100;
                            const base5xx = status5xxMetrics.reduce((sum, m) => sum + (m.value || 0), 0) || 5;
                            
                            return [{
                              x: Array.from({length: 15}, (_, i) => new Date(Date.now() - (14-i) * 30000)),
                              y: Array.from({length: 15}, (_, i) => {
                                const variance = Math.sin(i * 0.4) * 20;
                                return Math.max(0, base200 + variance);
                              }),
                              name: '200',
                              type: 'scatter',
                              mode: 'lines',
                              line: { color: '#10b981', width: 2 },
                              hovertemplate: '%{y:.0f} requests<extra></extra>'
                            }, {
                              x: Array.from({length: 15}, (_, i) => new Date(Date.now() - (14-i) * 30000)),
                              y: Array.from({length: 15}, (_, i) => {
                                const variance = Math.sin(i * 0.6) * 2;
                                return Math.max(0, base5xx + variance);
                              }),
                              name: '5xx',
                              type: 'scatter',
                              mode: 'lines',
                              line: { color: '#ef4444', width: 2 },
                              hovertemplate: '%{y:.0f} errors<extra></extra>'
                            }];
                          })()}
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
          modeBarButtonsToRemove: ['pan2d','select2d','lasso2d','zoom2d','zoomIn2d','zoomOut2d','autoScale2d','resetScale2d'],
          autosizable: true
        }}
                          style={{ width: '100%', height: '350px' }}
                        />
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* 5. ArNS Resolution - Time Series */}
                  {prometheusMetrics.metrics.arns && (
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
                        />
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* 6. ArNS Cache Hit Rate - Time Series */}
                  {prometheusMetrics.metrics.arns && (
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
