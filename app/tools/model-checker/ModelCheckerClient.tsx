'use client'

import { useState } from 'react'

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
          className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <button
          onClick={fetchModels}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Đang tải...' : 'Fetch Models'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {/* Results */}
      {loaded && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">
              Models có sẵn ({models.length})
            </h3>
            <button
              onClick={() => {
                setLoaded(false)
                setModels([])
                setTestResults({})
              }}
              className="text-sm text-slate-500 hover:text-slate-700"
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
                  className={`border rounded-lg p-4 transition-colors ${
                    result?.ok
                      ? 'border-green-200 bg-green-50'
                      : result?.ok === false
                        ? 'border-red-200 bg-red-50'
                        : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <code className="text-sm font-mono font-semibold text-slate-900 break-all">
                        {m.id}
                      </code>
                      {m.display_name && m.display_name !== m.id && (
                        <p className="text-xs text-slate-500 mt-1">{m.display_name}</p>
                      )}
                      {m.owned_by && (
                        <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                          {m.owned_by}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => testModel(m.id)}
                      disabled={isTesting || !!result?.ok}
                      className={`shrink-0 px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:cursor-not-allowed ${
                        result?.ok
                          ? 'bg-green-100 text-green-700 cursor-default'
                          : result?.ok === false
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {isTesting ? 'Testing...' : result?.ok ? '✓ OK' : result ? '✗' : 'Test'}
                    </button>
                  </div>
                  {result && !result.ok && (
                    <p className="mt-2 text-xs text-red-600">{result.message}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loaded && !loading && !error && (
        <div className="text-center py-12 text-slate-500">
          <p className="text-sm">Nhập API key và nhấn Fetch Models để xem danh sách.</p>
        </div>
      )}
    </div>
  )
}