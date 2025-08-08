'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Play, Square, RotateCcw, Power, Clock, Cpu, MemoryStick, Network } from 'lucide-react'

interface DockerInfo {
  status: string
  ports: string[]
  version: string
  health: string
  uptime: string
  lastRestart: string
  cpu?: number
  memory?: number
}

interface OverviewTabProps {
  service: string
}

export function OverviewTab({ service }: OverviewTabProps) {
  const [dockerInfo, setDockerInfo] = useState<DockerInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDockerInfo = async () => {
      try {
        const response = await fetch(`/api/docker/${service}/info`)
        if (response.ok) {
          const data = await response.json()
          setDockerInfo(data)
        }
      } catch (error) {
        console.error('Failed to fetch docker info:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDockerInfo()
    const interval = setInterval(fetchDockerInfo, 5000)
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
      <div className="grid gap-6 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="dashboard-card animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-slate-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Status Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="dashboard-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                dockerInfo?.status === 'running' ? 'bg-green-500' : 'bg-red-500'
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
              <Network className="h-5 w-5 text-purple-600" />
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
              <Cpu className="h-5 w-5 text-purple-600" />
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
                  <div className="p-2 bg-blue-100 rounded">
                    <Cpu className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-white">CPU Usage</p>
                    <p className="text-sm text-gray-400">Current CPU utilization</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-white">{dockerInfo?.cpu || 0}%</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded">
                    <MemoryStick className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Memory Usage</p>
                    <p className="text-sm text-gray-400">Current memory utilization</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-white">{dockerInfo?.memory || 0}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
