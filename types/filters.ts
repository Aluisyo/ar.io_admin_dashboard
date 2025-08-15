// Enhanced AR.IO Filter Types - Fully compliant with AR.IO Node specification
// Supports logical operators (and/or/not), advanced filter types, and nested structures

export type LogicalOperator = 'and' | 'or' | 'not'

// Basic filter rule types
export interface BaseFilterRule {
  id: string
  type: FilterRuleType
}

export type FilterRuleType = 
  | 'tag' 
  | 'attribute' 
  | 'special'     // for always/never
  | 'nested'      // for isNestedBundle
  | 'partition'   // for hashPartition
  | 'logical'     // for and/or/not groups

// Tag filter rule
export interface TagFilterRule extends BaseFilterRule {
  type: 'tag'
  field: string
  operator: 'equals' | 'startsWith' | 'nameOnly' // nameOnly = just check tag name exists
  value: string
}

// Attribute filter rule
export interface AttributeFilterRule extends BaseFilterRule {
  type: 'attribute'
  field: string
  operator: 'equals' | 'greaterThan' | 'lessThan' | 'greaterOrEqual' | 'lessOrEqual'
  value: string | number
}

// Special filter rule (always/never)
export interface SpecialFilterRule extends BaseFilterRule {
  type: 'special'
  field: 'always' | 'never'
  value: boolean
}

// Nested bundle filter rule
export interface NestedBundleFilterRule extends BaseFilterRule {
  type: 'nested'
  field: 'isNestedBundle'
  value: boolean
}

// Hash partition filter rule
export interface HashPartitionFilterRule extends BaseFilterRule {
  type: 'partition'
  partitionCount: number
  partitionKey: string
  targetPartitions: number[]
}

// Logical group filter rule
export interface LogicalGroupFilterRule extends BaseFilterRule {
  type: 'logical'
  operator: LogicalOperator
  rules: FilterRule[]
}

// Union of all filter rule types
export type FilterRule = 
  | TagFilterRule 
  | AttributeFilterRule 
  | SpecialFilterRule 
  | NestedBundleFilterRule 
  | HashPartitionFilterRule 
  | LogicalGroupFilterRule

// Filter set for organizing rules by filter type
export interface FilterSet {
  name: string
  description: string
  rules: FilterRule[]
}

// Common field options
export const CommonTagFields = [
  'App-Name',
  'App-Version',
  'Content-Type',
  'Data-Protocol',
  'Protocol-Name',
  'Type',
  'Title',
  'Description',
  'Author',
  'Bundler-App-Name'
] as const

export const CommonAttributeFields = [
  'data_size',
  'block_height',
  'block_timestamp',
  'owner_address',
  'owner',
  'target',
  'id',
  'signature',
  'quantity'
] as const

export const HashPartitionKeys = [
  'id',
  'owner',
  'owner_address',
  'target',
  'signature',
  'quantity'
] as const

// Operator options for different filter types
export const OperatorOptions = {
  tag: [
    { value: 'equals', label: 'Equals' },
    { value: 'startsWith', label: 'Starts With' },
    { value: 'nameOnly', label: 'Tag Exists (Any Value)' }
  ],
  attribute: [
    { value: 'equals', label: 'Equals' },
    { value: 'greaterThan', label: 'Greater Than' },
    { value: 'lessThan', label: 'Less Than' },
    { value: 'greaterOrEqual', label: 'Greater Or Equal' },
    { value: 'lessOrEqual', label: 'Less Or Equal' }
  ],
  logical: [
    { value: 'and', label: 'AND (All conditions must match)' },
    { value: 'or', label: 'OR (Any condition can match)' },
    { value: 'not', label: 'NOT (Exclude matching conditions)' }
  ]
} as const

// Filter templates for common use cases
export const FilterTemplates = {
  exclude_bundlers: {
    name: "Exclude Major Bundlers",
    description: "Exclude data from Warp, Redstone, Kyve, and AO bundlers",
    filter: {
      not: {
        or: [
          { tags: [{ name: "Bundler-App-Name", value: "Warp" }] },
          { tags: [{ name: "Bundler-App-Name", value: "Redstone" }] },
          { tags: [{ name: "Bundler-App-Name", value: "Kyve" }] },
          { tags: [{ name: "Bundler-App-Name", value: "AO" }] }
        ]
      }
    }
  },
  ardrive_only: {
    name: "ArDrive Applications Only",
    description: "Process only ArDrive-related applications",
    filter: {
      and: [
        { tags: [{ name: "App-Name", valueStartsWith: "ArDrive" }] },
        { attributes: { data_size: { ">": 1000 } } }
      ]
    }
  },
  distributed_processing: {
    name: "Distributed Processing (Partition 0 of 4)",
    description: "Process 25% of data using hash partitioning",
    filter: {
      and: [
        {
          hashPartition: {
            partitionCount: 4,
            partitionKey: "owner_address",
            targetPartitions: [0]
          }
        },
        { tags: [{ name: "App-Name" }] } // Any app with App-Name tag
      ]
    }
  },
  large_images: {
    name: "Large Images Only",
    description: "Process large image files excluding nested bundles",
    filter: {
      and: [
        { tags: [{ name: "Content-Type", valueStartsWith: "image/" }] },
        { attributes: { data_size: { ">": 1048576 } } }, // > 1MB
        { not: { isNestedBundle: true } }
      ]
    }
  }
} as const

// Type guards for filter rules
export function isTagFilterRule(rule: FilterRule): rule is TagFilterRule {
  return rule.type === 'tag'
}

export function isAttributeFilterRule(rule: FilterRule): rule is AttributeFilterRule {
  return rule.type === 'attribute'
}

export function isSpecialFilterRule(rule: FilterRule): rule is SpecialFilterRule {
  return rule.type === 'special'
}

export function isNestedBundleFilterRule(rule: FilterRule): rule is NestedBundleFilterRule {
  return rule.type === 'nested'
}

export function isHashPartitionFilterRule(rule: FilterRule): rule is HashPartitionFilterRule {
  return rule.type === 'partition'
}

export function isLogicalGroupFilterRule(rule: FilterRule): rule is LogicalGroupFilterRule {
  return rule.type === 'logical'
}
