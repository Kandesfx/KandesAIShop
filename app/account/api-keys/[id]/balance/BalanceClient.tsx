'use client'

import { useEffect, useState } from 'react'
import { ModelGrid } from '@/components/ai/model-grid'
import { ModelCard } from '@/components/ai/model-card'
import type { ModelInfo } from '@/components/ai/model-card'
import type { ModelFilter } from '@/components/ai/model-filter'

type BalanceResponse = {
  apiKeyId: string
  apiKeyName: string
  status: string
  rotationPolicy: string
  quotaUsedTokens: string
  quotaTokens: string
  softCapTokens: string | null
  isOverSoftCap: boolean
  nccNickname: string | null
  nccStatus: string | null
  nccRemainingUsd: number | null
  nccTotalQuotaUsd: number | null
  nccLastSyncedAt: string | null
  nccRemaining: number | null
  nccExpiresAt: string | null
  nccDaysUntilExpiry: number | null
  nccMode: string | null
  availableModels: { id: string; display_name: string }[]
  modelStats: { model: string; requests: number; input_tokens: number; output_tokens: number; cost_usd: number }[]
  pinnedNccKeyId: string | null
  pinnedNccNickname: string | null
  pinnedNccRemainingUsd: number | null
  expiresAt: string | null
  lastUsedAt: string | null
  lastBalanceCheckAt: string | null
}

// Model metadata for better display
const MODEL_METADATA: Record<string, Partial<ModelInfo>> = {
  'claude-sonnet-4-6': {
    displayName: 'Claude Sonnet 4.6',
    description: 'Balanced model for coding tasks',
    capabilities: ['coding', 'reasoning'],
    recommended: true,
    fast: false,
    powerful: false,
  },
  'claude-sonnet-5': {
    displayName: 'Claude Sonnet 5',
    description: 'Latest Sonnet with improved reasoning',
    capabilities: ['coding', 'reasoning'],
    recommended: false,
    fast: true,
    powerful: false,
  },
  'claude-opus-4-6': {
    displayName: 'Claude Opus 4.6',
    description: 'Most powerful model for complex tasks',
    capabilities: ['coding', 'reasoning', 'function'],
    recommended: false,
    fast: false,
    powerful: true,
  },
  'claude-haiku-4-5': {
    displayName: 'Claude Haiku 4.5',
    description: 'Fast and cost-effective',
    capabilities: ['coding'],
    fast: true,
    recommended: false,
    powerful: false,
  },
  'gpt-5.4': {
    displayName: 'GPT-5.4',
    description: 'Latest GPT model for general tasks',
    capabilities: ['coding', 'reasoning'],
    recommended: false,
    fast: false,
    powerful: true,
  },
  'gpt-5.4-mini': {
    displayName: 'GPT-5.4 Mini',
    description: 'Fast and efficient GPT variant',
    capabilities: ['coding'],
    fast: true,
    recommended: false,
    powerful: false,
  },
  'gpt-5.5': {
    displayName: 'GPT-5.5',
    description: 'Premium GPT model',
    capabilities: ['coding', 'reasoning'],
    fast: false,
    powerful: true,
  },
}

function enhanceModel(model: { id: string; display_name: string }): ModelInfo {
  const meta = MODEL_METADATA[model.id] || {}
  return {
    id: model.id,
    displayName: meta.displayName || model.display_name || model.id,
    description: meta.description,
    capabilities: meta.capabilities,
    recommended: meta.recommended,
    fast: meta.fast,
    powerful: meta.powerful,
    pricing: {
      inputCost: 3,
      outputCost: 15,
      unit: '1M tokens',
    },
  }
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    // Could show toast notification here
  })
}

function generateConfig(model: ModelInfo): string {
  const config = {
    model: `kandes-${model.id}`,
    baseURL: 'https://kandes.shop/api/ai/v1',
    apiKey: 'YOUR_API_KEY',
  }
  return JSON.stringify(config, null, 2)
}

export default function BalanceClient({ apiKeyId }: { apiKeyId: string }) {
  const [data, setData] = useState<BalanceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<ModelFilter>('all')
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [copyMessage, setCopyMessage] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const resp = await fetch(`/api/me/ai-keys/${apiKeyId}/balance`, {
          cache: 'no-store',
        })
        const json = await resp.json()
        if (json.ok) {
          setData(json.data)
        } else {
          setError(json.error?.message ?? 'Không thể tải balance')
        }
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [apiKeyId])

  function handleCopyConfig(model: ModelInfo) {
    const config = generateConfig(model)
    copyToClipboard(config)
    setCopyMessage(`Đã copy config cho ${model.displayName}`)
    window.setTimeout(() => setCopyMessage(null), 3000)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse rounded-lg border bg-gray-100 h-32" />
        <div className="animate-pulse rounded-lg border bg-gray-100 h-48" />
        <div className="animate-pulse rounded-lg border bg-gray-100 h-64" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <>
        <CopyToast message={copyMessage} />
        <div className="rounded border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error ?? 'Không có dữ liệu'}
        </div>
      </>
    )
  }

  return (
    <div className="space-y-6">
      <CopyToast message={copyMessage} />

      {(() => {
        const usagePct =
          data.nccTotalQuotaUsd && data.nccTotalQuotaUsd > 0
            ? Math.min(
                100,
                ((data.nccTotalQuotaUsd - (data.nccRemaining ?? 0)) / data.nccTotalQuotaUsd) * 100
              )
            : 0
        const models = data.availableModels.map(enhanceModel)
        return (
          <>
            {/* NCC Key info */}
      <div className="rounded-lg border bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">NCC Key</h2>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              data.nccStatus === 'active'
                ? 'bg-green-100 text-green-800'
                : data.nccStatus === 'low_balance'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-700'
            }`}
          >
            {data.nccStatus === 'active' ? '🟢 Hoạt động' : data.nccStatus === 'low_balance' ? '🟡 Balance thấp' : data.nccStatus ?? '—'}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Nickname</p>
            <p className="font-mono font-medium">{data.nccNickname ?? '—'}</p>
          </div>
          <div>
            <p className="text-gray-500">Mode</p>
            <p className="font-medium">{data.nccMode ?? '—'}</p>
          </div>
          <div>
            <p className="text-gray-500">Còn lại</p>
            <p className="font-medium">{data.nccDaysUntilExpiry ?? '—'} ngày</p>
          </div>
          <div>
            <p className="text-gray-500">Pinned Key</p>
            <p className="font-medium truncate">{data.pinnedNccNickname ?? 'Auto'}</p>
          </div>
        </div>
      </div>

      {/* Balance */}
      <div className="rounded-lg border bg-gradient-to-br from-white to-blue-50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Balance</h2>
          <div className="text-xs text-gray-500">
            {data.nccLastSyncedAt && (
              <span>Synced: {new Date(data.nccLastSyncedAt).toLocaleString('vi-VN')}</span>
            )}
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-4xl font-bold font-mono text-gray-900">
              ${(data.nccRemaining ?? data.nccRemainingUsd ?? 0).toFixed(2)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              / ${(data.nccTotalQuotaUsd ?? 0).toFixed(2)} USD
            </p>
          </div>
          {data.nccExpiresAt && (
            <div className="text-right text-sm">
              <p className="text-gray-500">Expires</p>
              <p className="font-medium">{new Date(data.nccExpiresAt).toLocaleDateString('vi-VN')}</p>
            </div>
          )}
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Đã dùng</span>
            <span>{usagePct.toFixed(1)}%</span>
          </div>
          <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                usagePct > 80 ? 'bg-red-500' : usagePct > 50 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Models Grid */}
      <div className="rounded-lg border bg-white p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Models có sẵn</h2>
          <p className="text-sm text-gray-500 mt-1">
            {data.availableModels.length} models • Fetch real-time từ NCC Pro
          </p>
        </div>

        {data.availableModels.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Không fetch được models (key có thể không phải loại ccpro)
          </div>
        ) : (
          <ModelGrid
            models={models}
            selectedModel={selectedModel || undefined}
            onSelect={(m) => setSelectedModel(selectedModel === m.id ? null : m.id)}
            onCopyConfig={handleCopyConfig}
            filterValue={filter}
            onFilterChange={setFilter}
          />
        )}
      </div>

      {/* Aliases Reference */}
      <details className="rounded-lg border bg-white">
        <summary className="cursor-pointer p-4 font-medium text-gray-700 hover:bg-gray-50">
          📋 Kandes Aliases Reference
        </summary>
        <div className="p-4 pt-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2">Kandes Alias</th>
                <th className="pb-2">Upstream Model</th>
              </tr>
            </thead>
            <tbody>
              {[
                { alias: 'kandes-codex', upstream: 'gpt-5.4' },
                { alias: 'kandes-codex-fast', upstream: 'gpt-5.4-mini' },
                { alias: 'kandes-codex-review', upstream: 'codex-auto-review' },
                { alias: 'kandes-gpt-pro', upstream: 'gpt-5.5' },
                { alias: 'kandes-claude', upstream: 'claude-sonnet-4-6' },
                { alias: 'kandes-claude-pro', upstream: 'claude-sonnet-5' },
                { alias: 'kandes-claude-opus', upstream: 'claude-opus-4-6' },
                { alias: 'kandes-claude-haiku', upstream: 'claude-haiku-4-5' },
              ].map((m) => (
                <tr key={m.alias} className="border-b last:border-0">
                  <td className="py-2 font-mono text-blue-600">{m.alias}</td>
                  <td className="py-2 font-mono text-gray-600">{m.upstream}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {/* Model Usage Stats */}
      {data.modelStats.length > 0 && (
        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold mb-4">Model Usage Stats</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2">Model</th>
                  <th className="pb-2 text-right">Requests</th>
                  <th className="pb-2 text-right">Input</th>
                  <th className="pb-2 text-right">Output</th>
                  <th className="pb-2 text-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                {data.modelStats.map((s) => (
                  <tr key={s.model} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 font-mono">{s.model}</td>
                    <td className="py-2 text-right">{s.requests.toLocaleString()}</td>
                    <td className="py-2 text-right font-mono">{s.input_tokens.toLocaleString()}</td>
                    <td className="py-2 text-right font-mono">{s.output_tokens.toLocaleString()}</td>
                    <td className="py-2 text-right font-mono text-green-600">${s.cost_usd.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quota Info */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Quota Info</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center p-3 rounded-lg bg-gray-50">
            <p className="text-2xl font-bold font-mono">{Number(Number(data.quotaUsedTokens) / 1_000_000).toFixed(1)}M</p>
            <p className="text-gray-500 text-xs mt-1">Used</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-blue-50">
            <p className="text-2xl font-bold font-mono">{Number(Number(data.quotaTokens) / 1_000_000).toFixed(0)}M</p>
            <p className="text-gray-500 text-xs mt-1">Quota</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-amber-50">
            <p className="text-2xl font-bold font-mono">
              {data.softCapTokens ? `${(Number(data.softCapTokens) / 1_000_000).toFixed(0)}M` : '—'}
            </p>
            <p className="text-gray-500 text-xs mt-1">Soft Cap</p>
          </div>
        </div>
        {data.isOverSoftCap && (
          <div className="mt-4 rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
            ⚠️ Đã vượt soft cap. Admin sẽ nhận thông báo.
          </div>
        )}
      </div>
          </>
        )
      })()}
    </div>
  )
}

function CopyToast({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div
      role="status"
      className="fixed bottom-6 right-6 z-50 rounded-lg border border-electric/40 bg-electric/10 text-electric px-4 py-2 text-sm shadow-lg"
    >
      {message}
    </div>
  )
}
