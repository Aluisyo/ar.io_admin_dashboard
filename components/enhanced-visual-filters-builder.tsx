'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Plus, X, Save, RefreshCw, Code, Eye, CheckCircle, AlertCircle, 
  GitBranch, Network, Hash, Layers, Shield, Filter, Copy
} from 'lucide-react'

import { 
  FilterRule, 
  FilterSet,
  TagFilterRule,
  AttributeFilterRule,
  SpecialFilterRule,
  NestedBundleFilterRule,
  HashPartitionFilterRule,
  LogicalGroupFilterRule,
  CommonTagFields,
  CommonAttributeFields,
  HashPartitionKeys,
  OperatorOptions,
  FilterTemplates,
  isLogicalGroupFilterRule
} from '@/types/filters'

import { 
  parseFilterToRules, 
  convertRulesToFilter, 
  generateRuleId, 
  validateFilter 
} from '@/lib/filter-utils'

interface EnhancedVisualFiltersBuilderProps {
  service: string
}

export function EnhancedVisualFiltersBuilder({ service }: EnhancedVisualFiltersBuilderProps) {
  const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  
  const [filterSets, setFilterSets] = useState<Record<string, FilterSet>>({
    ANS104_UNBUNDLE_FILTER: {
      name: 'Unbundle Filter',
      description: 'Controls which bundles are processed for unbundling',
      rules: []
    },
    ANS104_INDEX_FILTER: {
      name: 'Index Filter', 
      description: 'Controls which data items are indexed',
      rules: []
    },
    WEBHOOK_INDEX_FILTER: {
      name: 'Webhook Index Filter',
      description: 'Controls which data items trigger indexing webhooks',
      rules: []
    },
    WEBHOOK_BLOCK_FILTER: {
      name: 'Webhook Block Filter',
      description: 'Controls which blocks trigger webhook notifications',
      rules: []
    }
  })

  const [codeView, setCodeView] = useState('')
  const [expandedLogicalGroups, setExpandedLogicalGroups] = useState<Set<string>>(new Set())
  const [selectedTemplateTarget, setSelectedTemplateTarget] = useState<string>('')

  // Fetch existing filters from the server
  const fetchFilters = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/filters')
      if (response.ok) {
        const data = await response.json()
        console.log('API Response data:', data)
        console.log('Available keys in response:', Object.keys(data))
        console.log('Expected filterSets keys:', Object.keys(filterSets))
        
        const newFilterSets = { ...filterSets }
        
        // Map API response keys to internal filter keys
        const keyMapping: Record<string, string> = {
          'unbundleFilter': 'ANS104_UNBUNDLE_FILTER',
          'indexFilter': 'ANS104_INDEX_FILTER', 
          'webhookIndexFilter': 'WEBHOOK_INDEX_FILTER',
          'webhookBlockFilter': 'WEBHOOK_BLOCK_FILTER',
          // Also handle direct key matches
          'ANS104_UNBUNDLE_FILTER': 'ANS104_UNBUNDLE_FILTER',
          'ANS104_INDEX_FILTER': 'ANS104_INDEX_FILTER',
          'WEBHOOK_INDEX_FILTER': 'WEBHOOK_INDEX_FILTER',
          'WEBHOOK_BLOCK_FILTER': 'WEBHOOK_BLOCK_FILTER'
        }
        
        Object.entries(data).forEach(([key, value]) => {
          const filterKey = keyMapping[key] || key
          console.log(`Processing filter ${key} -> ${filterKey}:`, { type: typeof value, value })
          
          if (newFilterSets[filterKey]) {
            if (value && typeof value === 'object') {
              // Already parsed object
              console.log(`Loading filter ${filterKey}:`, value)
              const parsedRules = parseFilterToRules(value as any)
              console.log(`Parsed ${parsedRules.length} rules for ${filterKey}:`, parsedRules)
              newFilterSets[filterKey].rules = parsedRules
            } else if (typeof value === 'string' && value.trim() !== '') {
              // Try to parse JSON string (handle double-escaped strings)
              console.log(`Received string for ${filterKey}: "${value}", attempting to parse as JSON`)
              
              // Check if the string looks like incomplete JSON
              const trimmedValue = value.trim()
              if (trimmedValue === '{' || trimmedValue === '[' || trimmedValue === '"' || trimmedValue.length < 2) {
                console.warn(`Detected incomplete/malformed JSON for ${filterKey}: "${value}", treating as empty filter`)
                newFilterSets[filterKey].rules = []
              } else {
                try {
                  // First attempt: parse as-is
                  let parsedValue
                  try {
                    parsedValue = JSON.parse(value)
                  } catch (firstError) {
                    // Second attempt: unescape the string and try again
                    console.log(`First parse failed, trying to unescape double-escaped JSON...`)
                    const unescapedValue = value.replace(/\\"/g, '"')
                    console.log(`Unescaped value: "${unescapedValue}"`)
                    parsedValue = JSON.parse(unescapedValue)
                  }
                  
                  console.log(`Successfully parsed JSON for ${filterKey}:`, parsedValue)
                  const parsedRules = parseFilterToRules(parsedValue)
                  console.log(`Parsed ${parsedRules.length} rules for ${filterKey}:`, parsedRules)
                  newFilterSets[filterKey].rules = parsedRules
                } catch (parseError) {
                  console.warn(`Failed to parse JSON for ${filterKey}:`, parseError, 'Original value:', value)
                  newFilterSets[filterKey].rules = []
                }
              }
            } else {
              // Handle null, undefined, empty string, etc.
              console.log(`Empty or invalid value for ${filterKey}:`, value)
              newFilterSets[filterKey].rules = []
            }
          } else {
            console.log(`No matching filterSet for ${filterKey}`)
          }
        })

        setFilterSets(newFilterSets)
        updateCodeView(newFilterSets)
        
        // Log successful load
        const loadedCount = Object.values(newFilterSets).reduce((count, filter) => count + filter.rules.length, 0)
        const totalExpected = 4 // ANS104_UNBUNDLE_FILTER, ANS104_INDEX_FILTER, WEBHOOK_INDEX_FILTER, WEBHOOK_BLOCK_FILTER
        const loadedFilters = Object.values(newFilterSets).filter(filter => filter.rules.length > 0).length
        
        if (loadedCount > 0) {
          if (loadedFilters < totalExpected) {
            setMessage(`Loaded ${loadedCount} filter rules from ${loadedFilters} of ${totalExpected} filters. Some filters had corrupted data and were reset to empty.`)
          } else {
            setMessage(`Loaded ${loadedCount} existing filter rules successfully`)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch filters:', error)
      setMessage('Failed to load existing filters')
    } finally {
      setLoading(false)
    }
  }

  const updateCodeView = (sets: Record<string, FilterSet>) => {
    const jsonFilter: any = {}
    
    Object.entries(sets).forEach(([key, filterSet]) => {
      jsonFilter[key] = convertRulesToFilter(filterSet.rules)
    })

    setCodeView(JSON.stringify(jsonFilter, null, 2))
  }

  const addRule = (filterKey: string, ruleType: FilterRule['type'] = 'tag', parentId?: string) => {
    const newFilterSets = { ...filterSets }
    
    let newRule: FilterRule
    
    switch (ruleType) {
      case 'tag':
        newRule = {
          id: generateRuleId(),
          type: 'tag',
          field: '',
          operator: 'equals',
          value: ''
        } as TagFilterRule
        break
      case 'attribute':
        newRule = {
          id: generateRuleId(),
          type: 'attribute',
          field: '',
          operator: 'equals',
          value: ''
        } as AttributeFilterRule
        break
      case 'special':
        newRule = {
          id: generateRuleId(),
          type: 'special',
          field: 'never',
          value: true
        } as SpecialFilterRule
        break
      case 'nested':
        newRule = {
          id: generateRuleId(),
          type: 'nested',
          field: 'isNestedBundle',
          value: true
        } as NestedBundleFilterRule
        break
      case 'partition':
        newRule = {
          id: generateRuleId(),
          type: 'partition',
          partitionCount: 4,
          partitionKey: 'owner_address',
          targetPartitions: [0]
        } as HashPartitionFilterRule
        break
      case 'logical':
        newRule = {
          id: generateRuleId(),
          type: 'logical',
          operator: 'and',
          rules: []
        } as LogicalGroupFilterRule
        break
      default:
        newRule = {
          id: generateRuleId(),
          type: 'tag',
          field: '',
          operator: 'equals',
          value: ''
        } as TagFilterRule
    }
    
    if (parentId) {
      // Add to a logical group
      const addToLogicalGroup = (rules: FilterRule[]): FilterRule[] => {
        return rules.map(rule => {
          if (rule.id === parentId && isLogicalGroupFilterRule(rule)) {
            return { ...rule, rules: [...rule.rules, newRule] }
          } else if (isLogicalGroupFilterRule(rule)) {
            return { ...rule, rules: addToLogicalGroup(rule.rules) }
          }
          return rule
        })
      }
      
      newFilterSets[filterKey].rules = addToLogicalGroup(newFilterSets[filterKey].rules)
    } else {
      // Add to root level
      newFilterSets[filterKey].rules.push(newRule)
    }
    
    setFilterSets(newFilterSets)
    updateCodeView(newFilterSets)
  }

  const removeRule = (filterKey: string, ruleId: string) => {
    const newFilterSets = { ...filterSets }
    
    const removeFromRules = (rules: FilterRule[]): FilterRule[] => {
      return rules.filter(rule => {
        if (rule.id === ruleId) {
          return false
        } else if (isLogicalGroupFilterRule(rule)) {
          return { ...rule, rules: removeFromRules(rule.rules) }
        }
        return true
      }).map(rule => {
        if (isLogicalGroupFilterRule(rule)) {
          return { ...rule, rules: removeFromRules(rule.rules) }
        }
        return rule
      })
    }
    
    newFilterSets[filterKey].rules = removeFromRules(newFilterSets[filterKey].rules)
    setFilterSets(newFilterSets)
    updateCodeView(newFilterSets)
  }

  const updateRule = (filterKey: string, ruleId: string, updates: Partial<FilterRule>) => {
    const newFilterSets = { ...filterSets }
    
    const updateInRules = (rules: FilterRule[]): FilterRule[] => {
      return rules.map(rule => {
        if (rule.id === ruleId) {
          return { ...rule, ...updates }
        } else if (isLogicalGroupFilterRule(rule)) {
          return { ...rule, rules: updateInRules(rule.rules) }
        }
        return rule
      })
    }
    
    newFilterSets[filterKey].rules = updateInRules(newFilterSets[filterKey].rules)
    setFilterSets(newFilterSets)
    updateCodeView(newFilterSets)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')

    try {
      const filterData = JSON.parse(codeView)
      
      // Validate the filter structure
      const validation = validateFilter(filterData)
      if (!validation.valid) {
        setMessage(`Validation errors: ${validation.errors.join(', ')}`)
        return
      }
      
      const response = await fetch('/api/filters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filterData)
      })

      if (response.ok) {
        setMessage('Enhanced filters saved successfully to .env!')
      } else {
        const errorData = await response.json()
        setMessage(`Failed to save filters: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      setMessage(`Error saving filters: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const loadTemplate = (templateKey: string) => {
    if (templateKey in FilterTemplates) {
      const template = FilterTemplates[templateKey as keyof typeof FilterTemplates]
      const rules = parseFilterToRules(template.filter)
      
      // Use selected target filter or default to first filter
      const targetFilterKey = selectedTemplateTarget || Object.keys(filterSets)[0]
      
      if (!filterSets[targetFilterKey]) {
        setMessage(`Invalid target filter: ${targetFilterKey}`)
        return
      }
      
      const newFilterSets = { ...filterSets }
      newFilterSets[targetFilterKey] = {
        ...newFilterSets[targetFilterKey],
        rules: rules
      }
      
      setFilterSets(newFilterSets)
      updateCodeView(newFilterSets)
      setMessage(`Loaded template "${template.name}" to ${filterSets[targetFilterKey].name}`)
    }
  }

  const toggleLogicalGroup = (ruleId: string) => {
    const newExpanded = new Set(expandedLogicalGroups)
    if (newExpanded.has(ruleId)) {
      newExpanded.delete(ruleId)
    } else {
      newExpanded.add(ruleId)
    }
    setExpandedLogicalGroups(newExpanded)
  }

  // Render individual filter rule
  const renderFilterRule = (rule: FilterRule, filterKey: string, depth = 0) => {
    const indentClass = depth > 0 ? `ml-${depth * 4}` : ''
    
    if (isLogicalGroupFilterRule(rule)) {
      const isExpanded = expandedLogicalGroups.has(rule.id)
      
      return (
        <div key={rule.id} className={`border border-gray-600 rounded-lg p-4 ${indentClass}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleLogicalGroup(rule.id)}
              >
                <GitBranch className="h-4 w-4" />
                {isExpanded ? '−' : '+'}
              </Button>
              
              <Badge variant="outline" className="bg-blue-500/20 text-blue-400">
                Logical Group
              </Badge>
              
              <Select 
                value={rule.operator} 
                onValueChange={(value) => updateRule(filterKey, rule.id, { operator: value as any })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OperatorOptions.logical.map(op => (
                    <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Badge variant="secondary">
                {rule.rules.length} rule{rule.rules.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => addRule(filterKey, 'tag', rule.id)}
              >
                <Plus className="h-4 w-4" />
                Add Rule
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => removeRule(filterKey, rule.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {isExpanded && rule.rules.length > 0 && (
            <div className="space-y-3 mt-4 pl-4 border-l border-gray-600">
              {rule.rules.map(subRule => renderFilterRule(subRule, filterKey, depth + 1))}
            </div>
          )}
        </div>
      )
    }

    // Regular filter rule rendering
    const getBadgeColor = (type: string) => {
      switch (type) {
        case 'tag': return 'bg-blue-500/20 text-blue-400'
        case 'attribute': return 'bg-green-500/20 text-green-400'
        case 'special': return 'bg-purple-500/20 text-purple-400'
        case 'nested': return 'bg-orange-500/20 text-orange-400'
        case 'partition': return 'bg-red-500/20 text-red-400'
        default: return 'bg-gray-500/20 text-gray-400'
      }
    }

    return (
      <div key={rule.id} className={`flex items-center gap-3 p-3 bg-gray-800 rounded-lg ${indentClass}`}>
        <Badge className={`${getBadgeColor(rule.type)} border-0 min-w-[80px] text-center`}>
          {rule.type}
        </Badge>

        {/* Rule-specific rendering based on type */}
        {rule.type === 'tag' && (
          <>
            <Select value={(rule as TagFilterRule).field} onValueChange={(value) => updateRule(filterKey, rule.id, { field: value })}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tag name" />
              </SelectTrigger>
              <SelectContent>
                {CommonTagFields.map(field => (
                  <SelectItem key={field} value={field}>{field}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={(rule as TagFilterRule).operator} onValueChange={(value) => updateRule(filterKey, rule.id, { operator: value })}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OperatorOptions.tag.map(op => (
                  <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {(rule as TagFilterRule).operator !== 'nameOnly' && (
              <Input
                placeholder="Value"
                value={(rule as TagFilterRule).value}
                onChange={(e) => updateRule(filterKey, rule.id, { value: e.target.value })}
                className="w-48"
              />
            )}
          </>
        )}

        {rule.type === 'attribute' && (
          <>
            <Select value={(rule as AttributeFilterRule).field} onValueChange={(value) => updateRule(filterKey, rule.id, { field: value })}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Attribute" />
              </SelectTrigger>
              <SelectContent>
                {CommonAttributeFields.map(field => (
                  <SelectItem key={field} value={field}>{field}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={(rule as AttributeFilterRule).operator} onValueChange={(value) => updateRule(filterKey, rule.id, { operator: value })}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OperatorOptions.attribute.map(op => (
                  <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Input
              placeholder="Value"
              value={String((rule as AttributeFilterRule).value)}
              onChange={(e) => updateRule(filterKey, rule.id, { value: e.target.value })}
              className="w-32"
            />
          </>
        )}

        {rule.type === 'special' && (
          <>
            <Select value={(rule as SpecialFilterRule).field} onValueChange={(value) => updateRule(filterKey, rule.id, { field: value as 'always' | 'never' })}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="always">Always Match</SelectItem>
                <SelectItem value="never">Never Match</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="text-xs">
              {(rule as SpecialFilterRule).value ? 'true' : 'false'}
            </Badge>
          </>
        )}

        {rule.type === 'nested' && (
          <>
            <span className="text-sm text-gray-300">isNestedBundle</span>
            <Select value={String((rule as NestedBundleFilterRule).value)} onValueChange={(value) => updateRule(filterKey, rule.id, { value: value === 'true' })}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">true</SelectItem>
                <SelectItem value="false">false</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}

        {rule.type === 'partition' && (
          <>
            <div className="flex items-center gap-2 text-sm">
              <span>Count:</span>
              <Input
                type="number"
                value={(rule as HashPartitionFilterRule).partitionCount}
                onChange={(e) => updateRule(filterKey, rule.id, { partitionCount: parseInt(e.target.value) })}
                className="w-20"
                min="1"
              />
            </div>
            
            <Select value={(rule as HashPartitionFilterRule).partitionKey} onValueChange={(value) => updateRule(filterKey, rule.id, { partitionKey: value })}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HashPartitionKeys.map(key => (
                  <SelectItem key={key} value={key}>{key}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-2 text-sm">
              <span>Targets:</span>
              <Input
                placeholder="0,1,2"
                value={(rule as HashPartitionFilterRule).targetPartitions.join(',')}
                onChange={(e) => {
                  const targets = e.target.value.split(',').map(t => parseInt(t.trim())).filter(n => !isNaN(n))
                  updateRule(filterKey, rule.id, { targetPartitions: targets })
                }}
                className="w-24"
              />
            </div>
          </>
        )}

        <Button
          variant="outline"
          size="icon"
          onClick={() => removeRule(filterKey, rule.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  useEffect(() => {
    fetchFilters()
  }, [service])

  useEffect(() => {
    updateCodeView(filterSets)
  }, [filterSets])

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading enhanced filters...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Enhanced AR.IO Gateway Filters
              </CardTitle>
              <CardDescription>
                Advanced filter configuration with logical operators, nested structures, and specialized filter types
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
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Filters'}
            </Button>
            <Button onClick={fetchFilters} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            
            <Separator orientation="vertical" className="h-6" />
            
            <div className="flex items-center gap-2">
              <Select value={selectedTemplateTarget} onValueChange={setSelectedTemplateTarget}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Target filter..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(filterSets).map(([key, filterSet]) => (
                    <SelectItem key={key} value={key}>{filterSet.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select onValueChange={loadTemplate}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Load Template..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FilterTemplates).map(([key, template]) => (
                    <SelectItem key={key} value={key}>{template.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {message && (
            <Alert className={`mt-4 ${message.includes('successfully') ? 'border-green-500/50' : 'border-red-500/50'}`}>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {viewMode === 'visual' ? (
        /* Enhanced Visual Builder */
        <div className="space-y-6">
          {Object.entries(filterSets).map(([filterKey, filterSet]) => (
            <Card key={filterKey}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Filter className="h-5 w-5" />
                      {filterSet.name}
                      {filterSet.rules.length > 0 ? (
                        <CheckCircle className="h-5 w-5 text-white" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-gray-400" />
                      )}
                    </CardTitle>
                    <CardDescription>{filterSet.description}</CardDescription>
                  </div>
                  <Badge variant={filterSet.rules.length > 0 ? "default" : "outline"}>
                    {filterSet.rules.length > 0 ? `${filterSet.rules.length} rule${filterSet.rules.length === 1 ? '' : 's'}` : 'No rules'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {filterSet.rules.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-600 rounded-lg">
                    <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No filters configured</p>
                    <p className="text-sm">Add rules to start filtering</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filterSet.rules.map(rule => renderFilterRule(rule, filterKey))}
                  </div>
                )}

                {/* Add Rule Controls */}
                <div className="border-t pt-4">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => addRule(filterKey, 'tag')}>
                      <Plus className="h-4 w-4 mr-1" />
                      Tag Filter
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => addRule(filterKey, 'attribute')}>
                      <Plus className="h-4 w-4 mr-1" />
                      Attribute Filter
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => addRule(filterKey, 'logical')}>
                      <GitBranch className="h-4 w-4 mr-1" />
                      Logical Group
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => addRule(filterKey, 'nested')}>
                      <Layers className="h-4 w-4 mr-1" />
                      Nested Bundle
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => addRule(filterKey, 'partition')}>
                      <Hash className="h-4 w-4 mr-1" />
                      Hash Partition
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => addRule(filterKey, 'special')}>
                      <Shield className="h-4 w-4 mr-1" />
                      Special
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Enhanced Code View */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Generated AR.IO Filter Configuration
            </CardTitle>
            <CardDescription>
              This JSON will be saved to your .env file. Advanced features include logical operators and specialized filters.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 z-10"
                onClick={() => navigator.clipboard.writeText(codeView)}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <textarea
                value={codeView}
                onChange={(e) => setCodeView(e.target.value)}
                className="w-full h-[600px] font-mono text-sm bg-gray-900 border border-gray-700 rounded-md p-4 text-white placeholder:text-gray-400 resize-none"
                placeholder="Generated AR.IO filter configuration will appear here..."
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
