'use client'

import * as React from 'react'
import { ModelCard } from './model-card'
import type { ModelInfo } from './model-card'
import { ModelFilter } from './model-filter'
import type { ModelFilter as ModelFilterType } from './model-filter'

interface ModelGridProps {
  models: ModelInfo[]
  selectedModel?: string
  onSelect?: (model: ModelInfo) => void
  onCopyConfig?: (model: ModelInfo) => void
  filterValue?: ModelFilterType
  onFilterChange?: (filter: ModelFilterType) => void
  className?: string
}

function filterModels(models: ModelInfo[], filter: ModelFilterType): ModelInfo[] {
  if (filter === 'all') return models
  return models.filter((m) => {
    if (filter === 'fast') return m.fast
    if (filter === 'powerful') return m.powerful
    if (filter === 'coding') return m.capabilities?.includes('coding')
    if (filter === 'reasoning') return m.capabilities?.includes('reasoning')
    return true
  })
}

function getFilterCounts(models: ModelInfo[]): Record<ModelFilterType, number> {
  return {
    all: models.length,
    coding: models.filter((m) => m.capabilities?.includes('coding')).length,
    reasoning: models.filter((m) => m.capabilities?.includes('reasoning')).length,
    fast: models.filter((m) => m.fast).length,
    powerful: models.filter((m) => m.powerful).length,
  }
}

export function ModelGrid({
  models,
  selectedModel,
  onSelect,
  onCopyConfig,
  filterValue = 'all',
  onFilterChange,
  className,
}: ModelGridProps) {
  const filteredModels = filterModels(models, filterValue)
  const counts = getFilterCounts(models)

  return (
    <div className={className}>
      {/* Filter */}
      {onFilterChange && (
        <div className="mb-4">
          <ModelFilter
            value={filterValue}
            onChange={onFilterChange}
            counts={counts}
          />
        </div>
      )}

      {/* Grid */}
      {filteredModels.length === 0 ? (
        <div className="rounded-lg border bg-gray-50 p-8 text-center text-gray-500">
          Không có model nào phù hợp với bộ lọc
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredModels.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              isSelected={selectedModel === model.id}
              onSelect={onSelect}
              onCopyConfig={onCopyConfig}
            />
          ))}
        </div>
      )}

      {/* Results count */}
      {filteredModels.length > 0 && onFilterChange && (
        <p className="mt-4 text-sm text-gray-500">
          Hiển thị {filteredModels.length} / {models.length} models
        </p>
      )}
    </div>
  )
}
