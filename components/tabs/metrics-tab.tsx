'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Cpu, MemoryStick, HardDrive, Network, TrendingUp, Activity } from 'lucide-react'

interface ContainerMetrics {
  cpu: number
  memory: number
  storage: number
  networkIn: string
  networkOut: string
}

interface MetricsTabProps {
  service: string
}

export function MetricsTab({ service }: MetricsTabProps) {
  const [metrics, setMetrics] = useState<ContainerMetrics | null>(null)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch(`/api/docker/${service}/metrics`)
        if (response.ok) {
          const data = await response.json()
          setMetrics(data)
        }
      } catch (error) {
        console.error('Failed to fetch metrics:', error)
      }
    }

    fetchMetrics()
    const interval = setInterval(fetchMetrics, 5000)
    return () => clearInterval(interval)
  }, [service])

  const getUsageColor = (value: number) => {
    if (value > 80) return 'text-red-600'
    if (value > 60) return 'text-amber-600'
    return 'text-green-600'
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
            <div className="p-2 bg-blue-100 rounded-lg">
              <Cpu className="h-4 w-4 text-blue-600" />
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
            <div className="p-2 bg-green-100 rounded-lg">
              <MemoryStick className="h-4 w-4 text-green-600" />
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
            <div className="p-2 bg-purple-100 rounded-lg">
              <HardDrive className="h-4 w-4 text-purple-600" />
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
            <div className="p-2 bg-orange-100 rounded-lg">
              <Network className="h-4 w-4 text-orange-600" />
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

      {/* Detailed Performance */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
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
                  <div className="p-2 bg-blue-100 rounded">
                    <Cpu className="h-4 w-4 text-blue-600" />
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
                  <div className="p-2 bg-green-100 rounded">
                    <MemoryStick className="h-4 w-4 text-green-600" />
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
                  <div className="p-2 bg-purple-100 rounded">
                    <HardDrive className="h-4 w-4 text-purple-600" />
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
              <Activity className="h-5 w-5 text-purple-600" />
              Resource Alerts
            </CardTitle>
            <CardDescription className="text-gray-300"> {/* Adjusted text color */}
              Current alerts and recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(metrics?.cpu || 0) > 80 && (
                <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <div>
                    <p className="font-medium text-red-900">High CPU Usage</p>
                    <p className="text-sm text-red-700">CPU usage is above 80%</p>
                  </div>
                </div>
              )}
              
              {(metrics?.memory || 0) > 80 && (
                <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <div>
                    <p className="font-medium text-red-900">High Memory Usage</p>
                    <p className="text-sm text-red-700">Memory usage is above 80%</p>
                  </div>
                </div>
              )}

              {(metrics?.cpu || 0) <= 80 && (metrics?.memory || 0) <= 80 && (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="font-medium text-green-900">System Healthy</p>
                    <p className="text-sm text-green-700">All metrics within normal range</p>
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
