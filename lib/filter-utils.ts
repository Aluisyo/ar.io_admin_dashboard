// AR.IO Filter Conversion Utilities
// Handles parsing from AR.IO JSON format to visual rules and vice versa

import { 
  FilterRule, 
  TagFilterRule, 
  AttributeFilterRule, 
  SpecialFilterRule,
  NestedBundleFilterRule,
  HashPartitionFilterRule,
  LogicalGroupFilterRule,
  LogicalOperator,
  isTagFilterRule,
  isAttributeFilterRule,
  isSpecialFilterRule,
  isNestedBundleFilterRule,
  isHashPartitionFilterRule,
  isLogicalGroupFilterRule
} from '@/types/filters'

// Generate unique ID for filter rules
export const generateRuleId = (): string => 
  'rule_' + Math.random().toString(36).substr(2, 9)

// Parse AR.IO JSON filter to visual filter rules
export function parseFilterToRules(filter: any): FilterRule[] {
  if (!filter || typeof filter !== 'object') {
    return []
  }

  const rules: FilterRule[] = []

  // Handle logical operators (and, or, not)
  if (filter.and && Array.isArray(filter.and)) {
    const logicalRule: LogicalGroupFilterRule = {
      id: generateRuleId(),
      type: 'logical',
      operator: 'and',
      rules: filter.and.flatMap((subFilter: any) => parseFilterToRules(subFilter))
    }
    rules.push(logicalRule)
  }

  if (filter.or && Array.isArray(filter.or)) {
    const logicalRule: LogicalGroupFilterRule = {
      id: generateRuleId(),
      type: 'logical',
      operator: 'or',
      rules: filter.or.flatMap((subFilter: any) => parseFilterToRules(subFilter))
    }
    rules.push(logicalRule)
  }

  if (filter.not) {
    const logicalRule: LogicalGroupFilterRule = {
      id: generateRuleId(),
      type: 'logical',
      operator: 'not',
      rules: parseFilterToRules(filter.not)
    }
    rules.push(logicalRule)
  }

  // Handle special filters
  if (filter.always === true) {
    const specialRule: SpecialFilterRule = {
      id: generateRuleId(),
      type: 'special',
      field: 'always',
      value: true
    }
    rules.push(specialRule)
  }

  if (filter.never === true) {
    const specialRule: SpecialFilterRule = {
      id: generateRuleId(),
      type: 'special',
      field: 'never',
      value: true
    }
    rules.push(specialRule)
  }

  // Handle nested bundle filter
  if (typeof filter.isNestedBundle === 'boolean') {
    const nestedRule: NestedBundleFilterRule = {
      id: generateRuleId(),
      type: 'nested',
      field: 'isNestedBundle',
      value: filter.isNestedBundle
    }
    rules.push(nestedRule)
  }

  // Handle hash partition filter
  if (filter.hashPartition && typeof filter.hashPartition === 'object') {
    const { partitionCount, partitionKey, targetPartitions } = filter.hashPartition
    if (partitionCount && partitionKey && Array.isArray(targetPartitions)) {
      const partitionRule: HashPartitionFilterRule = {
        id: generateRuleId(),
        type: 'partition',
        partitionCount: Number(partitionCount),
        partitionKey: String(partitionKey),
        targetPartitions: targetPartitions.map((p: any) => Number(p))
      }
      rules.push(partitionRule)
    }
  }

  // Handle tag filters (both array and object formats)
  if (filter.tags) {
    if (Array.isArray(filter.tags)) {
      // Array format: [{ name: "tag", value: "val" }]
      filter.tags.forEach((tag: any) => {
        const tagRule: TagFilterRule = {
          id: generateRuleId(),
          type: 'tag',
          field: tag.name || '',
          operator: tag.valueStartsWith ? 'startsWith' :
                   !tag.value && !tag.valueStartsWith ? 'nameOnly' : 'equals',
          value: tag.value || tag.valueStartsWith || ''
        }
        rules.push(tagRule)
      })
    } else if (typeof filter.tags === 'object') {
      // Object format: { "tag-name": "value" } or { "tag-name": { "startsWith": "val" } }
      Object.entries(filter.tags).forEach(([tagName, tagValue]) => {
        let operator = 'equals'
        let value = ''
        
        if (typeof tagValue === 'string') {
          operator = 'equals'
          value = tagValue
        } else if (typeof tagValue === 'object' && tagValue !== null) {
          const tagValueObj = tagValue as Record<string, any>
          if (tagValueObj.startsWith) {
            operator = 'startsWith'
            value = tagValueObj.startsWith
          } else if (tagValueObj.valueStartsWith) {
            operator = 'startsWith' 
            value = tagValueObj.valueStartsWith
          } else if (tagValueObj.value) {
            operator = 'equals'
            value = tagValueObj.value
          } else {
            // If it's an object but none of the expected properties, treat as nameOnly
            operator = 'nameOnly'
            value = ''
          }
        } else {
          // If not string or object, treat as nameOnly
          operator = 'nameOnly'
          value = ''
        }
        
        const tagRule: TagFilterRule = {
          id: generateRuleId(),
          type: 'tag',
          field: tagName,
          operator: operator as any,
          value: value
        }
        rules.push(tagRule)
      })
    }
  }

  // Handle attribute filters
  if (filter.attributes && typeof filter.attributes === 'object') {
    Object.entries(filter.attributes).forEach(([key, value]) => {
      let operator = 'equals'
      let attrValue: string | number = value as any

      // Handle comparison operators
      if (typeof value === 'object' && value !== null) {
        const valueObj = value as Record<string, any>
        if (valueObj['>'] !== undefined) {
          operator = 'greaterThan'
          attrValue = valueObj['>']
        } else if (valueObj['<'] !== undefined) {
          operator = 'lessThan'
          attrValue = valueObj['<']
        } else if (valueObj['>='] !== undefined) {
          operator = 'greaterOrEqual'
          attrValue = valueObj['>=']
        } else if (valueObj['<='] !== undefined) {
          operator = 'lessOrEqual'
          attrValue = valueObj['<=']
        }
      }

      const attributeRule: AttributeFilterRule = {
        id: generateRuleId(),
        type: 'attribute',
        field: key,
        operator: operator as any,
        value: attrValue
      }
      rules.push(attributeRule)
    })
  }

  return rules
}

// Convert visual filter rules to AR.IO JSON format
export function convertRulesToFilter(rules: FilterRule[]): any {
  if (rules.length === 0) {
    return { never: true }
  }

  if (rules.length === 1) {
    return convertSingleRuleToFilter(rules[0])
  }

  // Multiple rules - wrap in AND by default
  return {
    and: rules.map(rule => convertSingleRuleToFilter(rule))
  }
}

// Convert a single rule to AR.IO JSON format
function convertSingleRuleToFilter(rule: FilterRule): any {
  if (isSpecialFilterRule(rule)) {
    return { [rule.field]: rule.value }
  }

  if (isNestedBundleFilterRule(rule)) {
    return { isNestedBundle: rule.value }
  }

  if (isHashPartitionFilterRule(rule)) {
    return {
      hashPartition: {
        partitionCount: rule.partitionCount,
        partitionKey: rule.partitionKey,
        targetPartitions: rule.targetPartitions
      }
    }
  }

  if (isTagFilterRule(rule)) {
    const tagObj: any = { name: rule.field }
    
    switch (rule.operator) {
      case 'equals':
        tagObj.value = rule.value
        break
      case 'startsWith':
        tagObj.valueStartsWith = rule.value
        break
      case 'nameOnly':
        // Just the name, no value property
        break
    }

    return { tags: [tagObj] }
  }

  if (isAttributeFilterRule(rule)) {
    const value = typeof rule.value === 'string' && !isNaN(Number(rule.value)) 
      ? Number(rule.value) 
      : rule.value

    let attrValue: any = value
    
    switch (rule.operator) {
      case 'equals':
        attrValue = value
        break
      case 'greaterThan':
        attrValue = { '>': value }
        break
      case 'lessThan':
        attrValue = { '<': value }
        break
      case 'greaterOrEqual':
        attrValue = { '>=': value }
        break
      case 'lessOrEqual':
        attrValue = { '<=': value }
        break
    }

    return { attributes: { [rule.field]: attrValue } }
  }

  if (isLogicalGroupFilterRule(rule)) {
    const subFilters = rule.rules.map(subRule => convertSingleRuleToFilter(subRule))
    
    switch (rule.operator) {
      case 'and':
        return { and: subFilters }
      case 'or':
        return { or: subFilters }
      case 'not':
        // NOT should contain a single filter or logical group
        if (subFilters.length === 1) {
          return { not: subFilters[0] }
        } else {
          return { not: { and: subFilters } }
        }
    }
  }

  // Fallback
  return { never: true }
}

// Merge multiple filters using logical operators
export function mergeFilters(filters: any[], operator: LogicalOperator = 'and'): any {
  if (filters.length === 0) {
    return { never: true }
  }

  if (filters.length === 1) {
    return filters[0]
  }

  return { [operator]: filters }
}

// Validate filter structure
export function validateFilter(filter: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  try {
    validateFilterRecursive(filter, errors, '')
    return { valid: errors.length === 0, errors }
  } catch (error) {
    errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return { valid: false, errors }
  }
}

function validateFilterRecursive(filter: any, errors: string[], path: string): void {
  if (!filter || typeof filter !== 'object') {
    errors.push(`${path}: Filter must be an object`)
    return
  }

  const keys = Object.keys(filter)
  
  // Check for logical operators
  if (filter.and) {
    if (!Array.isArray(filter.and)) {
      errors.push(`${path}.and: Must be an array`)
    } else {
      filter.and.forEach((subFilter: any, index: number) => {
        validateFilterRecursive(subFilter, errors, `${path}.and[${index}]`)
      })
    }
  }

  if (filter.or) {
    if (!Array.isArray(filter.or)) {
      errors.push(`${path}.or: Must be an array`)
    } else {
      filter.or.forEach((subFilter: any, index: number) => {
        validateFilterRecursive(subFilter, errors, `${path}.or[${index}]`)
      })
    }
  }

  if (filter.not) {
    validateFilterRecursive(filter.not, errors, `${path}.not`)
  }

  // Validate tag filters
  if (filter.tags) {
    if (!Array.isArray(filter.tags)) {
      errors.push(`${path}.tags: Must be an array`)
    } else {
      filter.tags.forEach((tag: any, index: number) => {
        if (!tag.name) {
          errors.push(`${path}.tags[${index}]: Missing required 'name' field`)
        }
      })
    }
  }

  // Validate hash partition
  if (filter.hashPartition) {
    const { partitionCount, partitionKey, targetPartitions } = filter.hashPartition
    
    if (typeof partitionCount !== 'number' || partitionCount <= 0) {
      errors.push(`${path}.hashPartition.partitionCount: Must be a positive number`)
    }
    
    if (!partitionKey) {
      errors.push(`${path}.hashPartition.partitionKey: Required field`)
    }
    
    if (!Array.isArray(targetPartitions) || targetPartitions.length === 0) {
      errors.push(`${path}.hashPartition.targetPartitions: Must be a non-empty array`)
    }
  }
}

// Generate example filters based on templates
export function generateExampleFilter(template: string): any {
  const examples = {
    simple_tag: {
      tags: [{ name: "App-Name", value: "MyApp" }]
    },
    simple_attribute: {
      attributes: { data_size: { ">": 1000000 } }
    },
    logical_and: {
      and: [
        { tags: [{ name: "Content-Type", valueStartsWith: "image/" }] },
        { attributes: { data_size: { ">": 1048576 } } }
      ]
    },
    logical_or: {
      or: [
        { tags: [{ name: "App-Name", value: "ArDrive-Web" }] },
        { tags: [{ name: "App-Name", value: "ArDrive-Desktop" }] }
      ]
    },
    complex_exclusion: {
      and: [
        {
          not: {
            or: [
              { tags: [{ name: "Bundler-App-Name", value: "Warp" }] },
              { tags: [{ name: "Bundler-App-Name", value: "Redstone" }] }
            ]
          }
        },
        { tags: [{ name: "App-Name", valueStartsWith: "ArDrive" }] }
      ]
    },
    hash_partition: {
      hashPartition: {
        partitionCount: 4,
        partitionKey: "owner_address",
        targetPartitions: [0]
      }
    },
    nested_bundle: {
      and: [
        { isNestedBundle: true },
        { attributes: { data_size: { ">": 1000 } } }
      ]
    }
  }

  return examples[template as keyof typeof examples] || examples.simple_tag
}
