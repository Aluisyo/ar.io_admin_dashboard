'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Info, Tag, Database, Network, Hash, Filter, GitBranch, ShieldX, Layers } from 'lucide-react'
import { useState } from 'react'

export function FilterExamples() {
  const [selectedCategory, setSelectedCategory] = useState<string>('basic')
  
  const basicExamples = [
    {
      title: "Filter by App Name",
      description: "Only process data from a specific application",
      type: "tag",
      field: "App-Name", 
      operator: "equals",
      value: "MyPermawebApp",
      useCase: "Perfect for focusing on your own application's data",
      json: { tags: [{ name: "App-Name", value: "MyPermawebApp" }] }
    },
    {
      title: "Filter by Content Type",
      description: "Process only images",
      type: "tag",
      field: "Content-Type",
      operator: "startsWith", 
      value: "image/",
      useCase: "Great for media-focused gateways",
      json: { tags: [{ name: "Content-Type", valueStartsWith: "image/" }] }
    },
    {
      title: "Filter by Data Size",
      description: "Only process files larger than 1MB",
      type: "attribute",
      field: "data_size",
      operator: "greaterThan",
      value: "1048576",
      useCase: "Avoid processing tiny files or metadata",
      json: { attributes: { data_size: { ">": 1048576 } } }
    },
    {
      title: "Tag Name Only",
      description: "Process any data with App-Name tag (regardless of value)",
      type: "tag",
      field: "App-Name",
      operator: "nameOnly",
      value: "",
      useCase: "Broad filtering based on tag presence",
      json: { tags: [{ name: "App-Name" }] }
    }
  ]
  
  const logicalExamples = [
    {
      title: "AND Operation - Large Images",
      description: "Process large image files only",
      complexity: "intermediate",
      useCase: "Media processing with size constraints",
      json: {
        and: [
          { tags: [{ name: "Content-Type", valueStartsWith: "image/" }] },
          { attributes: { data_size: { ">": 1048576 } } }
        ]
      }
    },
    {
      title: "OR Operation - Multiple Apps",
      description: "Process data from ArDrive Web or Desktop",
      complexity: "intermediate",
      useCase: "Multi-application filtering",
      json: {
        or: [
          { tags: [{ name: "App-Name", value: "ArDrive-Web" }] },
          { tags: [{ name: "App-Name", value: "ArDrive-Desktop" }] }
        ]
      }
    },
    {
      title: "NOT Operation - Exclude Bundlers",
      description: "Exclude major bundler services",
      complexity: "advanced",
      useCase: "Skip automated bundler data",
      json: {
        not: {
          or: [
            { tags: [{ name: "Bundler-App-Name", value: "Warp" }] },
            { tags: [{ name: "Bundler-App-Name", value: "Redstone" }] }
          ]
        }
      }
    },
    {
      title: "Complex Nested Logic",
      description: "ArDrive data excluding major bundlers",
      complexity: "advanced",
      useCase: "Production filtering for ArDrive gateway",
      json: {
        and: [
          {
            not: {
              or: [
                { tags: [{ name: "Bundler-App-Name", value: "Warp" }] },
                { tags: [{ name: "Bundler-App-Name", value: "Redstone" }] },
                { tags: [{ name: "Bundler-App-Name", value: "Kyve" }] }
              ]
            }
          },
          { tags: [{ name: "App-Name", valueStartsWith: "ArDrive" }] },
          { attributes: { data_size: { ">": 1000 } } }
        ]
      }
    }
  ]
  
  const advancedExamples = [
    {
      title: "Hash Partitioning",
      description: "Process 25% of data (partition 0 of 4) based on owner",
      complexity: "advanced",
      useCase: "Distributed processing across multiple nodes",
      json: {
        hashPartition: {
          partitionCount: 4,
          partitionKey: "owner_address",
          targetPartitions: [0]
        }
      }
    },
    {
      title: "Nested Bundle Filter",
      description: "Process only nested bundle data items",
      complexity: "intermediate",
      useCase: "Focus on bundled content analysis",
      json: {
        and: [
          { isNestedBundle: true },
          { attributes: { data_size: { ">": 1000 } } }
        ]
      }
    },
    {
      title: "Production ArDrive Gateway",
      description: "Real-world ArDrive gateway filter",
      complexity: "expert",
      useCase: "Complete production filter for ArDrive infrastructure",
      json: {
        and: [
          {
            not: {
              or: [
                { tags: [{ name: "Bundler-App-Name", value: "Warp" }] },
                { tags: [{ name: "Bundler-App-Name", value: "Redstone" }] },
                { tags: [{ name: "Bundler-App-Name", value: "Kyve" }] },
                { tags: [{ name: "Bundler-App-Name", value: "AO" }] }
              ]
            }
          },
          {
            or: [
              { tags: [{ name: "App-Name", valueStartsWith: "ArDrive" }] },
              { tags: [{ name: "Content-Type", valueStartsWith: "image/" }] }
            ]
          },
          { attributes: { block_height: { ">=": 1000000 } } },
          { not: { isNestedBundle: true } }
        ]
      }
    }
  ]
  
  const categories = [
    { id: 'basic', label: 'Basic Filters', icon: Filter, examples: basicExamples },
    { id: 'logical', label: 'Logical Operators', icon: GitBranch, examples: logicalExamples },
    { id: 'advanced', label: 'Advanced Features', icon: Network, examples: advancedExamples }
  ]

  const selectedCategoryData = categories.find(cat => cat.id === selectedCategory)!
  const currentExamples = selectedCategoryData.examples
  
  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'intermediate': return 'bg-yellow-500/20 text-yellow-400'
      case 'advanced': return 'bg-orange-500/20 text-orange-400'
      case 'expert': return 'bg-red-500/20 text-red-400'
      default: return 'bg-green-500/20 text-green-400'
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Enhanced AR.IO Filter System
          </CardTitle>
          <CardDescription>
            The enhanced filter system supports logical operators (AND/OR/NOT), advanced filter types,
            and nested structures for complex filtering scenarios.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tag Filters
              </h4>
              <p className="text-sm text-gray-400">
                Filter based on Arweave transaction tags. Supports exact match, starts with,
                and tag name-only matching.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                Attribute Filters
              </h4>
              <p className="text-sm text-gray-400">
                Filter based on transaction properties like size, block height, owner.
                Supports numeric comparisons.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                Logical Operators
              </h4>
              <p className="text-sm text-gray-400">
                Combine filters with AND, OR, and NOT operations.
                Support nested logical structures.
              </p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Advanced Features</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Special Filters:</strong>
                <ul className="mt-1 space-y-1 text-gray-400">
                  <li>• <code>always</code> - match everything</li>
                  <li>• <code>never</code> - match nothing</li>
                  <li>• <code>isNestedBundle</code> - nested bundle detection</li>
                </ul>
              </div>
              <div>
                <strong>Advanced Features:</strong>
                <ul className="mt-1 space-y-1 text-gray-400">
                  <li>• <code>hashPartition</code> - distributed processing</li>
                  <li>• <code>and/or/not</code> - logical operators</li>
                  <li>• Nested logical structures</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AR.IO Filter Examples</CardTitle>
          <CardDescription>
            Explore different categories of filters from basic to advanced production patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Category Navigation */}
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map((category) => {
              const Icon = category.icon
              return (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {category.label}
                </Button>
              )
            })}
          </div>

          {/* Examples Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {currentExamples.map((example, index) => (
              <div key={index} className="border border-gray-700 rounded-lg p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <h4 className="font-medium text-white">{example.title}</h4>
                  {example.complexity && (
                    <Badge className={`${getComplexityColor(example.complexity)} border-0`}>
                      {example.complexity}
                    </Badge>
                  )}
                  {example.type && (
                    <Badge variant={example.type === 'tag' ? 'default' : 'secondary'}>
                      {example.type}
                    </Badge>
                  )}
                </div>
                
                <p className="text-sm text-gray-400">{example.description}</p>
                
                {/* Simple rule display for basic examples */}
                {example.type && example.field && (
                  <div className="bg-gray-900 rounded p-3 font-mono text-sm">
                    <div className="flex items-center gap-2 text-blue-400">
                      <span>{example.field}</span>
                      <span className="text-gray-500">{example.operator}</span>
                      {example.value && (
                        <span className="text-green-400">"{example.value}"</span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* JSON display for all examples */}
                <div className="bg-gray-900 rounded p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="h-4 w-4 text-gray-400" />
                    <span className="text-xs text-gray-400 font-medium">Generated AR.IO JSON:</span>
                  </div>
                  <pre className="text-xs text-gray-300 overflow-x-auto">
                    {JSON.stringify(example.json, null, 2)}
                  </pre>
                </div>
                
                <p className="text-xs text-gray-500 italic flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  {example.useCase}
                </p>
              </div>
            ))}
          </div>

          {/* Additional Info for Advanced Category */}
          {selectedCategory === 'advanced' && (
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-400">Advanced Features Note</span>
              </div>
              <p className="text-sm text-gray-300">
                These advanced features require careful consideration for production use.
                Hash partitioning enables horizontal scaling across multiple nodes.
                Nested bundle filters help identify bundled vs. direct transactions.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
