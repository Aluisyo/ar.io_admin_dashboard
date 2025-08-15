'use client'

import { EnhancedVisualFiltersBuilder } from '@/components/enhanced-visual-filters-builder'

interface IndexingAndWebhookFiltersTabProps {
  service: string
}

export function IndexingAndWebhookFiltersTab({ service }: IndexingAndWebhookFiltersTabProps) {
  return <EnhancedVisualFiltersBuilder service={service} />
}
