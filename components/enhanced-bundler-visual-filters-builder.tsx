'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { 
  Plus, X, Save, RefreshCw, Code, Eye, CheckCircle, AlertCircle, 
  GitBranch, Package, Hash, Layers, Shield, Filter, Copy, Settings, Zap
} from 'lucide-react'

import { 
  FilterRule, 
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
import { getApiUrl } from '@/lib/api-utils'

interface BundlerFilterConfig {
  name: string
  description: string
  enabled: boolean
  rules: FilterRule[]
  bundlerSpecific?: {
    maxBundleSize?: number
    minBundleSize?: number
    bundleInterval?: number
    priorityMode?: 'size' | 'time' | 'hybrid'
  }
}

interface EnhancedBundlerVisualFiltersBuilderProps {
  service: string
}

export function EnhancedBundlerVisualFiltersBuilder({ service }: EnhancedBundlerVisualFiltersBuilderProps) {
  const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  
  const [bundlerFilters, setBundlerFilters] = useState<Record<string, BundlerFilterConfig>>({
    BUNDLE_FILTER: {
      name: 'Bundle Creation Filter',
      description: 'Controls which data items are included in bundles',
      enabled: true,
      rules: [],
      bundlerSpecific: {
        maxBundleSize: 1024 * 1024 * 10, // 10MB
        minBundleSize: 1024 * 100, // 100KB
        bundleInterval: 60, // 60 seconds
        priorityMode: 'hybrid'
      }
    },
    BUNDLE_INDEX_FILTER: {
      name: 'Bundle Index Filter',
      description: 'Controls which bundles are indexed after creation',
      enabled: true,
      rules: []
    },
    BUNDLE_VERIFICATION_FILTER: {
      name: 'Bundle Verification Filter', 
      description: 'Controls which bundles undergo verification processes',
      enabled: true,
      rules: []
    },
    BUNDLE_STORAGE_FILTER: {
      name: 'Bundle Storage Filter',
      description: 'Controls which bundles are stored in local/remote storage',
      enabled: true,
      rules: []
    }
  })

  const [codeView, setCodeView] = useState('')
  const [expandedLogicalGroups, setExpandedLogicalGroups] = useState<Set<string>>(new Set())
  const [showBundlerSettings, setShowBundlerSettings] = useState(false)
  const [selectedTemplateTarget, setSelectedTemplateTarget] = useState<string>('')

  // Fetch existing bundler filters from the server
  const fetchBundlerFilters = async () => {
    setLoading(true)
    try {
      const response = await fetch(getApiUrl('/bundler-filters'))
      if (response.ok) {
        const data = await response.json()
        console.log('Bundler API Response data:', data)
        console.log('Available keys in bundler response:', Object.keys(data))
        console.log('Expected bundler filterSets keys:', Object.keys(bundlerFilters))
        
        const newBundlerFilters = { ...bundlerFilters }
        
        // Map API response keys to internal filter keys for bundler
        const keyMapping: Record<string, string> = {
          'unbundleFilter': 'BUNDLE_FILTER',
          'indexFilter': 'BUNDLE_INDEX_FILTER'
        }
        
        Object.entries(data).forEach(([key, value]: [string, any]) => {
          const filterKey = keyMapping[key] || key
          
          if (newBundlerFilters[filterKey] && value && typeof value === 'object' && Object.keys(value).length > 0) {
            console.log(`Loading bundler filter ${filterKey}:`, value)
            
            // Handle both simple JSON filters and complex bundler configurations
            const filterData = value.filter || value
            newBundlerFilters[filterKey].rules = parseFilterToRules(filterData)
            
            if (value.enabled !== undefined) {
              newBundlerFilters[filterKey].enabled = value.enabled
            }
            if (value.bundlerSpecific) {
              newBundlerFilters[filterKey].bundlerSpecific = { 
                ...newBundlerFilters[filterKey].bundlerSpecific, 
                ...value.bundlerSpecific 
              }
            }
          }
        })

        setBundlerFilters(newBundlerFilters)
        updateCodeView(newBundlerFilters)
        
        // Log successful load
        const loadedCount = Object.values(newBundlerFilters).reduce((count, filter) => count + filter.rules.length, 0)
        if (loadedCount > 0) {
          setMessage(`Loaded ${loadedCount} existing bundler filter rules successfully`)
        }
      }
    } catch (error) {
      console.error('Failed to fetch bundler filters:', error)
      setMessage('Failed to load existing bundler filters')
    } finally {
      setLoading(false)
    }
  }

  const updateCodeView = (filters: Record<string, BundlerFilterConfig>) => {
    const jsonFilter: any = {}
    
    Object.entries(filters).forEach(([key, filterConfig]) => {
      jsonFilter[key] = {
        enabled: filterConfig.enabled,
        filter: convertRulesToFilter(filterConfig.rules),
        ...(filterConfig.bundlerSpecific && { bundlerSpecific: filterConfig.bundlerSpecific })
      }
    })

    setCodeView(JSON.stringify(jsonFilter, null, 2))
  }

  const addRule = (filterKey: string, ruleType: FilterRule['type'] = 'tag', parentId?: string) => {
    const newBundlerFilters = { ...bundlerFilters }
    
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
      
      newBundlerFilters[filterKey].rules = addToLogicalGroup(newBundlerFilters[filterKey].rules)
    } else {
      // Add to root level
      newBundlerFilters[filterKey].rules.push(newRule)
    }
    
    setBundlerFilters(newBundlerFilters)
    updateCodeView(newBundlerFilters)
  }

  const removeRule = (filterKey: string, ruleId: string) => {
    const newBundlerFilters = { ...bundlerFilters }
    
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
    
    newBundlerFilters[filterKey].rules = removeFromRules(newBundlerFilters[filterKey].rules)
    setBundlerFilters(newBundlerFilters)
    updateCodeView(newBundlerFilters)
  }

  const updateRule = (filterKey: string, ruleId: string, updates: Partial<FilterRule>) => {
    const newBundlerFilters = { ...bundlerFilters }
    
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
    
    newBundlerFilters[filterKey].rules = updateInRules(newBundlerFilters[filterKey].rules)
    setBundlerFilters(newBundlerFilters)
    updateCodeView(newBundlerFilters)
  }

  const updateFilterConfig = (filterKey: string, updates: Partial<BundlerFilterConfig>) => {
    const newBundlerFilters = { ...bundlerFilters }
    newBundlerFilters[filterKey] = { ...newBundlerFilters[filterKey], ...updates }
    setBundlerFilters(newBundlerFilters)
    updateCodeView(newBundlerFilters)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')

    try {
      const filterData = JSON.parse(codeView)
      
      // Validate each filter structure
      for (const [key, config] of Object.entries(filterData)) {
        if (typeof config === 'object' && config !== null && 'filter' in config) {
          const validation = validateFilter((config as any).filter)
          if (!validation.valid) {
            setMessage(`Validation errors in ${key}: ${validation.errors.join(', ')}`)
            return
          }
        }
      }
      
      const response = await fetch(getApiUrl('/bundler-filters'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filterData)
      })

      if (response.ok) {
        setMessage('Enhanced bundler filters saved successfully!')
      } else {
        const errorData = await response.json()
        setMessage(`Failed to save bundler filters: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      setMessage(`Error saving bundler filters: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const loadTemplate = (templateKey: string) => {
    if (templateKey in FilterTemplates) {
      const template = FilterTemplates[templateKey as keyof typeof FilterTemplates]
      const rules = parseFilterToRules(template.filter)
      
      // Use selected target filter or default to first filter
      const targetFilterKey = selectedTemplateTarget || Object.keys(bundlerFilters)[0]
      
      if (!bundlerFilters[targetFilterKey]) {
        setMessage(`Invalid target filter: ${targetFilterKey}`)
        return
      }
      
      const newBundlerFilters = { ...bundlerFilters }
      newBundlerFilters[targetFilterKey].rules = rules
      
      setBundlerFilters(newBundlerFilters)
      updateCodeView(newBundlerFilters)
      setMessage(`Loaded template "${template.name}" to ${bundlerFilters[targetFilterKey].name}`)
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

  // Render individual filter rule (same as main filter builder but optimized for bundling context)
  const renderFilterRule = (rule: FilterRule, filterKey: string, depth = 0) => {
    const indentClass = depth > 0 ? `ml-${depth * 4}` : ''
    
    if (isLogicalGroupFilterRule(rule)) {
      const isExpanded = expandedLogicalGroups.has(rule.id)
      
      return (
        <div key={rule.id} className={`border border-blue-600 rounded-lg p-4 ${indentClass} bg-blue-950/20`}>
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
              
              <Badge variant="outline" className="bg-blue-500/20 text-blue-300">
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
            <div className="space-y-3 mt-4 pl-4 border-l border-blue-600">
              {rule.rules.map(subRule => renderFilterRule(subRule, filterKey, depth + 1))}
            </div>
          )}
        </div>
      )
    }

    // Regular filter rule rendering optimized for bundler context
    const getBadgeColor = (type: string) => {
      switch (type) {
        case 'tag': return 'bg-blue-500/20 text-blue-300'
        case 'attribute': return 'bg-green-500/20 text-green-300'
        case 'special': return 'bg-purple-500/20 text-purple-300'
        case 'nested': return 'bg-orange-500/20 text-orange-300'
        case 'partition': return 'bg-red-500/20 text-red-300'
        default: return 'bg-gray-500/20 text-gray-300'
      }
    }

    return (
      <div key={rule.id} className={`flex items-center gap-3 p-3 bg-gray-800 rounded-lg ${indentClass}`}>
        <Badge className={`${getBadgeColor(rule.type)} border-0 min-w-[80px] text-center`}>
          {rule.type}
        </Badge>

        {/* Rule-specific rendering - same as main builder */}
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
    fetchBundlerFilters()
  }, [service])

  useEffect(() => {
    updateCodeView(bundlerFilters)
  }, [bundlerFilters])

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading enhanced bundler filters...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Enhanced AR.IO Bundler Filters
              </CardTitle>
              <CardDescription>
                Advanced bundler filter configuration with logical operators and bundling-specific settings
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
              {saving ? 'Saving...' : 'Save Bundler Filters'}
            </Button>
            <Button onClick={fetchBundlerFilters} variant="outline">
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
                  {Object.entries(bundlerFilters).map(([key, filterConfig]) => (
                    <SelectItem key={key} value={key}>{filterConfig.name}</SelectItem>
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

            <Button 
              variant="outline"
              onClick={() => setShowBundlerSettings(!showBundlerSettings)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Bundler Settings
            </Button>
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
          {Object.entries(bundlerFilters).map(([filterKey, filterConfig]) => (
            <Card key={filterKey}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        {filterConfig.name}
                        {filterConfig.rules.length > 0 ? (
                          <CheckCircle className="h-5 w-5 text-green-400" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-gray-400" />
                        )}
                      </CardTitle>
                      <CardDescription>{filterConfig.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-300">Enabled</span>
                      <Switch
                        checked={filterConfig.enabled}
                        onCheckedChange={(enabled) => updateFilterConfig(filterKey, { enabled })}
                      />
                    </div>
                  </div>
                  <Badge variant={filterConfig.rules.length > 0 ? "default" : "outline"}>
                    {filterConfig.rules.length > 0 ? `${filterConfig.rules.length} rule${filterConfig.rules.length === 1 ? '' : 's'}` : 'No rules'}
                  </Badge>
                </div>
                
                {/* Bundler-specific settings */}
                {filterKey === 'BUNDLE_FILTER' && filterConfig.bundlerSpecific && showBundlerSettings && (
                  <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Bundle Configuration
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="text-xs text-gray-400">Max Bundle Size (MB)</label>
                        <Input
                          type="number"
                          value={Math.round((filterConfig.bundlerSpecific.maxBundleSize || 0) / (1024 * 1024))}
                          onChange={(e) => updateFilterConfig(filterKey, { 
                            bundlerSpecific: { 
                              ...filterConfig.bundlerSpecific, 
                              maxBundleSize: parseInt(e.target.value) * 1024 * 1024 
                            }
                          })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Min Bundle Size (KB)</label>
                        <Input
                          type="number"
                          value={Math.round((filterConfig.bundlerSpecific.minBundleSize || 0) / 1024)}
                          onChange={(e) => updateFilterConfig(filterKey, { 
                            bundlerSpecific: { 
                              ...filterConfig.bundlerSpecific, 
                              minBundleSize: parseInt(e.target.value) * 1024 
                            }
                          })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Bundle Interval (sec)</label>
                        <Input
                          type="number"
                          value={filterConfig.bundlerSpecific.bundleInterval || 60}
                          onChange={(e) => updateFilterConfig(filterKey, { 
                            bundlerSpecific: { 
                              ...filterConfig.bundlerSpecific, 
                              bundleInterval: parseInt(e.target.value) 
                            }
                          })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Priority Mode</label>
                        <Select 
                          value={filterConfig.bundlerSpecific.priorityMode || 'hybrid'} 
                          onValueChange={(value) => updateFilterConfig(filterKey, { 
                            bundlerSpecific: { 
                              ...filterConfig.bundlerSpecific, 
                              priorityMode: value as 'size' | 'time' | 'hybrid'
                            }
                          })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="size">Size Priority</SelectItem>
                            <SelectItem value="time">Time Priority</SelectItem>
                            <SelectItem value="hybrid">Hybrid</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {filterConfig.rules.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-600 rounded-lg">
                    <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No filters configured</p>
                    <p className="text-sm">Add rules to start filtering bundles</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filterConfig.rules.map(rule => renderFilterRule(rule, filterKey))}
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
              Generated Bundler Filter Configuration
            </CardTitle>
            <CardDescription>
              This JSON includes bundler-specific settings and advanced filter features
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
                placeholder="Generated bundler filter configuration will appear here..."
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
