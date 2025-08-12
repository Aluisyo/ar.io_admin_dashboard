'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Info, Tag, Database } from 'lucide-react'

export function FilterExamples() {
  const examples = [
    {
      title: "Filter by App Name",
      description: "Only process data from a specific application",
      type: "tag",
      field: "App-Name", 
      operator: "equals",
      value: "MyPermawebApp",
      useCase: "Perfect for focusing on your own application's data"
    },
    {
      title: "Filter by Content Type",
      description: "Process only images",
      type: "tag",
      field: "Content-Type",
      operator: "startsWith", 
      value: "image/",
      useCase: "Great for media-focused gateways"
    },
    {
      title: "Filter by Data Size",
      description: "Only process files larger than 1MB",
      type: "attribute",
      field: "data_size",
      operator: "greaterThan",
      value: "1048576",
      useCase: "Avoid processing tiny files or metadata"
    },
    {
      title: "Filter by Block Height",
      description: "Only process recent transactions",
      type: "attribute", 
      field: "block_height",
      operator: "greaterOrEqual",
      value: "1000000",
      useCase: "Focus on newer content only"
    },
    {
      title: "Filter by Protocol",
      description: "Process specific protocol data",
      type: "tag",
      field: "Data-Protocol",
      operator: "equals",
      value: "ao",
      useCase: "Target specific decentralized protocols"
    }
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            How to Use Visual Filters
          </CardTitle>
          <CardDescription>
            Visual filters make it easy to configure your AR.IO Gateway without writing JSON manually.
            Here's how each component works:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tag Filters
              </h4>
              <p className="text-sm text-gray-400">
                Filter based on Arweave transaction tags like App-Name, Content-Type, etc.
                Tags contain metadata about the transaction.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                Attribute Filters
              </h4>
              <p className="text-sm text-gray-400">
                Filter based on transaction attributes like data size, block height, owner address.
                These are technical properties of the transaction.
              </p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Available Operators</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>For Tags:</strong>
                <ul className="mt-1 space-y-1 text-gray-400">
                  <li>• <code>Equals</code> - exact match</li>
                  <li>• <code>Starts With</code> - begins with value</li>
                  <li>• <code>Ends With</code> - ends with value</li>
                  <li>• <code>Contains</code> - includes value anywhere</li>
                </ul>
              </div>
              <div>
                <strong>For Attributes:</strong>
                <ul className="mt-1 space-y-1 text-gray-400">
                  <li>• <code>Equals</code> - exact match</li>
                  <li>• <code>Greater Than</code> - numeric comparison</li>
                  <li>• <code>Less Than</code> - numeric comparison</li>
                  <li>• <code>Greater Or Equal</code> - inclusive comparison</li>
                  <li>• <code>Less Or Equal</code> - inclusive comparison</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Common Filter Examples</CardTitle>
          <CardDescription>
            Here are some practical examples to get you started with filtering
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {examples.map((example, index) => (
              <div key={index} className="border border-gray-700 rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <h4 className="font-medium">{example.title}</h4>
                  <Badge variant={example.type === 'tag' ? 'default' : 'secondary'}>
                    {example.type}
                  </Badge>
                </div>
                
                <p className="text-sm text-gray-400">{example.description}</p>
                
                <div className="bg-gray-900 rounded p-3 font-mono text-sm">
                  <div className="flex items-center gap-2 text-blue-400">
                    <span>{example.field}</span>
                    <span className="text-gray-500">{example.operator}</span>
                    <span className="text-green-400">"{example.value}"</span>
                  </div>
                </div>
                
                <p className="text-xs text-gray-500 italic">💡 {example.useCase}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
