'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, X, Save, RefreshCw, Code, Eye } from 'lucide-react'
import { getApiUrl } from '@/lib/api-utils'

interface FilterRule {
  id: string
  type: 'tag' | 'attribute'
  field: string
  operator: string
  value: string
}

interface FilterSet {
  name: string
  description: string
  rules: FilterRule[]
}

interface VisualIndexFiltersBuilderProps {
  service: string
}

export function VisualIndexFiltersBuilder({ service }: VisualIndexFiltersBuilderProps) {
  const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  
  const [filterSets, setFilterSets] = useState<Record<string, FilterSet>>({
    unbundleFilter: {
      name: 'Unbundle Filter',
      description: 'Controls which bundles are processed for unbundling',
      rules: []
    },
    indexFilter: {
      name: 'Index Filter', 
      description: 'Controls which data items are indexed',
      rules: []
    }
  })

  const [codeView, setCodeView] = useState('')

  const operatorOptions = {
    tag: [
      { value: 'equals', label: 'Equals' },
      { value: 'startsWith', label: 'Starts With' },
      { value: 'endsWith', label: 'Ends With' },
      { value: 'contains', label: 'Contains' }
    ],
    attribute: [
      { value: 'equals', label: 'Equals' },
      { value: 'greaterThan', label: 'Greater Than' },
      { value: 'lessThan', label: 'Less Than' },
      { value: 'greaterOrEqual', label: 'Greater Or Equal' },
      { value: 'lessOrEqual', label: 'Less Or Equal' }
    ]
  }

  const commonTagFields = [
    'App-Name',
    'App-Version', 
    'Content-Type',
    'Data-Protocol',
    'Protocol-Name',
    'Type',
    'Title',
    'Description',
    'Author'
  ]

  const commonAttributeFields = [
    'data_size',
    'block_height', 
    'block_timestamp',
    'owner_address',
    'target'
  ]

  const generateRuleId = () => Math.random().toString(36).substr(2, 9)

  const fetchFilters = async () => {
    setLoading(true)
    try {
      const response = await fetch(getApiUrl('/index-filters'))
      if (response.ok) {
        const data = await response.json()
        
        // Convert API data to visual builder format
        const newFilterSets = { ...filterSets }
        
        newFilterSets.unbundleFilter.rules = parseFilterToRules(data.unbundleFilter || {})
        newFilterSets.indexFilter.rules = parseFilterToRules(data.indexFilter || {})

        setFilterSets(newFilterSets)
        updateCodeView(newFilterSets)
      }
    } catch (error) {
      console.error('Failed to fetch filters:', error)
    } finally {
      setLoading(false)
    }
  }

  const parseFilterToRules = (filter: any): FilterRule[] => {
    const rules: FilterRule[] = []
    
    if (filter.tags) {
      if (Array.isArray(filter.tags)) {
        filter.tags.forEach((tag: any) => {
          rules.push({
            id: generateRuleId(),
            type: 'tag',
            field: tag.name || '',
            operator: tag.valueStartsWith ? 'startsWith' : 
                     tag.valueEndsWith ? 'endsWith' :
                     tag.valueContains ? 'contains' : 'equals',
            value: tag.value || tag.valueStartsWith || tag.valueEndsWith || tag.valueContains || ''
          })
        })
      } else if (typeof filter.tags === 'object') {
        Object.entries(filter.tags).forEach(([key, value]) => {
          rules.push({
            id: generateRuleId(),
            type: 'tag',
            field: key,
            operator: 'equals',
            value: value as string
          })
        })
      }
    }

    if (filter.attributes || filter.data) {
      const attrs = filter.attributes || filter.data
      Object.entries(attrs).forEach(([key, value]) => {
        rules.push({
          id: generateRuleId(),
          type: 'attribute',
          field: key,
          operator: 'equals',
          value: String(value)
        })
      })
    }

    return rules
  }

  const convertRulesToFilter = (rules: FilterRule[]) => {
    const filter: any = {}
    const tags: any[] = []
    const attributes: any = {}

    rules.forEach(rule => {
      if (rule.type === 'tag') {
        const tagRule: any = { name: rule.field }
        
        switch (rule.operator) {
          case 'equals':
            tagRule.value = rule.value
            break
          case 'startsWith':
            tagRule.valueStartsWith = rule.value
            break
          case 'endsWith':
            tagRule.valueEndsWith = rule.value
            break
          case 'contains':
            tagRule.valueContains = rule.value
            break
        }
        
        tags.push(tagRule)
      } else if (rule.type === 'attribute') {
        let value: any = rule.value
        
        // Try to convert numeric values
        if (!isNaN(Number(rule.value))) {
          value = Number(rule.value)
        }
        
        switch (rule.operator) {
          case 'equals':
            attributes[rule.field] = value
            break
          case 'greaterThan':
            attributes[rule.field] = { '>': value }
            break
          case 'lessThan':
            attributes[rule.field] = { '<': value }
            break
          case 'greaterOrEqual':
            attributes[rule.field] = { '>=': value }
            break
          case 'lessOrEqual':
            attributes[rule.field] = { '<=': value }
            break
        }
      }
    })

    if (tags.length > 0) filter.tags = tags
    if (Object.keys(attributes).length > 0) filter.attributes = attributes

    return filter
  }

  const updateCodeView = (sets: Record<string, FilterSet>) => {
    const jsonFilter: any = {}
    
    Object.entries(sets).forEach(([key, filterSet]) => {
      jsonFilter[key] = convertRulesToFilter(filterSet.rules)
    })

    setCodeView(JSON.stringify(jsonFilter, null, 2))
  }

  const addRule = (filterKey: string) => {
    const newFilterSets = { ...filterSets }
    newFilterSets[filterKey].rules.push({
      id: generateRuleId(),
      type: 'tag',
      field: '',
      operator: 'equals',
      value: ''
    })
    setFilterSets(newFilterSets)
    updateCodeView(newFilterSets)
  }

  const removeRule = (filterKey: string, ruleId: string) => {
    const newFilterSets = { ...filterSets }
    newFilterSets[filterKey].rules = newFilterSets[filterKey].rules.filter(rule => rule.id !== ruleId)
    setFilterSets(newFilterSets)
    updateCodeView(newFilterSets)
  }

  const updateRule = (filterKey: string, ruleId: string, field: keyof FilterRule, value: any) => {
    const newFilterSets = { ...filterSets }
    const rule = newFilterSets[filterKey].rules.find(r => r.id === ruleId)
    if (rule) {
      (rule as any)[field] = value
      
      // Reset operator when changing rule type
      if (field === 'type') {
        rule.operator = 'equals'
      }
    }
    setFilterSets(newFilterSets)
    updateCodeView(newFilterSets)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')

    try {
      const filterData = JSON.parse(codeView)
      
      const response = await fetch(getApiUrl('/index-filters'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filterData)
      })

      if (response.ok) {
        setMessage('Index filters saved successfully to .env!')
      } else {
        const errorData = await response.json()
        setMessage(`Failed to save index filters: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      setMessage(`Error saving index filters: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    fetchFilters()
  }, [service])

  useEffect(() => {
    updateCodeView(filterSets)
  }, [filterSets])

  if (loading) {
    return <div>Loading index filters...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Index Filters</CardTitle>
              <CardDescription>
                Configure filtering rules for your gateway's indexing operations
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'visual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('visual')}
              >
                <Eye className="h-4 w-4 mr-1" />
                Visual
              </Button>
              <Button
                variant={viewMode === 'code' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('code')}
              >
                <Code className="h-4 w-4 mr-1" />
                Code
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Filters'}
            </Button>
            <Button onClick={fetchFilters} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {message && (
            <Alert className="mt-4">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {viewMode === 'visual' ? (
        /* Visual Builder */
        <div className="space-y-6">
          {Object.entries(filterSets).map(([filterKey, filterSet]) => (
            <Card key={filterKey}>
              <CardHeader>
                <CardTitle className="text-lg">{filterSet.name}</CardTitle>
                <CardDescription>{filterSet.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {filterSet.rules.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    No rules configured. Click "Add Rule" to get started.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filterSet.rules.map((rule, index) => (
                      <div key={rule.id} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                        <Badge variant="outline" className="min-w-[60px]">
                          {index + 1}
                        </Badge>

                        {/* Rule Type */}
                        <Select value={rule.type} onValueChange={(value) => updateRule(filterKey, rule.id, 'type', value)}>
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tag">Tag</SelectItem>
                            <SelectItem value="attribute">Attribute</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Field */}
                        <div className="flex-1">
                          <Select value={rule.field} onValueChange={(value) => updateRule(filterKey, rule.id, 'field', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select field" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Custom field...</SelectItem>
                              {(rule.type === 'tag' ? commonTagFields : commonAttributeFields).map(field => (
                                <SelectItem key={field} value={field}>{field}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {!rule.field && (
                            <Input
                              placeholder="Enter custom field name"
                              className="mt-2"
                              onChange={(e) => updateRule(filterKey, rule.id, 'field', e.target.value)}
                            />
                          )}
                        </div>

                        {/* Operator */}
                        <Select value={rule.operator} onValueChange={(value) => updateRule(filterKey, rule.id, 'operator', value)}>
                          <SelectTrigger className="w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {operatorOptions[rule.type]?.map(op => (
                              <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Value */}
                        <Input
                          placeholder="Value"
                          value={rule.value}
                          onChange={(e) => updateRule(filterKey, rule.id, 'value', e.target.value)}
                          className="w-[200px]"
                        />

                        {/* Remove Rule */}
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => removeRule(filterKey, rule.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Button variant="outline" onClick={() => addRule(filterKey)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Code View */
        <Card>
          <CardHeader>
            <CardTitle>Generated JSON Configuration</CardTitle>
            <CardDescription>
              This is the JSON that will be saved to your .env file. You can edit it directly if needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <textarea
              value={codeView}
              onChange={(e) => setCodeView(e.target.value)}
              className="w-full h-[500px] font-mono text-sm bg-gray-900 border border-gray-700 rounded-md p-4 text-white placeholder:text-gray-400"
              placeholder="Generated filter configuration will appear here..."
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
