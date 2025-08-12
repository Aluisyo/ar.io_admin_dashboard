'use client'

import { BundlerVisualFiltersBuilder } from '@/components/bundler-visual-filters-builder'

interface BundlerFiltersTabProps {
  service: string
}

export function BundlerFiltersTab({ service }: BundlerFiltersTabProps) {
  return <BundlerVisualFiltersBuilder service={service} />
}
