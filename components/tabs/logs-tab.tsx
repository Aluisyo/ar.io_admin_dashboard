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
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface LogsTabProps {
  service: string
}

export function LogsTab({ service }: LogsTabProps) {
  const [logs, setLogs] = useState('')
  const [initialLoading, setInitialLoading] = useState(true)
  const [exportingAll, setExportingAll] = useState(false)
  const [filterKeyword, setFilterKeyword] = useState('')
  const [logLevel, setLogLevel] = useState('all')
  const [lastLogTimestamp, setLastLogTimestamp] = useState<string | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)


  // Fetch initial logs (with loading spinner)
  const fetchInitialLogs = async () => {
    setInitialLoading(true);
    try {
      const url = new URL(`/api/docker/${service}/logs`, window.location.origin);
      if (filterKeyword) {
        url.searchParams.append('keyword', filterKeyword);
      }
      if (logLevel !== 'all') {
        url.searchParams.append('level', logLevel);
      }
      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.text();
        setLogs(data);
        // Extract timestamp from last log line for tailing
        const lines = data.trim().split('\n');
        if (lines.length > 0 && lines[lines.length - 1]) {
          setLastLogTimestamp(new Date().toISOString());
        }
      } else {
        setLogs('Failed to fetch logs.');
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      setLogs('Error fetching logs.');
    } finally {
      setInitialLoading(false);
    }
  };

  // Tail new logs (without loading spinner)
  const tailNewLogs = async () => {
    try {
      const url = new URL(`/api/docker/${service}/logs`, window.location.origin);
      url.searchParams.append('tail', 'true'); // Indicate we want only new logs
      if (lastLogTimestamp) {
        url.searchParams.append('since', lastLogTimestamp);
      }
      if (filterKeyword) {
        url.searchParams.append('keyword', filterKeyword);
      }
      if (logLevel !== 'all') {
        url.searchParams.append('level', logLevel);
      }
      
      const response = await fetch(url.toString());
      if (response.ok) {
        const newLogs = await response.text();
        if (newLogs && newLogs.trim()) {
          setLogs(prevLogs => {
            const combined = prevLogs + '\n' + newLogs;
            // Keep only last 200 lines to prevent memory issues
            const lines = combined.split('\n');
            if (lines.length > 200) {
              return lines.slice(-200).join('\n');
            }
            return combined;
          });
          setLastLogTimestamp(new Date().toISOString());
        }
      }
    } catch (error) {
      console.error('Failed to tail logs:', error);
    }
  };

  // Manual refresh (with loading spinner)
  const fetchFreshLogs = async () => {
    setInitialLoading(true);
    try {
      const url = new URL(`/api/docker/${service}/logs`, window.location.origin);
      if (filterKeyword) {
        url.searchParams.append('keyword', filterKeyword);
      }
      if (logLevel !== 'all') {
        url.searchParams.append('level', logLevel);
      }
      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.text();
        setLogs(data);
        setLastLogTimestamp(new Date().toISOString());
      } else {
        setLogs('Failed to fetch logs.');
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      setLogs('Error fetching logs.');
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    // Clean up previous polling
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    // Fetch initial logs
    fetchInitialLogs();
    
    // Set up tailing interval (every 5 seconds, but no loading spinner)
    const interval = setInterval(() => {
      if (!abortControllerRef.current?.signal.aborted) {
        tailNewLogs();
      }
    }, 5000);
    
    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [service, filterKeyword, logLevel]); // Re-fetch logs when service, keyword, or log level changes

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [logs]);

  const handleRefresh = async () => {
    await fetchFreshLogs();
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
    <Card className="dashboard-card">
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
              className="form-input flex-1 min-w-0"
            />
            <Select value={logLevel} onValueChange={setLogLevel}>
              <SelectTrigger className="w-full sm:w-48 form-input">
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
            <Button onClick={handleRefresh} variant="outline" size="sm" disabled={initialLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 sm:mr-2 ${initialLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{initialLoading ? 'Loading...' : 'Refresh'}</span>
              <span className="sm:hidden">{initialLoading ? '...' : 'R'}</span>
            </Button>
            <Button onClick={handleDownload} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Recent</span>
              <span className="sm:hidden">D</span>
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
            {initialLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="sm" message="Loading logs..." />
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
