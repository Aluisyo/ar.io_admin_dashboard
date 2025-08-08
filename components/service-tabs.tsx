'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { OverviewTab } from '@/components/tabs/overview-tab'
import { MetricsTab } from '@/components/tabs/metrics-tab'
import { ConfigurationTab } from '@/components/tabs/configuration-tab'
import { LogsTab } from '@/components/tabs/logs-tab'
import { AdminEndpointTab } from '@/components/tabs/admin-endpoint-tab'
import { IndexingAndWebhookFiltersTab } from '@/components/tabs/indexing-and-webhook-filters-tab'
import { DatabaseQueryTab } from '@/components/tabs/database-query-tab' // New import
import { Activity, BarChart3, Settings, FileText, Server, Globe, Filter, LayoutDashboard, Database, Play, Square, RotateCcw, Power } from 'lucide-react'
import { Button } from '@/components/ui/button' // Added Database icon
import { useToast } from '@/components/ui/use-toast' // Toast hook

interface DockerInfo { status: string }

interface ServiceTabsProps {
  service: string
}

export function ServiceTabs({ service }: ServiceTabsProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [dockerInfo, setDockerInfo] = useState<DockerInfo | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchDockerInfo = async () => {
    try {
      const response = await fetch('/api/docker/' + service + '/info');
      if (response.ok) {
        const data = await response.json();
        setDockerInfo({ status: data.status });
      }
    } catch (error) {
      console.error('Failed to fetch docker info:', error);
    }
  };

  useEffect(() => {
    fetchDockerInfo();
  }, [service]);

  const handleAction = async (action: string) => {
    setLoadingAction(action);
    const actionName = action.charAt(0).toUpperCase() + action.slice(1);
    toast({ title: `${actionName}ing ${getServiceName(service)} service...` });
    try {
      const response = await fetch(`/api/docker/${service}/${action}`, { method: 'POST' });
      if (response.ok) {
        toast({ title: `${actionName} successful`, description: `${getServiceName(service)} service ${actionName.toLowerCase()}ed successfully.` });
        await fetchDockerInfo();
      } else {
        toast({ title: `${actionName} failed`, description: `Failed to ${action} service`, variant: 'destructive' });
      }
    } catch (error: any) {
      console.error('Failed to ' + action + ' service:', error);
      toast({ title: `${actionName} error`, description: error.message, variant: 'destructive' });
    } finally {
      setLoadingAction(null);
    }
  };

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

  const handleGrafanaDashboardClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent the default tab change behavior
    const grafanaUrl = process.env.NEXT_PUBLIC_GRAFANA_URL || 'http://localhost:1024';
    window.open(grafanaUrl, '_blank'); // Open Grafana in a new tab
  };

  // Determine the Tailwind grid columns class for TabsList
  let tabColsClass = 'grid-cols-4'; // Base tabs: overview, metrics, configuration, logs
  if (service === 'gateway') {
    tabColsClass = 'grid-cols-7'; // Gateway: add admin endpoint, filters, database query
  } else if (service === 'grafana' || service === 'clickhouse') {
    tabColsClass = 'grid-cols-5'; // Grafana or Clickhouse: one extra tab
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">{getServiceName(service)}</h2>
          <p className="text-gray-300 mt-1">
            Manage and monitor your {getServiceName(service)} service
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
           {dockerInfo?.status === 'stopped' && (
             <Button onClick={() => handleAction('start')} variant="default" className="bg-green-600 hover:bg-green-700" disabled={loadingAction === 'start'}>
               <Play className="h-4 w-4 mr-2" />
               {loadingAction === 'start' ? 'Starting...' : 'Start'}
             </Button>
           )}
           {dockerInfo?.status === 'running' && (
             <>
               <Button onClick={() => handleAction('restart')} variant="default" disabled={loadingAction === 'restart'}>
                 <RotateCcw className="h-4 w-4 mr-2" />
                 {loadingAction === 'restart' ? 'Restarting...' : 'Restart'}
               </Button>
               <Button onClick={() => handleAction('stop')} variant="destructive" disabled={loadingAction === 'stop'}>
                 <Square className="h-4 w-4 mr-2" />
                 {loadingAction === 'stop' ? 'Stopping...' : 'Stop'}
               </Button>
             </>
           )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`grid w-full ${tabColsClass} bg-gray-900 border border-gray-800 p-1`}>
          <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-black">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-black">
            <BarChart3 className="h-4 w-4" />
            Metrics
          </TabsTrigger>
          <TabsTrigger value="configuration" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-black">
            <Settings className="h-4 w-4" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-black">
            <FileText className="h-4 w-4" />
            Logs
          </TabsTrigger>
          {service === 'gateway' && (
            <>
              <TabsTrigger value="admin-endpoint" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-black">
                <Server className="h-4 w-4" />
                Admin Endpoint
              </TabsTrigger>
              <TabsTrigger value="index-filters" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-black">
                <Filter className="h-4 w-4" />
                Filters
              </TabsTrigger>
            </>
          )}

          {/* New Grafana Dashboard tab, only for grafana service */}
          {service === 'grafana' && (
            <TabsTrigger
              value="grafana-dashboard" // Unique value for this tab
              onClick={handleGrafanaDashboardClick}
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-black"
            >
              <LayoutDashboard className="h-4 w-4" />
              Grafana Dashboard
            </TabsTrigger>
          )}

          {/* New Database Query tab, only for gateway and clickhouse services */}
          {(service === 'gateway' || service === 'clickhouse') && (
            <TabsTrigger
              value="database-query"
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-black"
            >
              <Database className="h-4 w-4" />
              Database Query
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <OverviewTab service={service} />
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <MetricsTab service={service} />
        </TabsContent>

        <TabsContent value="configuration" className="space-y-4">
          <ConfigurationTab service={service} />
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <LogsTab service={service} />
        </TabsContent>

        {service === 'gateway' && (
          <>
            <TabsContent value="admin-endpoint" className="space-y-4">
              <AdminEndpointTab service={service} />
            </TabsContent>

            <TabsContent value="index-filters" className="space-y-4">
              <IndexingAndWebhookFiltersTab service={service} />
            </TabsContent>
          </>
        )}

        {/* Content for the new Database Query tab */}
        {(service === 'gateway' || service === 'clickhouse') && (
          <TabsContent value="database-query" className="space-y-4">
            <DatabaseQueryTab service={service} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
