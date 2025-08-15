'use client'

import { EnhancedBundlerVisualFiltersBuilder } from '@/components/enhanced-bundler-visual-filters-builder'

interface BundlerFiltersTabProps {
  service: string
}

export function BundlerFiltersTab({ service }: BundlerFiltersTabProps) {
  return <EnhancedBundlerVisualFiltersBuilder service={service} />
}
