'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select' // Import Select components
import { RefreshCw, Download, Filter, Search, FileText } from 'lucide-react'

interface LogsTabProps {
  service: string
}

export function LogsTab({ service }: LogsTabProps) {
  const [logs, setLogs] = useState('')
  const [loading, setLoading] = useState(true)
  const [exportingAll, setExportingAll] = useState(false)
  const [filterKeyword, setFilterKeyword] = useState('')
  const [logLevel, setLogLevel] = useState('all') // New state for log level filter
  const scrollAreaRef = useRef<HTMLDivElement>(null);


  const fetchLogs = async () => {
    setLoading(true);
    try {
      const url = new URL(`/api/docker/${service}/logs`, window.location.origin);
      if (filterKeyword) {
        url.searchParams.append('keyword', filterKeyword);
      }
      if (logLevel !== 'all') {
        url.searchParams.append('level', logLevel); // Send log level as query param
      }
      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.text();
        setLogs(data);
      } else {
        setLogs('Failed to fetch logs.');
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      setLogs('Error fetching logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [service, filterKeyword, logLevel]); // Re-fetch logs when service, keyword, or log level changes

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [logs]);

  const handleRefresh = async () => {
    await fetchLogs();
  };

  const handleDownload = () => {
    const blob = new Blob([logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${service}-recent-logs.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportAllLogs = async () => {
    setExportingAll(true);
    try {
      const url = new URL(`/api/docker/${service}/logs`, window.location.origin);
      url.searchParams.append('exportAll', 'true');
      // Don't apply filters for full export to get complete logs
      
      const response = await fetch(url.toString());
      if (response.ok) {
        const allLogs = await response.text();
        const blob = new Blob([allLogs], { type: 'text/plain' });
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `${service}-all-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
      } else {
        console.error('Failed to export all logs');
      }
    } catch (error) {
      console.error('Error exporting all logs:', error);
    } finally {
      setExportingAll(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Container Logs</CardTitle>
        <CardDescription className="text-gray-300"> {/* Adjusted text color */}
          View recent logs from the {service} container (showing last 100 lines)
        </CardDescription>

      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
            <Input
              placeholder="Search logs"
              value={filterKeyword}
              onChange={e => setFilterKeyword(e.target.value)}
              className="bg-gray-900 border-gray-700 text-white placeholder-gray-400 flex-1 min-w-0"
            />
            <Select value={logLevel} onValueChange={setLogLevel}>
              <SelectTrigger className="w-full sm:w-48 bg-gray-900 border-gray-700 text-white">
                <SelectValue placeholder="Filter by Level" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700 text-white">
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button onClick={handleDownload} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Recent</span>
              <span className="sm:hidden">R</span>
            </Button>
            <Button 
              onClick={handleExportAllLogs} 
              variant="outline" 
              size="sm"
              disabled={exportingAll}
            >
              <Download className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{exportingAll ? 'Exporting...' : 'All Logs'}</span>
              <span className="sm:hidden">{exportingAll ? '...' : 'A'}</span>
            </Button>
          </div>
        </div>

        <div 
          ref={scrollAreaRef} 
          className="relative w-full min-h-[400px] max-h-[600px] h-[50vh] rounded-md border border-gray-700 overflow-auto bg-gray-950"
        >
          <div className="sticky top-0 bg-gray-950 border-b border-gray-700 px-4 py-2 text-xs text-gray-400 font-medium">
            Container Logs - {service}
          </div>
          <pre className="text-sm font-mono whitespace-pre-wrap text-white p-4 leading-relaxed">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-gray-400">
                <div className="animate-spin w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full mr-2"></div>
                Loading logs...
              </div>
            ) : (
              logs || (
                <div className="text-center py-8 text-gray-400">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No logs available</p>
                </div>
              )
            )}
          </pre>
        </div>
      </CardContent>
    </Card>
  )
}
