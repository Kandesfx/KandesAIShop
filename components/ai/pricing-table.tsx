'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface PricingRow {
  model: string
  displayName: string
  family: string
  upstream: string
  inputCost: number
  outputCost: number
  recommended?: boolean
  fast?: boolean
  powerful?: boolean
}

const DEFAULT_PRICING: PricingRow[] = [
  // Codex (GPT)
  { model: 'kandes-codex', displayName: 'GPT-5.4', family: 'gpt-codex', upstream: 'gpt-5.4', inputCost: 0.003, outputCost: 0.012, powerful: true },
  { model: 'kandes-codex-fast', displayName: 'GPT-5.4 Mini', family: 'gpt-codex-mini', upstream: 'gpt-5.4-mini', inputCost: 0.0003, outputCost: 0.0012, fast: true },
  { model: 'kandes-codex-review', displayName: 'Codex Auto-Review', family: 'gpt-codex', upstream: 'codex-auto-review', inputCost: 0.003, outputCost: 0.012 },
  { model: 'kandes-gpt-pro', displayName: 'GPT-5.5', family: 'gpt-pro', upstream: 'gpt-5.5', inputCost: 0.005, outputCost: 0.02, powerful: true },
  // Claude
  { model: 'kandes-claude', displayName: 'Claude Sonnet 4.6', family: 'claude-sonnet', upstream: 'claude-sonnet-4-6', inputCost: 0.003, outputCost: 0.015, recommended: true },
  { model: 'kandes-claude-pro', displayName: 'Claude Sonnet 5', family: 'claude-sonnet-pro', upstream: 'claude-sonnet-5', inputCost: 0.006, outputCost: 0.03, powerful: true },
  { model: 'kandes-claude-opus', displayName: 'Claude Opus 4.6', family: 'claude-opus', upstream: 'claude-opus-4-6', inputCost: 0.015, outputCost: 0.075, powerful: true },
  { model: 'kandes-claude-opus-latest', displayName: 'Claude Opus 5', family: 'claude-opus', upstream: 'claude-opus-5', inputCost: 0.015, outputCost: 0.075, powerful: true },
  { model: 'kandes-claude-haiku', displayName: 'Claude Haiku 4.5', family: 'claude-haiku', upstream: 'claude-haiku-4-5', inputCost: 0.0008, outputCost: 0.004, fast: true },
]

interface PricingTableProps {
  pricing?: PricingRow[]
  className?: string
}

function formatCost(cost: number): string {
  if (cost >= 0.01) return `$${cost.toFixed(4)}`
  if (cost >= 0.001) return `$${cost.toFixed(5)}`
  return `$${cost.toFixed(6)}`
}

export function PricingTable({ pricing = DEFAULT_PRICING, className }: PricingTableProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="p-3 font-medium text-gray-600">Model</th>
              <th className="p-3 font-medium text-gray-600">Upstream</th>
              <th className="p-3 text-right font-medium text-gray-600">Input / 1M tokens</th>
              <th className="p-3 text-right font-medium text-gray-600">Output / 1M tokens</th>
              <th className="p-3 text-center font-medium text-gray-600">Flags</th>
            </tr>
          </thead>
          <tbody>
            {pricing.map((row) => (
              <tr key={row.model} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                <td className="p-3">
                  <div className="font-medium text-gray-900">{row.displayName}</div>
                  <div className="text-xs text-gray-500 font-mono">{row.model}</div>
                </td>
                <td className="p-3">
                  <code className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                    {row.upstream}
                  </code>
                </td>
                <td className="p-3 text-right font-mono">
                  {formatCost(row.inputCost)}
                </td>
                <td className="p-3 text-right font-mono">
                  {formatCost(row.outputCost)}
                </td>
                <td className="p-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {row.recommended && (
                      <span className="inline-flex items-center gap-1 rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700">
                        ⭐ Recommended
                      </span>
                    )}
                    {row.fast && (
                      <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
                        ⚡ Fast
                      </span>
                    )}
                    {row.powerful && (
                      <span className="inline-flex items-center gap-1 rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-700">
                        👑 Powerful
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">
        * Giá tham khảo từ NCC Pro. Chi phí thực tế có thể thay đổi theo usage.
      </p>
    </div>
  )
}

interface ModelPricingCardProps {
  model: string
  displayName: string
  pricing: { inputCost: number; outputCost: number }
  className?: string
}

export function ModelPricingCard({ model, displayName, pricing, className }: ModelPricingCardProps) {
  return (
    <div className={cn('rounded-lg border bg-white p-4', className)}>
      <div className="mb-3">
        <h3 className="font-semibold text-gray-900">{displayName}</h3>
        <code className="text-xs text-gray-500">{model}</code>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded bg-gray-50 p-2">
          <p className="text-xs text-gray-500">Input</p>
          <p className="font-mono font-medium">{formatCost(pricing.inputCost)}</p>
          <p className="text-xs text-gray-400">/ 1M tokens</p>
        </div>
        <div className="rounded bg-gray-50 p-2">
          <p className="text-xs text-gray-500">Output</p>
          <p className="font-mono font-medium">{formatCost(pricing.outputCost)}</p>
          <p className="text-xs text-gray-400">/ 1M tokens</p>
        </div>
      </div>
    </div>
  )
}
