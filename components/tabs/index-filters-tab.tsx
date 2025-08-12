'use client'

import { VisualIndexFiltersBuilder } from '@/components/visual-index-filters-builder'

interface IndexFiltersTabProps {
  service: string
}

export function IndexFiltersTab({ service }: IndexFiltersTabProps) {
  return <VisualIndexFiltersBuilder service={service} />
}
