'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Eye, Wallet, Clock, BarChart3, CheckCircle, AlertTriangle, Copy, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ObserverReport {
  formatVersion: number
  observerAddress: string
  epochIndex: number
  epochStartTimestamp: number
  epochStartHeight: number
  epochEndTimestamp: number
  generatedAt: number
}

interface ObserverReportResponse {
  success: boolean
  endpoint?: string
  data?: ObserverReport
  error?: string
  endpoints?: string[]
}

export function ObserverInfoCard() {
  const [observerReport, setObserverReport] = useState<ObserverReportResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchObserverReport = async () => {
    if (initialLoad) {
      setLoading(true)
    }
    setError(null)
    try {
      const response = await fetch('/api/observer/current-report')
      const data = await response.json()
      
      if (response.ok) {
        setObserverReport(data)
      } else {
        setError(data.error || 'Failed to fetch Observer current report')
        setObserverReport(data)
      }
    } catch (error: any) {
      setError(`Network error: ${error.message}`)
      setObserverReport(null)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }

  useEffect(() => {
    fetchObserverReport()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchObserverReport, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatTimestamp = (timestamp: number): string => {
    if (!timestamp || isNaN(timestamp)) {
      return 'N/A'
    }
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  const getRelativeTime = (timestamp: number): string => {
    if (!timestamp || isNaN(timestamp)) {
      return 'N/A'
    }
    const now = Date.now()
    const diff = Math.abs(now - timestamp) // Use absolute value for future times
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    // Determine if it's past or future
    const isPast = now > timestamp
    const suffix = isPast ? ' ago' : ' from now'

    if (days > 0) return `${days}d${suffix}`
    if (hours > 0) return `${hours}h${suffix}`
    if (minutes > 0) return `${minutes}m${suffix}`
    return `${seconds}s${suffix}`
  }

  const getEpochProgress = (startTime: number, endTime: number, currentTime: number): number => {
    if (currentTime < startTime) return 0
    if (currentTime > endTime) return 100
    const progress = ((currentTime - startTime) / (endTime - startTime)) * 100
    return Math.min(100, Math.max(0, progress))
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Observer Current Report
          </CardTitle>
          <CardDescription>
            Current epoch report from Observer service
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-400">Loading Observer report...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && !observerReport?.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Observer Current Report
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardTitle>
          <CardDescription>
            Current epoch report from Observer service
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
              {observerReport?.endpoints && (
                <div className="mt-2 text-sm text-gray-500">
                  Tried endpoints: {observerReport.endpoints.join(', ')}
                </div>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const data = observerReport?.data
  if (!data) {
    return null
  }

  const currentTime = Date.now()
  const epochProgress = getEpochProgress(data.epochStartTimestamp || 0, data.epochEndTimestamp || 0, currentTime)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Observer Current Report
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Top Row - Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Badge variant="outline" className="text-xs">
                Format Version
              </Badge>
              <div className="text-lg font-semibold text-white">
                v{data.formatVersion ?? 'N/A'}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-400" />
                <Badge variant="outline" className="text-xs">
                  Epoch Index
                </Badge>
              </div>
              <div className="text-lg font-semibold text-white">
                #{data.epochIndex ?? 'N/A'}
              </div>
            </div>
            <div className="space-y-2">
              <Badge variant="outline" className="text-xs">
                Start Height
              </Badge>
              <div className="text-lg font-semibold text-white">
                {data.epochStartHeight?.toLocaleString() ?? 'N/A'}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-400" />
                <Badge variant="outline" className="text-xs">
                  Report Generated
                </Badge>
              </div>
              <div className="text-lg font-semibold text-white">
                {getRelativeTime(data.generatedAt)}
              </div>
            </div>
          </div>

          {/* Observer Address Row */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-orange-400" />
              <Badge variant="outline" className="text-xs">
                Observer Address
              </Badge>
            </div>
            <div className="flex items-center gap-2 p-3 bg-gray-800 rounded-lg">
            <div className="text-sm font-mono text-white flex-1 break-all leading-relaxed">
              {data.observerAddress || 'N/A'}
            </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigator.clipboard.writeText(data.observerAddress)}
                className="h-8 w-8 p-0 text-gray-400 hover:text-white flex-shrink-0"
                title="Copy address to clipboard"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Epoch Progress Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-400" />
              <Badge variant="outline" className="text-xs">
                Epoch Progress
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-white">
                  {epochProgress.toFixed(1)}%
                </span>
                <span className="text-sm text-gray-400">
                  {getRelativeTime(data.epochStartTimestamp)} → {getRelativeTime(data.epochEndTimestamp)}
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-3">
                <div 
                  className="bg-purple-500 h-3 rounded-full transition-all duration-300" 
                  style={{ width: `${epochProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
