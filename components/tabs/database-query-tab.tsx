'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Play, AlertTriangle, Database } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getApiUrl } from '@/lib/api-utils'

interface DatabaseQueryTabProps {
  service: string
}

export function DatabaseQueryTab({ service }: DatabaseQueryTabProps) {
  const [dbType, setDbType] = useState<'sqlite' | 'clickhouse'>(
    service === 'gateway' ? 'sqlite' : 'clickhouse'
  )
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const handleExecuteQuery = async () => {
    setLoading(true)
    setError('')
    setResult('')

    try {
      const response = await fetch(getApiUrl('/api/database/query'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dbType, service, query }),
      })

      if (response.ok) {
        const data = await response.json()
        setResult(JSON.stringify(data, null, 2))
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to execute query.')
      }
    } catch (err: any) {
      setError(`Network error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="dashboard-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Database className="h-4 w-4 icon-success" />Database Query</CardTitle>
        <CardDescription className="text-gray-300">
          Execute SQL queries against the {service === 'gateway' ? 'Gateway\'s SQLite' : 'ClickHouse'} database.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive" className="bg-gray-800 border-gray-600 text-white">
          <AlertTriangle className="h-4 w-4 icon-error" />
          <AlertDescription>
            <span className="font-bold">Security Warning:</span> Directly executing user-provided SQL queries can lead to SQL injection vulnerabilities. This feature is for administrative use only. In a production environment, ensure proper sanitization or use parameterized queries.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="db-type" className="text-white">Database Type</Label>
            <Select value={dbType} onValueChange={(value: 'sqlite' | 'clickhouse') => setDbType(value)}>
            <SelectTrigger className="form-input">
                <SelectValue placeholder="Select database" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700 text-white">
                {service === 'gateway' && <SelectItem value="sqlite">SQLite</SelectItem>}
                {service === 'clickhouse' && <SelectItem value="clickhouse">ClickHouse</SelectItem>}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="query-input" className="text-white">SQL Query</Label>
          <Textarea
            id="query-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              dbType === 'sqlite'
                ? 'e.g., SELECT * FROM transactions LIMIT 10;'
                : 'e.g., SELECT * FROM my_table LIMIT 10;'
            }
            className="min-h-[150px] font-mono text-sm form-textarea"
          />
        </div>

        <Button onClick={handleExecuteQuery} disabled={loading || !query}>
          <Play className="h-4 w-4 mr-2" />
          {loading ? 'Executing...' : 'Execute Query'}
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-2">
            <Label className="text-white">Query Result</Label>
            <ScrollArea className="h-[300px] w-full rounded-md border bg-gray-900 border-gray-700">
              <pre className="p-4 text-sm font-mono whitespace-pre-wrap text-white">
                {result}
              </pre>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
