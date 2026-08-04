'use client'

import { useEffect, useState } from 'react'

type UsageResponse = {
  range: { from: string; to: string }
  totalTokens: number
  daily: Array<{ date: string; tokens: number; costUsd: number; count: number }>
  byModel: Array<{ model: string; tokens: number; count: number }>
}

export default function UsageClient({ apiKeyId }: { apiKeyId: string }) {
  const [data, setData] = useState<UsageResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const to = new Date()
        const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        const resp = await fetch(
          `/api/me/ai-keys/${apiKeyId}/usage?from=${from.toISOString()}&to=${to.toISOString()}`
        )
        const json = await resp.json()
        if (json.ok) setData(json.data)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [apiKeyId, days])

  if (loading) return <p className="text-sm text-gray-500">Đang tải...</p>
  if (!data) return <p className="text-sm text-gray-500">Không có dữ liệu</p>

  const maxTokens = Math.max(1, ...data.daily.map((d) => d.tokens))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Usage</h2>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded border-gray-300 px-3 py-1 text-sm"
        >
          <option value={7}>7 ngày</option>
          <option value={30}>30 ngày</option>
          <option value={90}>90 ngày</option>
        </select>
      </div>

      <div className="rounded border bg-white p-6">
        <p className="text-sm text-gray-600">Total tokens</p>
        <p className="text-3xl font-bold">{data.totalTokens.toLocaleString()}</p>
      </div>

      <div className="rounded border bg-white p-6">
        <h3 className="mb-3 font-semibold">Theo ngày</h3>
        {data.daily.length === 0 ? (
          <p className="text-sm text-gray-500">Chưa có usage.</p>
        ) : (
          <div className="space-y-1">
            {data.daily.map((d) => (
              <div key={d.date} className="flex items-center gap-2 text-xs">
                <span className="w-24 text-gray-600">{d.date}</span>
                <div className="flex-1 rounded bg-gray-100">
                  <div
                    className="h-4 rounded bg-blue-500"
                    style={{ width: `${(d.tokens / maxTokens) * 100}%` }}
                  />
                </div>
                <span className="w-20 text-right font-mono">{d.tokens.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded border bg-white p-6">
        <h3 className="mb-3 font-semibold">By model</h3>
        {data.byModel.length === 0 ? (
          <p className="text-sm text-gray-500">Chưa có model usage.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2">Model</th>
                <th className="pb-2 text-right">Requests</th>
                <th className="pb-2 text-right">Tokens</th>
              </tr>
            </thead>
            <tbody>
              {data.byModel.map((m) => (
                <tr key={m.model} className="border-b last:border-0">
                  <td className="py-2 font-mono">{m.model}</td>
                  <td className="py-2 text-right">{m.count}</td>
                  <td className="py-2 text-right font-mono">{m.tokens.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}