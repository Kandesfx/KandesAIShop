'use client'

import { useEffect, useState } from 'react'

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
  // NCC real-time usage
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

export default function BalanceClient({ apiKeyId }: { apiKeyId: string }) {
  const [data, setData] = useState<BalanceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  if (loading) {
    return (
      <div className="rounded border bg-white p-6 text-sm text-gray-500">
        Đang tải balance từ NCC Pro...
      </div>
    )
  }
  if (error || !data) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error ?? 'Không có dữ liệu'}
      </div>
    )
  }

  const usagePct =
    data.nccTotalQuotaUsd && data.nccTotalQuotaUsd > 0
      ? Math.min(100, ((data.nccTotalQuotaUsd - (data.nccRemaining ?? 0)) / data.nccTotalQuotaUsd) * 100)
      : 0

  return (
    <div className="space-y-6">
      {/* NCC Key info */}
      <div className="rounded border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">NCC Key</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Nickname</p>
            <p className="font-mono">{data.nccNickname ?? '—'}</p>
          </div>
          <div>
            <p className="text-gray-500">Status</p>
            <span
              className={`rounded px-2 py-0.5 text-xs ${
                data.nccStatus === 'active'
                  ? 'bg-green-100 text-green-800'
                  : data.nccStatus === 'low_balance'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-700'
              }`}
            >
              {data.nccStatus ?? '—'}
            </span>
          </div>
          <div>
            <p className="text-gray-500">Mode</p>
            <p>{data.nccMode ?? '—'}</p>
          </div>
          <div>
            <p className="text-gray-500">Days until expiry</p>
            <p className="font-mono">{data.nccDaysUntilExpiry ?? '—'}</p>
          </div>
        </div>
      </div>

      {/* Balance */}
      <div className="rounded border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Balance</h2>
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <p className="text-3xl font-bold font-mono">
              ${(data.nccRemaining ?? data.nccRemainingUsd ?? 0).toFixed(2)}
            </p>
            <p className="text-xs text-gray-500">
              / ${(data.nccTotalQuotaUsd ?? 0).toFixed(2)} USD
            </p>
          </div>
          <div className="text-right text-xs text-gray-500">
            {data.nccLastSyncedAt && (
              <p>
                Last synced:{' '}
                {new Date(data.nccLastSyncedAt).toLocaleString('vi-VN')}
              </p>
            )}
            {data.nccExpiresAt && (
              <p>
                Expires: {new Date(data.nccExpiresAt).toLocaleDateString('vi-VN')}
              </p>
            )}
          </div>
        </div>
        <div className="h-2 rounded bg-gray-100">
          <div
            className={`h-2 rounded ${
              usagePct > 80 ? 'bg-red-500' : usagePct > 50 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${usagePct}%` }}
          />
        </div>
      </div>

      {/* Available models */}
      <div className="rounded border bg-white p-6">
        <h2 className="mb-3 text-lg font-semibold">
          Models có sẵn ({data.availableModels.length})
        </h2>
        <p className="mb-3 text-xs text-gray-500">
          Fetch trực tiếp từ NCC Pro /v1/models. KHÔNG phải tất cả models đều được key của bạn
          kích hoạt — nếu model trả 404 từ upstream → liên hệ NCC Pro.
        </p>
        {data.availableModels.length === 0 ? (
          <p className="text-sm text-gray-500">Không fetch được (có thể key không phải ccpro).</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.availableModels.map((m) => (
              <div key={m.id} className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
                <code className="text-xs font-mono">{m.id}</code>
                <p className="mt-0.5 text-xs text-gray-500">{m.display_name}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kandes aliases mapping */}
      <div className="rounded border bg-white p-6">
        <h2 className="mb-3 text-lg font-semibold">Kandes aliases (mapped)</h2>
        <p className="mb-3 text-xs text-gray-500">
          Các alias <code>kandes-*</code> được map sang upstream model phổ biến nhất. KH cũng có
          thể gửi raw upstream model name (vd <code>claude-opus-4-6</code>).
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2">Alias</th>
              <th className="pb-2">Upstream</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-1 font-mono">kandes-codex</td>
              <td className="py-1 font-mono text-gray-600">gpt-5.4</td>
            </tr>
            <tr className="border-b">
              <td className="py-1 font-mono">kandes-codex-fast</td>
              <td className="py-1 font-mono text-gray-600">gpt-5.4-mini</td>
            </tr>
            <tr className="border-b">
              <td className="py-1 font-mono">kandes-codex-review</td>
              <td className="py-1 font-mono text-gray-600">codex-auto-review</td>
            </tr>
            <tr className="border-b">
              <td className="py-1 font-mono">kandes-gpt-pro</td>
              <td className="py-1 font-mono text-gray-600">gpt-5.5</td>
            </tr>
            <tr className="border-b">
              <td className="py-1 font-mono">kandes-claude</td>
              <td className="py-1 font-mono text-gray-600">claude-sonnet-4-6</td>
            </tr>
            <tr className="border-b">
              <td className="py-1 font-mono">kandes-claude-pro</td>
              <td className="py-1 font-mono text-gray-600">claude-sonnet-5</td>
            </tr>
            <tr className="border-b">
              <td className="py-1 font-mono">kandes-claude-opus</td>
              <td className="py-1 font-mono text-gray-600">claude-opus-4-6</td>
            </tr>
            <tr>
              <td className="py-1 font-mono">kandes-claude-haiku</td>
              <td className="py-1 font-mono text-gray-600">claude-haiku-4-5</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Model usage stats */}
      {data.modelStats.length > 0 && (
        <div className="rounded border bg-white p-6">
          <h2 className="mb-3 text-lg font-semibold">Model usage stats (NCC Pro)</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2">Model</th>
                <th className="pb-2 text-right">Requests</th>
                <th className="pb-2 text-right">Input tokens</th>
                <th className="pb-2 text-right">Output tokens</th>
                <th className="pb-2 text-right">Cost (USD)</th>
              </tr>
            </thead>
            <tbody>
              {data.modelStats.map((s) => (
                <tr key={s.model} className="border-b last:border-0">
                  <td className="py-2 font-mono">{s.model}</td>
                  <td className="py-2 text-right">{s.requests}</td>
                  <td className="py-2 text-right font-mono">
                    {s.input_tokens.toLocaleString()}
                  </td>
                  <td className="py-2 text-right font-mono">
                    {s.output_tokens.toLocaleString()}
                  </td>
                  <td className="py-2 text-right font-mono">${s.cost_usd.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Soft cap */}
      <div className="rounded border bg-white p-6">
        <h2 className="mb-3 text-lg font-semibold">Quota & Soft cap</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Used</p>
            <p className="font-mono">{Number(data.quotaUsedTokens).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-500">Quota</p>
            <p className="font-mono">{Number(data.quotaTokens).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-500">Soft cap</p>
            <p className="font-mono">{data.softCapTokens ? Number(data.softCapTokens).toLocaleString() : '—'}</p>
          </div>
        </div>
        {data.isOverSoftCap && (
          <p className="mt-3 rounded bg-yellow-50 p-2 text-xs text-yellow-800">
            ⚠ Đã vượt soft cap. Admin sẽ nhận notification.
          </p>
        )}
      </div>
    </div>
  )
}