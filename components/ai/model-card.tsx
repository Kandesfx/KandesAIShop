'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export interface ModelInfo {
  id: string
  displayName: string
  description?: string
  provider?: string
  pricing?: {
    inputCost?: number
    outputCost?: number
    unit?: string
  }
  capabilities?: string[]
  recommended?: boolean
  fast?: boolean
  powerful?: boolean
}

interface ModelCardProps {
  model: ModelInfo
  onCopyConfig?: (model: ModelInfo) => void
  isSelected?: boolean
  onSelect?: (model: ModelInfo) => void
  className?: string
}

const capabilityIcons: Record<string, string> = {
  coding: '💻',
  reasoning: '🧠',
  fast: '⚡',
  vision: '👁️',
  function: '🔧',
  json: '📄',
}

export function ModelCard({
  model,
  onCopyConfig,
  isSelected,
  onSelect,
  className,
}: ModelCardProps) {
  const badges = []
  if (model.recommended) badges.push({ label: 'Recommended', variant: 'success' as const, icon: '⭐' })
  if (model.fast) badges.push({ label: 'Fast', variant: 'info' as const, icon: '⚡' })
  if (model.powerful) badges.push({ label: 'Powerful', variant: 'warning' as const, icon: '👑' })

  return (
    <div
      className={cn(
        'rounded-lg border bg-white p-4 transition-all cursor-pointer',
        'hover:shadow-md hover:border-blue-200',
        isSelected ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200',
        className
      )}
      onClick={() => onSelect?.(model)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect?.(model)}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 text-white text-lg">
            🧠
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{model.displayName}</h3>
            <p className="text-xs text-gray-500 font-mono">{model.id}</p>
          </div>
        </div>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {badges.map((badge) => (
            <Badge key={badge.label} variant={badge.variant}>
              {badge.icon} {badge.label}
            </Badge>
          ))}
        </div>
      )}

      {/* Description */}
      {model.description && (
        <p className="mt-3 text-sm text-gray-600">{model.description}</p>
      )}

      {/* Pricing */}
      {model.pricing && (
        <div className="mt-3 flex items-center gap-4 text-sm">
          {model.pricing.inputCost !== undefined && (
            <span className="text-gray-600">
              In: <span className="font-medium text-gray-900">${model.pricing.inputCost}</span>/1M
            </span>
          )}
          {model.pricing.outputCost !== undefined && (
            <span className="text-gray-600">
              Out: <span className="font-medium text-gray-900">${model.pricing.outputCost}</span>/1M
            </span>
          )}
        </div>
      )}

      {/* Capabilities */}
      {model.capabilities && model.capabilities.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {model.capabilities.map((cap) => (
            <span
              key={cap}
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600"
            >
              {capabilityIcons[cap] || '•'} {cap}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      {onCopyConfig && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCopyConfig(model)
            }}
            className="flex-1 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            📋 Copy Config
          </button>
        </div>
      )}
    </div>
  )
}
