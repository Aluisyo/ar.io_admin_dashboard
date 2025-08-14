'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Play, Square, RotateCcw, Power, Clock, Cpu, MemoryStick, Network, Activity, Server, Wallet, Hash, Copy } from 'lucide-react'
<<<<<<< Updated upstream
import { LoadingSpinner } from '@/components/ui/loading-spinner'
=======
>>>>>>> Stashed changes
import { BundlerServiceInfoCard } from '@/components/bundler-service-info-card'
import { AOComputeInfoCard } from '@/components/ao-compute-info-card'
import { ObserverInfoCard } from '@/components/observer-info-card'

interface DockerInfo {
  status: string
  ports: string[]
  version: string
  health: string
  uptime: string
  lastRestart: string
}

interface ContainerMetrics {
  cpu: number
  memory: number
  storage: number
  networkIn: string
  networkOut: string
}

interface GatewayInfo {
  wallet?: string
  processId?: string
  ans104UnbundleFilter?: any
  ans104IndexFilter?: any
  supportedManifestVersions?: string[]
  release?: string
}

interface OverviewTabProps {
  service: string
}

export function OverviewTab({ service }: OverviewTabProps) {
  const [dockerInfo, setDockerInfo] = useState<DockerInfo | null>(null)
  const [metrics, setMetrics] = useState<ContainerMetrics | null>(null)
  const [gatewayInfo, setGatewayInfo] = useState<GatewayInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
<<<<<<< Updated upstream
        // Fetch container info and metrics in parallel
=======
        // Fetch both info and metrics in parallel
>>>>>>> Stashed changes
        const fetchPromises = [
          fetch(`/api/docker/${service}/info`),
          fetch(`/api/docker/${service}/metrics`)
        ]
        
<<<<<<< Updated upstream
        // Fetch additional gateway info for gateway service
=======
        // Add gateway info fetch only for gateway service
>>>>>>> Stashed changes
        if (service === 'gateway') {
          fetchPromises.push(fetch('/api/ar-io-gateway/info'))
        }
        
        const responses = await Promise.all(fetchPromises)
        const [infoResponse, metricsResponse, gatewayInfoResponse] = responses
        
        if (infoResponse.ok) {
          const infoData = await infoResponse.json()
          setDockerInfo(infoData)
        }
        
        if (metricsResponse.ok) {
          const metricsData = await metricsResponse.json()
          setMetrics(metricsData)
        }
        
<<<<<<< Updated upstream
        // Process gateway info response
        if (service === 'gateway' && gatewayInfoResponse && gatewayInfoResponse.ok) {
          const gatewayData = await gatewayInfoResponse.json()
          // Extract gateway info from API response
=======
        // Handle gateway info response if it exists
        if (service === 'gateway' && gatewayInfoResponse && gatewayInfoResponse.ok) {
          const gatewayData = await gatewayInfoResponse.json()
          // Extract the actual info from the API response wrapper
>>>>>>> Stashed changes
          setGatewayInfo(gatewayData.info || gatewayData)
        }
      } catch (error) {
        console.error('Failed to fetch container data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [service])

  const handleAction = async (action: string) => {
    try {
      await fetch(`/api/docker/${service}/${action}`, { method: 'POST' })
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error(`Failed to ${action} service:`, error)
    }
  }

  const getServiceName = (service: string) => {
    const names: Record<string, string> = {
      gateway: 'Gateway',
      observer: 'Observer',
      envoy: 'Envoy',
      autoheal: 'Autoheal',
      clickhouse: 'Clickhouse',
      litestream: 'Litestream',
      grafana: 'Grafana',
      'ao-cu': 'AO CU',
      bundler: 'Bundler Turbo Service',
      admin: 'Admin Dashboard'
    }
    return names[service] || service
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" message="Loading service overview..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      
<<<<<<< Updated upstream
=======
      {/* Gateway Information - only for gateway service - TOP PRIORITY */}
>>>>>>> Stashed changes
      {service === 'gateway' && gatewayInfo && (
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
<<<<<<< Updated upstream
              <Server className="h-5 w-5 icon-info" />
=======
              <Server className="h-5 w-5 text-blue-500" />
>>>>>>> Stashed changes
              AR.IO Gateway Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
<<<<<<< Updated upstream
              {gatewayInfo.wallet && (
                <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-800 rounded">
                      <Wallet className="h-4 w-4 icon-success" />
=======
              {/* Wallet Address */}
              {gatewayInfo.wallet && (
                <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded">
                      <Wallet className="h-4 w-4 text-green-600" />
>>>>>>> Stashed changes
                    </div>
                    <div>
                      <p className="font-medium text-white">Gateway Wallet Address</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs break-all">
                      {gatewayInfo.wallet}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(gatewayInfo.wallet!)}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              
<<<<<<< Updated upstream
              {gatewayInfo.processId && (
                <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-800 rounded">
                      <Hash className="h-4 w-4 icon-primary" />
=======
              {/* Process ID */}
              {gatewayInfo.processId && (
                <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded">
                      <Hash className="h-4 w-4 text-purple-600" />
>>>>>>> Stashed changes
                    </div>
                    <div>
                      <p className="font-medium text-white">Process ID</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs break-all">
                      {gatewayInfo.processId}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(gatewayInfo.processId!)}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              
<<<<<<< Updated upstream
              {(gatewayInfo.ans104UnbundleFilter || gatewayInfo.ans104IndexFilter) && (
                <div className="p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-gray-800 rounded">
                      <Hash className="h-4 w-4 icon-warning" />
=======
              {/* ANS-104 Filter Configurations */}
              {(gatewayInfo.ans104UnbundleFilter || gatewayInfo.ans104IndexFilter) && (
                <div className="p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-yellow-100 rounded">
                      <Hash className="h-4 w-4 text-yellow-600" />
>>>>>>> Stashed changes
                    </div>
                    <div>
                      <p className="font-medium text-white">ANS-104 Filter Configurations</p>
                    </div>
                  </div>
                  <div className="bg-gray-900 rounded p-3 max-h-48 overflow-auto space-y-3">
                    {gatewayInfo.ans104UnbundleFilter && (
                      <div>
<<<<<<< Updated upstream
                        <p className="text-xs font-semibold text-white mb-1">Unbundle Filter:</p>
=======
                        <p className="text-xs font-semibold text-blue-400 mb-1">Unbundle Filter:</p>
>>>>>>> Stashed changes
                        <pre className="text-xs text-gray-300">
                          {JSON.stringify(gatewayInfo.ans104UnbundleFilter, null, 2)}
                        </pre>
                      </div>
                    )}
                    {gatewayInfo.ans104IndexFilter && (
                      <div>
<<<<<<< Updated upstream
                        <p className="text-xs font-semibold text-white mb-1">Index Filter:</p>
=======
                        <p className="text-xs font-semibold text-green-400 mb-1">Index Filter:</p>
>>>>>>> Stashed changes
                        <pre className="text-xs text-gray-300">
                          {JSON.stringify(gatewayInfo.ans104IndexFilter, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
<<<<<<< Updated upstream
              {gatewayInfo.supportedManifestVersions && gatewayInfo.supportedManifestVersions.length > 0 && (
                <div className="p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-gray-800 rounded">
                      <Activity className="h-4 w-4 icon-warning" />
=======
              {/* Supported Manifest Versions */}
              {gatewayInfo.supportedManifestVersions && gatewayInfo.supportedManifestVersions.length > 0 && (
                <div className="p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-orange-100 rounded">
                      <Activity className="h-4 w-4 text-orange-600" />
>>>>>>> Stashed changes
                    </div>
                    <div>
                      <p className="font-medium text-white">Supported Manifest Versions</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {gatewayInfo.supportedManifestVersions.map((version, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        v{version}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Gateway Release Version */}
              {gatewayInfo.release && (
                <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
<<<<<<< Updated upstream
                    <div className="p-2 bg-gray-800 rounded">
                      <Network className="h-4 w-4 icon-info" />
=======
                    <div className="p-2 bg-blue-100 rounded">
                      <Network className="h-4 w-4 text-blue-600" />
>>>>>>> Stashed changes
                    </div>
                    <div>
                      <p className="font-medium text-white">Gateway Software Release Version</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    v{gatewayInfo.release}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bundler Service Information - only for bundler service */}
      {service === 'bundler' && (
        <BundlerServiceInfoCard />
      )}

      {/* AO Compute Unit Information - only for ao-cu service */}
      {service === 'ao-cu' && (
        <AOComputeInfoCard />
      )}

      {/* Observer Information - only for observer service */}
      {service === 'observer' && (
        <ObserverInfoCard />
      )}

      {/* Status Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="dashboard-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                dockerInfo?.status === 'running' ? 'bg-white' : 'bg-gray-500'
              }`} />
              Container Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white mb-2">
              {dockerInfo?.status || 'Unknown'}
            </div>
            <Badge className={`status-indicator ${
              dockerInfo?.status === 'running' ? 'status-running' : 'status-stopped'
            }`}>
              {dockerInfo?.health || 'Unknown'}
            </Badge>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Uptime
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white mb-2">
              {dockerInfo?.uptime || 'Unknown'}
            </div>
            <p className="text-sm text-gray-400">
              Last restart: {dockerInfo?.lastRestart || 'Unknown'}
            </p>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Network className="h-4 w-4" />
              Version
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-white mb-2 break-all">
              {dockerInfo?.version || 'Unknown'}
            </div>
            <p className="text-sm text-gray-400">
              Container image version
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5 icon-primary" />
              Port Configuration
            </CardTitle>
            <CardDescription className="text-gray-300">
              Network ports exposed by this service
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dockerInfo?.ports?.length ? (
                dockerInfo.ports.map((port, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <span className="text-sm font-medium text-white">Port {index + 1}</span>
                    <Badge variant="outline" className="font-mono">{port}</Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Network className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No ports configured</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5 icon-primary" />
              Container Metrics
            </CardTitle>
            <CardDescription className="text-gray-300">
              Real-time resource usage for the {service} container
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-800 rounded">
                    <Cpu className="h-4 w-4 icon-info" />
                  </div>
                  <div>
                    <p className="font-medium text-white">CPU Usage</p>
                    <p className="text-sm text-gray-400">Current CPU utilization</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-white">{metrics?.cpu || 0}%</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-800 rounded">
                    <MemoryStick className="h-4 w-4 icon-success" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Memory Usage</p>
                    <p className="text-sm text-gray-400">Current memory utilization</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-white">{metrics?.memory || 0}%</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
<<<<<<< Updated upstream
                    <div className="p-1 bg-gray-800 rounded">
                      <Activity className="h-3 w-3 icon-primary" />
=======
                    <div className="p-1 bg-purple-100 rounded">
                      <Activity className="h-3 w-3 text-purple-600" />
>>>>>>> Stashed changes
                    </div>
                    <span className="text-sm font-medium text-white">Network In</span>
                  </div>
                  <span className="text-sm font-mono text-gray-300">{metrics?.networkIn || '0B'}</span>
                </div>
                <div className="flex flex-col p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
<<<<<<< Updated upstream
                    <div className="p-1 bg-gray-800 rounded">
                      <Activity className="h-3 w-3 icon-warning" />
=======
                    <div className="p-1 bg-orange-100 rounded">
                      <Activity className="h-3 w-3 text-orange-600" />
>>>>>>> Stashed changes
                    </div>
                    <span className="text-sm font-medium text-white">Network Out</span>
                  </div>
                  <span className="text-sm font-mono text-gray-300">{metrics?.networkOut || '0B'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
    </div>
  )
}
