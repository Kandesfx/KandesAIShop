'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

type NccModel = {
  id: string
  display_name?: string
  owned_by: string
}

export default function ModelCheckerClient() {
  const [apiKey, setApiKey] = useState('')
  const [models, setModels] = useState<NccModel[]>([])
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string }>>({})
  const [loaded, setLoaded] = useState(false)

  async function fetchModels() {
    if (!apiKey.trim()) {
      setError('Vui lòng nhập API key')
      return
    }
    setLoading(true)
    setError(null)
    setModels([])
    setTestResults({})

    try {
      const resp = await fetch('/api/ai/v1/models', {
        headers: { Authorization: `Bearer ${apiKey.trim()}` },
      })
      const json = await resp.json()
      if (!json.ok) throw new Error(json.error?.message || 'Lỗi không xác định')
      setModels(json.data?.data || [])
      setLoaded(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function testModel(modelId: string) {
    setTesting(modelId)
    try {
      const resp = await fetch('/api/ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: 'OK' }],
          max_tokens: 5,
        }),
      })
      if (resp.ok) {
        setTestResults((prev) => ({ ...prev, [modelId]: { ok: true, message: 'Hoạt động' } }))
      } else {
        const err = await resp.json()
        setTestResults((prev) => ({
          ...prev,
          [modelId]: { ok: false, message: err.error?.message || 'Model không khả dụng' },
        }))
      }
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [modelId]: { ok: false, message: (err as Error).message },
      }))
    } finally {
      setTesting(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="flex gap-3">
        <input
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-jy-cc-xxxxxxxxxxxxxxxx"
          className="flex-1 rounded-lg border border-ink-400 bg-ink-900 px-4 py-3 text-[13px] font-mono text-ink-100 placeholder:text-ink-300 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        />
        <button
          onClick={fetchModels}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium text-[13px] hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Đang tải...
            </>
          ) : (
            'Fetch Models'
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-[13px] font-mono">
          <span className="text-red-500">ERROR:</span> {error}
        </div>
      )}

      {/* Results */}
      {loaded && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[14px] text-white">
              Models có sẵn ({models.length})
            </h3>
            <button
              onClick={() => {
                setLoaded(false)
                setModels([])
                setTestResults({})
              }}
              className="text-[12px] text-ink-300 hover:text-sky-400 transition-colors"
            >
              Đổi key
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {models.map((m) => {
              const result = testResults[m.id]
              const isTesting = testing === m.id
              return (
                <div
                  key={m.id}
                  className={`border rounded-xl p-4 transition-colors ${
                    result?.ok
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : result?.ok === false
                        ? 'border-red-500/30 bg-red-500/5'
                        : 'border-ink-400 bg-ink-900/50 hover:border-ink-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <code className="text-[12px] font-mono font-semibold text-ink-50 break-all">
                        {m.id}
                      </code>
                      {m.display_name && m.display_name !== m.id && (
                        <p className="text-[11px] text-ink-200 mt-1">{m.display_name}</p>
                      )}
                      {m.owned_by && (
                        <span className="inline-block mt-2 text-[10px] px-2 py-0.5 bg-ink-800 text-ink-200 rounded border border-ink-400">
                          {m.owned_by}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => testModel(m.id)}
                      disabled={isTesting || result?.ok === true}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors disabled:cursor-not-allowed ${
                        result?.ok
                          ? 'bg-emerald-500/20 text-emerald-400 cursor-default'
                          : result?.ok === false
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-ink-700 hover:bg-ink-600 text-ink-100'
                      }`}
                    >
                      {isTesting ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : result?.ok ? (
                        '✓ OK'
                      ) : result?.ok === false ? (
                        '✗ Lỗi'
                      ) : (
                        'Test'
                      )}
                    </button>
                  </div>
                  {result && !result.ok && (
                    <p className="mt-2 text-[11px] text-red-400 font-mono">{result.message}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loaded && !loading && !error && (
        <div className="text-center py-12 text-ink-300 border border-dashed border-ink-400 rounded-xl">
          <p className="text-[13px] font-mono">Nhập API key và nhấn Fetch Models để xem danh sách.</p>
        </div>
      )}
    </div>
  )
}
