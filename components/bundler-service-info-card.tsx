'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Server, Wallet, Globe, HardDrive, CheckCircle, AlertTriangle, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BundlerInfo {
  version: string
  addresses: {
    arweave: string
  }
  gateway: string
  freeUploadLimitBytes: number
}

interface BundlerInfoResponse {
  success: boolean
  endpoint?: string
  data?: BundlerInfo
  error?: string
  endpoints?: string[]
}

export function BundlerServiceInfoCard() {
  const [bundlerInfo, setBundlerInfo] = useState<BundlerInfoResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBundlerInfo = async () => {
    if (initialLoad) {
      setLoading(true)
    }
    setError(null)
    try {
      const response = await fetch('/api/bundler/info')
      const data = await response.json()
      
      if (response.ok) {
        setBundlerInfo(data)
      } else {
        setError(data.error || 'Failed to fetch bundler info')
        setBundlerInfo(data)
      }
    } catch (error: any) {
      setError(`Network error: ${error.message}`)
      setBundlerInfo(null)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }

  useEffect(() => {
    fetchBundlerInfo()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchBundlerInfo, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const truncateAddress = (address: string): string => {
    if (address.length <= 12) return address
    return `${address.slice(0, 6)}...${address.slice(-6)}`
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Bundler Service Info
          </CardTitle>
          <CardDescription>
            Information from bundler service endpoint
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-400">Loading bundler info...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && !bundlerInfo?.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Bundler Service Info
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardTitle>
          <CardDescription>
            Information from bundler service endpoint
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
              {bundlerInfo?.endpoints && (
                <div className="mt-2 text-sm text-gray-500">
                  Tried endpoints: {bundlerInfo.endpoints.join(', ')}
                </div>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const data = bundlerInfo?.data
  if (!data) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Bundler Service Info
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Version */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Version
              </Badge>
            </div>
            <div className="text-lg font-semibold text-white">
              {data.version}
            </div>
          </div>

          {/* Arweave Address */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-orange-400" />
              <Badge variant="outline" className="text-xs">
                Arweave Address
              </Badge>
            </div>
            <div className="flex items-start gap-2">
              <div className="text-sm font-mono text-white break-all flex-1">
                {data.addresses.arweave}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigator.clipboard.writeText(data.addresses.arweave)}
                className="h-6 w-6 p-0 text-gray-400 hover:text-white flex-shrink-0"
                title="Copy address to clipboard"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Gateway */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-400" />
              <Badge variant="outline" className="text-xs">
                Gateway
              </Badge>
            </div>
            <div className="text-lg font-semibold text-white">
              {data.gateway}
            </div>
          </div>

          {/* Free Upload Limit */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-green-400" />
              <Badge variant="outline" className="text-xs">
                Upload Limit
              </Badge>
            </div>
            <div className="text-lg font-semibold text-white">
              {formatBytes(data.freeUploadLimitBytes)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
