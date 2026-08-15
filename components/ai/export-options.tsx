'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'

type UsageRecord = {
  date: string
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  upstreamCostUsd: number
}

type ExportOptionsProps = {
  apiKeyId: string
  dateRange: { from: string; to: string }
  onExportComplete?: () => void
}

export function ExportOptions({ apiKeyId, dateRange, onExportComplete }: ExportOptionsProps) {
  const [exporting, setExporting] = React.useState(false)
  const [exportType, setExportType] = React.useState<'json' | 'csv'>('csv')

  async function handleExport() {
    setExporting(true)
    try {
      const params = new URLSearchParams({
        from: dateRange.from,
        to: dateRange.to,
        format: exportType,
      })

      const resp = await fetch(
        `/api/me/ai-keys/${apiKeyId}/usage/export?${params}`,
        { cache: 'no-store' }
      )

      if (!resp.ok) {
        throw new Error('Export failed')
      }

      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `usage-${apiKeyId}-${dateRange.from}-${dateRange.to}.${exportType}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      onExportComplete?.()
    } catch (e) {
      alert(`Export failed: ${(e as Error).message}`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900">Export Usage Data</h3>
        <p className="text-sm text-gray-500">
          Download your usage data in CSV or JSON format.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Format
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="export-format"
                value="csv"
                checked={exportType === 'csv'}
                onChange={() => setExportType('csv')}
              />
              <span className="text-sm">CSV</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="export-format"
                value="json"
                checked={exportType === 'json'}
                onChange={() => setExportType('json')}
              />
              <span className="text-sm">JSON</span>
            </label>
          </div>
        </div>

        <Button
          onClick={handleExport}
          isLoading={exporting}
          variant="outline"
        >
          {exporting ? 'Exporting...' : `Export ${exportType.toUpperCase()}`}
        </Button>
      </div>

      <div className="rounded bg-gray-50 p-3 text-xs text-gray-600">
        <p><strong>Date range:</strong> {dateRange.from} to {dateRange.to}</p>
        <p className="mt-1">
          <strong>Includes:</strong> date, model, prompt tokens, completion tokens, total tokens, upstream cost
        </p>
      </div>
    </div>
  )
}
