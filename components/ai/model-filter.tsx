'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export type ModelFilter = 'all' | 'coding' | 'reasoning' | 'fast' | 'powerful'

interface ModelFilterProps {
  value: ModelFilter
  onChange: (filter: ModelFilter) => void
  counts?: Record<ModelFilter, number>
  className?: string
}

const filterOptions: { value: ModelFilter; label: string; icon: string }[] = [
  { value: 'all', label: 'Tất cả', icon: '🔍' },
  { value: 'coding', label: 'Coding', icon: '💻' },
  { value: 'reasoning', label: 'Reasoning', icon: '🧠' },
  { value: 'fast', label: 'Nhanh', icon: '⚡' },
  { value: 'powerful', label: 'Mạnh', icon: '👑' },
]

export function ModelFilter({ value, onChange, counts, className }: ModelFilterProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {filterOptions.map((option) => {
        const isActive = value === option.value
        const count = counts?.[option.value]

        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200'
            )}
          >
            <span>{option.icon}</span>
            <span>{option.label}</span>
            {count !== undefined && (
              <span
                className={cn(
                  'ml-1 rounded-full px-1.5 py-0.5 text-xs',
                  isActive ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-500'
                )}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
