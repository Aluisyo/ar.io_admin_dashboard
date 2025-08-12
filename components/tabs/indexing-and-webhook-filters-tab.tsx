'use client'

import { VisualFiltersBuilder } from '@/components/visual-filters-builder'

interface IndexingAndWebhookFiltersTabProps {
  service: string
}

export function IndexingAndWebhookFiltersTab({ service }: IndexingAndWebhookFiltersTabProps) {
  return <VisualFiltersBuilder service={service} />
}
