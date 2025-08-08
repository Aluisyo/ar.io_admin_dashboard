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
import { RefreshCw, Download, Filter, Search } from 'lucide-react'

interface LogsTabProps {
  service: string
}

export function LogsTab({ service }: LogsTabProps) {
  const [logs, setLogs] = useState('')
  const [loading, setLoading] = useState(true)
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
    a.download = `${service}-logs.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Container Logs</CardTitle>
        <CardDescription className="text-gray-300"> {/* Adjusted text color */}
          View recent logs from the {service} container
        </CardDescription>

      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-1">
            <Input
              placeholder="Search logs"
              value={filterKeyword}
              onChange={e => setFilterKeyword(e.target.value)}
              className="bg-gray-900 border-gray-700 text-white placeholder-gray-400"
            />
            <Select value={logLevel} onValueChange={setLogLevel}>
              <SelectTrigger className="w-full bg-gray-900 border-gray-700 text-white">
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
          <Button onClick={handleDownload} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>

        <div ref={scrollAreaRef} className="h-[500px] w-full rounded-md border overflow-auto p-4">
          <pre className="text-sm font-mono whitespace-pre-wrap text-white">
            {logs || 'No logs available'}
          </pre>
        </div>
      </CardContent>
    </Card>
  )
}
