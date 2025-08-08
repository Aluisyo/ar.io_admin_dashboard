'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button' // Import Button for quick actions
import { Cpu, HardDrive, MemoryStick, Activity, Server, Database, TrendingUp, AlertTriangle } from 'lucide-react'

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
  serviceId: string // Add serviceId to ServiceStatus
}

interface DashboardContentProps {
  onSectionChange: (section: string, service?: string) => void
}

export function DashboardContent({ onSectionChange }: DashboardContentProps) {
  const [stats, setStats] = useState<SystemStats>({ cpu: 0, memory: 0, storage: 0 })
  const [services, setServices] = useState<ServiceStatus[]>([])
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/system/stats')
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
        const response = await fetch('/api/docker/containers')
        if (response.ok) {
          const data = await response.json()
          setServices(data)
        }
      } catch (error) {
        console.error('Failed to fetch services:', error)
      }
    }

    fetchStats()
    fetchServices()
    const interval = setInterval(() => {
      fetchStats()
      fetchServices()
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
    try {
      const response = await fetch(`/api/actions/${actionType}`, { method: 'POST' })
      if (response.ok) {
        console.log(`${actionType} action successful!`)
        // Optionally refresh data after action
        setTimeout(() => {
          window.location.reload() // Simple full refresh for now
        }, 1000)
      } else {
        console.error(`Failed to perform ${actionType} action`)
      }
    } catch (error) {
      console.error(`Error performing ${actionType} action:`, error)
    } finally {
      setActionLoading(prev => ({ ...prev, [actionType]: false }))
    }
  }

  const runningServices = services.filter(s => s.status === 'running').length
  const totalServices = services.length

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="metric-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">System CPU</CardTitle>
            <div className="p-2 bg-gray-800 rounded-lg">
              <Cpu className="h-4 w-4 text-white" />
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
              <MemoryStick className="h-4 w-4 text-white" />
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
              <HardDrive className="h-4 w-4 text-white" />
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
              <Server className="h-4 w-4 text-white" />
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

      {/* Services Overview */}
      <div className="grid gap-6 lg:grid-cols-1">
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Activity className="h-5 w-5 text-white" />
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
                        service.status === 'running' ? 'bg-white' : 
                        service.status === 'stopped' ? 'bg-gray-500' : 'bg-gray-600'
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

      {/* Quick Actions */}
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Database className="h-5 w-5 text-white" />
            Quick Actions
          </CardTitle>
          <CardDescription className="text-gray-300">
            Common administrative tasks for AR.IO node
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Button 
              className="p-4 text-left bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700 hover:border-white h-auto flex-col items-start"
              onClick={() => handleQuickAction('restart-all')}
              disabled={actionLoading['restart-all']}
            >
              <div className="font-medium text-white">Restart All Services</div>
              <div className="text-sm text-gray-400">{actionLoading['restart-all'] ? 'Restarting...' : 'Restart all running containers'}</div>
            </Button>
            <Button 
              className="p-4 text-left bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700 hover:border-white h-auto flex-col items-start"
              onClick={() => onSectionChange('service', 'admin')} // Navigate to Admin Dashboard logs
              disabled={actionLoading['view-logs']}
            >
              <div className="font-medium text-white">View System Logs</div>
              <div className="text-sm text-gray-400">Check system-wide logs</div>
            </Button>
            <Button 
              className="p-4 text-left bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700 hover:border-white h-auto flex-col items-start"
              onClick={() => handleQuickAction('backup-config')}
              disabled={actionLoading['backup-config']}
            >
              <div className="font-medium text-white">Backup Configuration</div>
              <div className="text-sm text-gray-400">{actionLoading['backup-config'] ? 'Backing up...' : 'Create config backup'}</div>
            </Button>
            <Button 
              className="p-4 text-left bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700 hover:border-white h-auto flex-col items-start"
              onClick={() => handleQuickAction('update-node')}
              disabled={actionLoading['update-node']}
            >
              <div className="font-medium text-white">Update Node</div>
              <div className="text-sm text-gray-400">{actionLoading['update-node'] ? 'Updating...' : 'Check for AR.IO updates'}</div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
