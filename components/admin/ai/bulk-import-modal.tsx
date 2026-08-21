'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'

interface BulkImportResult {
  line: number
  apiKey: string
  success: boolean
  message?: string
  id?: string
}

interface BulkImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function BulkImportModal({ isOpen, onClose, onSuccess }: BulkImportModalProps) {
  const [input, setInput] = React.useState('')
  const [importing, setImporting] = React.useState(false)
  const [results, setResults] = React.useState<BulkImportResult[]>([])
  const [error, setError] = React.useState<string | null>(null)

  function parseLines(text: string): { apiKey: string; quota: number; nickname: string }[] {
    const lines = text.split('\n').filter(l => l.trim())
    return lines.map(line => {
      const parts = line.split(',').map(p => p.trim())
      return {
        apiKey: parts[0] || '',
        quota: Number(parts[1]) || 10,
        nickname: parts[2] || '',
      }
    }).filter(item => item.apiKey.startsWith('sk-'))
  }

  async function handleImport() {
    const items = parseLines(input)
    if (items.length === 0) {
      setError('Không tìm thấy key hợp lệ. Format: sk-xxx,10,optional_nickname')
      return
    }

    setImporting(true)
    setError(null)
    setResults([])

    const importResults: BulkImportResult[] = []

    for (let i = 0; i < items.length; i++) {
      const item = items[i]!
      const lineNumber = i + 1

      try {
        const resp = await fetch('/api/admin/ai/ncc-keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: 'ccpro',
            apiKey: item.apiKey,
            totalQuotaUsd: item.quota,
            nickname: item.nickname || undefined,
          }),
        })
        const json = await resp.json()

        if (json.ok) {
          importResults.push({
            line: lineNumber,
            apiKey: item.apiKey.slice(0, 15) + '***',
            success: true,
            id: json.data?.id,
          })
        } else {
          importResults.push({
            line: lineNumber,
            apiKey: item.apiKey.slice(0, 15) + '***',
            success: false,
            message: json.error?.message || 'Unknown error',
          })
        }
      } catch (e) {
        importResults.push({
          line: lineNumber,
          apiKey: item.apiKey.slice(0, 15) + '***',
          success: false,
          message: (e as Error).message,
        })
      }

      setResults([...importResults])
    }

    setImporting(false)

    const successCount = importResults.filter(r => r.success).length
    if (successCount > 0) {
      onSuccess()
    }
  }

  function handleClose() {
    setInput('')
    setResults([])
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  const successCount = results.filter(r => r.success).length
  const failCount = results.filter(r => !r.success).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl max-h-[90vh] bg-ink-800 rounded-lg shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">Bulk Import NCC Keys</h2>
            <p className="text-sm text-gray-500 mt-1">
              Import nhiều NCC keys cùng lúc. Mỗi dòng: <code className="bg-gray-100 px-1 rounded">api_key,quota_usd,nickname</code>
            </p>
          </div>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Input area */}
          <div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`sk-jy-cc-xxxxxxx,10,NCC Key 1
sk-jy-cx-xxxxxxx,20,NCC Key 2
sk-jy-cc-yyyyyyy,15`}
              className="w-full h-48 p-3 border rounded-lg font-mono text-sm resize-none"
              disabled={importing}
            />
            <p className="text-xs text-gray-500 mt-1">
              {parseLines(input).length} keys detected
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-green-600">✓ {successCount} imported</span>
                {failCount > 0 && <span className="text-red-600">✗ {failCount} failed</span>}
              </div>

              <div className="max-h-60 overflow-auto border rounded">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Line</th>
                      <th className="p-2 text-left">Key</th>
                      <th className="p-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={i} className={`border-t ${r.success ? '' : 'bg-red-50'}`}>
                        <td className="p-2">{r.line}</td>
                        <td className="p-2 font-mono">{r.apiKey}</td>
                        <td className="p-2">
                          {r.success ? (
                            <span className="text-green-600">✓ Imported</span>
                          ) : (
                            <span className="text-red-600" title={r.message}>✗ {r.message}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
          <Button variant="outline" onClick={handleClose}>
            {results.length > 0 ? 'Close' : 'Cancel'}
          </Button>
          <Button
            onClick={handleImport}
            disabled={importing || parseLines(input).length === 0}
            isLoading={importing}
          >
            {importing ? `Importing (${results.length}/${parseLines(input).length})...` : `Import ${parseLines(input).length} Keys`}
          </Button>
        </div>
      </div>
    </div>
  )
}
