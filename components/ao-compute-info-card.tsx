'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Cpu, Wallet, Clock, CheckCircle, AlertTriangle, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AOCUInfo {
  address: string
  timestamp: number
}

interface AOCUInfoResponse {
  success: boolean
  endpoint?: string
  data?: AOCUInfo
  error?: string
  endpoints?: string[]
}

export function AOComputeInfoCard() {
  const [aoCUInfo, setAOCUInfo] = useState<AOCUInfoResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAOCUInfo = async () => {
    if (initialLoad) {
      setLoading(true)
    }
    setError(null)
    try {
      const response = await fetch('/api/ao/cu/info')
      const data = await response.json()
      
      if (response.ok) {
        setAOCUInfo(data)
      } else {
        setError(data.error || 'Failed to fetch AO compute unit info')
        setAOCUInfo(data)
      }
    } catch (error: any) {
      setError(`Network error: ${error.message}`)
      setAOCUInfo(null)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }

  useEffect(() => {
    fetchAOCUInfo()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchAOCUInfo, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  const getRelativeTime = (timestamp: number): string => {
    const now = Date.now()
    const diff = now - timestamp
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return `${seconds}s ago`
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            AO Compute Unit
          </CardTitle>
          <CardDescription>
            Information from AO compute unit service
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-400">Loading AO CU info...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && !aoCUInfo?.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            AO Compute Unit
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardTitle>
          <CardDescription>
            Information from AO compute unit service
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
              {aoCUInfo?.endpoints && (
                <div className="mt-2 text-sm text-gray-500">
                  Tried endpoints: {aoCUInfo.endpoints.join(', ')}
                </div>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const data = aoCUInfo?.data
  if (!data) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cpu className="h-5 w-5" />
          AO Compute Unit
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Address */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-orange-400" />
              <Badge variant="outline" className="text-xs">
                CU Address
              </Badge>
            </div>
            <div className="flex items-start gap-2">
              <div className="text-sm font-mono text-white break-all flex-1">
                {data.address}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigator.clipboard.writeText(data.address)}
                className="h-6 w-6 p-0 text-gray-400 hover:text-white flex-shrink-0"
                title="Copy address to clipboard"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Timestamp */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-400" />
              <Badge variant="outline" className="text-xs">
                Last Activity
              </Badge>
            </div>
            <div className="text-lg font-semibold text-white">
              {getRelativeTime(data.timestamp)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
