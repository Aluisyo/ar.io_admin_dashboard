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
import { BundlerFiltersTab } from '@/components/tabs/bundler-filters-tab'
import { DatabaseQueryTab } from '@/components/tabs/database-query-tab'
import { Activity } from 'lucide-react'
import { BarChart3 } from 'lucide-react'
import { Settings } from 'lucide-react'
import { FileText } from 'lucide-react'
import { Server } from 'lucide-react'
import { Globe } from 'lucide-react'
import { Filter } from 'lucide-react'
import { LayoutDashboard } from 'lucide-react'
import { Database } from 'lucide-react'
import { TrendingUp } from 'lucide-react'
import { Play } from 'lucide-react'
import { Square } from 'lucide-react'
import { RotateCcw } from 'lucide-react'
import { Power } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { apiGet, apiPost, getApiUrl } from '@/lib/api-utils'

interface DockerInfo { status: string }

interface ServiceTabsProps {
  service: string
}

export function ServiceTabs({ service }: ServiceTabsProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [dockerInfo, setDockerInfo] = useState<DockerInfo | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const { toast } = useToast();

  // Reset to overview tab when switching services
  useEffect(() => {
    setActiveTab('overview');
  }, [service]);

  // Fetch docker info with race condition protection
  useEffect(() => {
    const controller = new AbortController();
    setIsLoadingInfo(true);

    const fetchDockerInfo = async () => {
      try {
        const response = await fetch(getApiUrl(`/api/docker/${service}/info`), {
          signal: controller.signal
        });
        
        if (controller.signal.aborted) return;
        
        if (response.ok) {
          const data = await response.json();
          setDockerInfo({ status: data.status });
        } else {
          console.error('Failed to fetch docker info: HTTP', response.status);
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Failed to fetch docker info:', error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingInfo(false);
        }
      }
    };

    fetchDockerInfo();

    // Cleanup function to abort request if component unmounts or service changes
    return () => {
      controller.abort();
    };
  }, [service]);

  const handleAction = async (action: string) => {
    setLoadingAction(action);
    const actionName = action.charAt(0).toUpperCase() + action.slice(1);
    toast({ title: `${actionName}ing ${getServiceName(service)} service...` });
    
    try {
      const response = await apiPost(`/api/docker/${service}/${action}`);
      if (response.ok) {
        toast({ title: `${actionName} successful`, description: `${getServiceName(service)} service ${actionName.toLowerCase()}ed successfully.` });
        
        // Refresh docker info after successful action
        setTimeout(async () => {
          try {
            const infoResponse = await fetch(getApiUrl(`/api/docker/${service}/info`));
            if (infoResponse.ok) {
              const data = await infoResponse.json();
              setDockerInfo({ status: data.status });
            }
          } catch (error) {
            console.error('Failed to refresh docker info after action:', error);
          }
        }, 1000); // Small delay to allow container state to update
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
    e.preventDefault();
    const grafanaUrl = process.env.NEXT_PUBLIC_GRAFANA_URL || 'http://localhost:1024';
    window.open(grafanaUrl, '_blank');
  };

  const handlePrometheusDashboardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const prometheusUrl = process.env.NEXT_PUBLIC_PROMETHEUS_URL || 'http://localhost:9090';
    window.open(prometheusUrl, '_blank');
  };

  // Mobile-first approach: always use horizontal scroll on mobile, grid only on larger screens
  const getTabLayoutClass = () => {
    // Count total tabs for this service
    let tabCount = 4; // base tabs: overview, metrics, configuration, logs
    if (service === 'gateway') tabCount = 7; // + admin-endpoint, index-filters, database-query
    else if (service === 'bundler') tabCount = 5; // + bundler-filters  
    else if (service === 'grafana') tabCount = 6; // + grafana-dashboard, prometheus-dashboard
    else if (service === 'clickhouse') tabCount = 5; // + database-query
    
    // Use horizontal scroll on mobile (sm and below), grid on larger screens
    return `flex md:grid overflow-x-auto md:overflow-x-visible`;
  };
  
  const getTabGridClass = () => {
    if (service === 'gateway') return 'md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7';
    if (service === 'bundler') return 'md:grid-cols-4 lg:grid-cols-5';
    if (service === 'grafana') return 'md:grid-cols-4 lg:grid-cols-6';
    if (service === 'clickhouse') return 'md:grid-cols-4 lg:grid-cols-5';
    return 'md:grid-cols-4';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold text-white truncate">{getServiceName(service)}</h2>
          <p className="text-gray-300 mt-1 text-sm sm:text-base">
            Manage and monitor your {getServiceName(service)} service
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-start sm:justify-end flex-shrink-0">
           {isLoadingInfo ? (
             <div className="flex items-center text-gray-400 text-sm">
               <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
               Loading service status...
             </div>
           ) : (
             <>
               {dockerInfo?.status === 'stopped' && (
                 <Button onClick={() => handleAction('start')} variant="default" className="bg-white text-black hover:bg-gray-200" disabled={loadingAction === 'start'}>
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
             </>
           )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`relative w-full ${getTabLayoutClass()} ${getTabGridClass()} bg-gray-900 border border-gray-800 p-1 gap-1`}>
          <TabsTrigger value="overview" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-white data-[state=active]:text-black whitespace-nowrap flex-shrink-0 px-3 sm:px-4 py-2">
            <Activity className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm md:text-base">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-white data-[state=active]:text-black whitespace-nowrap flex-shrink-0 px-3 sm:px-4 py-2">
            <BarChart3 className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm md:text-base">Metrics</span>
          </TabsTrigger>
          <TabsTrigger value="configuration" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-white data-[state=active]:text-black whitespace-nowrap flex-shrink-0 px-3 sm:px-4 py-2">
            <Settings className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm md:text-base">Config</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-white data-[state=active]:text-black whitespace-nowrap flex-shrink-0 px-3 sm:px-4 py-2">
            <FileText className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm md:text-base">Logs</span>
          </TabsTrigger>
          {service === 'gateway' && (
            <>
              <TabsTrigger value="admin-endpoint" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-white data-[state=active]:text-black text-gray-300 whitespace-nowrap flex-shrink-0 px-3 sm:px-4 py-2">
                <Server className="h-4 w-4 text-gray-300 data-[state=active]:text-black flex-shrink-0" />
                <span className="text-sm md:text-base">Admin</span>
              </TabsTrigger>
              <TabsTrigger value="index-filters" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-white data-[state=active]:text-black whitespace-nowrap flex-shrink-0 px-3 sm:px-4 py-2">
                <Filter className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm md:text-base">Filters</span>
              </TabsTrigger>
            </>
          )}

          {service === 'bundler' && (
            <TabsTrigger value="bundler-filters" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-white data-[state=active]:text-black whitespace-nowrap flex-shrink-0 px-3 sm:px-4 py-2">
              <Filter className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm md:text-base">Filters</span>
            </TabsTrigger>
          )}

          {service === 'grafana' && (
            <TabsTrigger
              value="grafana-dashboard"
              onClick={handleGrafanaDashboardClick}
              className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-white data-[state=active]:text-black whitespace-nowrap flex-shrink-0 px-3 sm:px-4 py-2"
            >
              <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm md:text-base">Grafana</span>
            </TabsTrigger>
          )}

          {service === 'grafana' && (
            <TabsTrigger
              value="prometheus-dashboard"
              onClick={handlePrometheusDashboardClick}
              className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-white data-[state=active]:text-black whitespace-nowrap flex-shrink-0 px-3 sm:px-4 py-2"
            >
              <TrendingUp className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm md:text-base">Prometheus</span>
            </TabsTrigger>
          )}

          {(service === 'gateway' || service === 'clickhouse') && (
            <TabsTrigger
              value="database-query"
              className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-white data-[state=active]:text-black whitespace-nowrap flex-shrink-0 px-3 sm:px-4 py-2"
            >
              <Database className="h-4 w-4 text-gray-300 data-[state=active]:text-black flex-shrink-0" />
              <span className="text-sm md:text-base">Database</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-4" key={`overview-${service}`}>
          <OverviewTab service={service} />
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4" key={`metrics-${service}`}>
          <MetricsTab service={service} />
        </TabsContent>

        <TabsContent value="configuration" className="space-y-4" key={`configuration-${service}`}>
          <ConfigurationTab service={service} />
        </TabsContent>

        <TabsContent value="logs" className="space-y-4" key={`logs-${service}`}>
          <LogsTab service={service} />
        </TabsContent>

        {service === 'gateway' && (
          <>
            <TabsContent value="admin-endpoint" className="space-y-4" key={`admin-endpoint-${service}`}>
              <AdminEndpointTab service={service} />
            </TabsContent>

            <TabsContent value="index-filters" className="space-y-4" key={`index-filters-${service}`}>
              <IndexingAndWebhookFiltersTab service={service} />
            </TabsContent>
          </>
        )}

        {service === 'bundler' && (
          <TabsContent value="bundler-filters" className="space-y-4" key={`bundler-filters-${service}`}>
            <BundlerFiltersTab service={service} />
          </TabsContent>
        )}

        {(service === 'gateway' || service === 'clickhouse') && (
          <TabsContent value="database-query" className="space-y-4" key={`database-query-${service}`}>
            <DatabaseQueryTab service={service} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
