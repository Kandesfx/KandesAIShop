'use client'

import { useEffect, useState } from 'react'
import { LineChart } from '@/components/charts/line-chart'
import { PieChart } from '@/components/charts/pie-chart'
import { StatsCard } from '@/components/charts/stats-card'

type DailyUsage = {
  date: string
  tokens: number
  costUsd: number
  count: number
}

type ModelUsage = {
  model: string
  tokens: number
  count: number
}

type UsageResponse = {
  range: { from: string; to: string }
  totalTokens: number
  totalRequests: number
  daily: DailyUsage[]
  byModel: ModelUsage[]
}

function formatTokens(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K'
  return num.toLocaleString()
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

export default function UsageClient({ apiKeyId }: { apiKeyId: string }) {
  const [data, setData] = useState<UsageResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const to = new Date()
        const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        const resp = await fetch(
          `/api/me/ai-keys/${apiKeyId}/usage?from=${from.toISOString()}&to=${to.toISOString()}`
        )
        const json = await resp.json()
        if (json.ok) {
          // Enhance data with totalRequests
          setData({
            ...json.data,
            totalRequests: json.data.daily?.reduce((sum: number, d: DailyUsage) => sum + d.count, 0) || 0,
          })
        } else {
          setError(json.error?.message ?? 'Không thể tải usage')
        }
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [apiKeyId, days])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Usage</h2>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded border-gray-300 px-3 py-1 text-sm"
            disabled
          >
            <option value={7}>7 ngày</option>
            <option value={30}>30 ngày</option>
            <option value={90}>90 ngày</option>
          </select>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-lg border bg-gray-100 h-24" />
          ))}
        </div>
        <div className="animate-pulse rounded-lg border bg-gray-100 h-64" />
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

  const lineChartData = data.daily.map((d) => ({
    date: d.date,
    value: d.tokens,
  }))

  const pieChartData = data.byModel.map((m) => ({
    label: m.model,
    value: m.tokens,
  }))

  const avgTokensPerDay = data.daily.length > 0
    ? Math.round(data.totalTokens / data.daily.length)
    : 0

  const topModel = data.byModel.length > 0
    ? data.byModel.reduce((max, m) => m.tokens > max.tokens ? m : max)
    : null

  return (
    <div className="space-y-6">
      {/* Header with time range selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Usage Dashboard</h2>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value={7}>7 ngày</option>
          <option value={30}>30 ngày</option>
          <option value={90}>90 ngày</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatsCard
          title="Total Tokens"
          value={formatTokens(data.totalTokens)}
          subtitle={`${days} ngày qua`}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
        <StatsCard
          title="Total Requests"
          value={data.totalRequests.toLocaleString()}
          subtitle="API calls"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatsCard
          title="Avg / Day"
          value={formatTokens(avgTokensPerDay)}
          subtitle="Tokens per day"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
      </div>

      {/* Usage Over Time Chart */}
      <div className="rounded-lg border bg-white p-6">
        <h3 className="mb-4 font-semibold text-gray-800">Tokens theo ngày</h3>
        {lineChartData.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-gray-400">
            Chưa có usage trong khoảng thời gian này
          </div>
        ) : (
          <div className="overflow-x-auto">
            <LineChart
              data={lineChartData}
              width={Math.max(600, lineChartData.length * 30)}
              height={200}
              color="#3b82f6"
              formatValue={formatTokens}
              formatDate={formatDate}
            />
          </div>
        )}
      </div>

      {/* Model Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pie Chart */}
        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-4 font-semibold text-gray-800">Theo Model</h3>
          {pieChartData.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-gray-400">
              Chưa có usage
            </div>
          ) : (
            <div className="flex justify-center">
              <PieChart
                data={pieChartData}
                size={180}
                innerRadius={50}
                formatValue={formatTokens}
              />
            </div>
          )}
        </div>

        {/* Top Models Table */}
        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-4 font-semibold text-gray-800">Top Models</h3>
          {data.byModel.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-gray-400">
              Chưa có usage
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">Model</th>
                    <th className="pb-2 text-right font-medium">Tokens</th>
                    <th className="pb-2 text-right font-medium">Requests</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byModel.slice(0, 5).map((m) => (
                    <tr key={m.model} className="border-b last:border-0">
                      <td className="py-2 font-mono text-xs">{m.model}</td>
                      <td className="py-2 text-right font-medium">
                        {formatTokens(m.tokens)}
                      </td>
                      <td className="py-2 text-right text-gray-500">
                        {m.count.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {topModel && (
                <div className="mt-4 rounded bg-blue-50 p-3 text-sm">
                  <span className="font-medium text-blue-800">Top model: </span>
                  <span className="font-mono text-blue-900">{topModel.model}</span>
                  <span className="text-blue-600 ml-2">
                    ({formatTokens(topModel.tokens)} tokens)
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Daily Breakdown Table */}
      {data.daily.length > 0 && (
        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-4 font-semibold text-gray-800">Chi tiết theo ngày</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">Ngày</th>
                  <th className="pb-2 text-right font-medium">Tokens</th>
                  <th className="pb-2 text-right font-medium">Requests</th>
                  <th className="pb-2 text-right font-medium">Cost (USD)</th>
                </tr>
              </thead>
              <tbody>
                {data.daily.slice(-14).reverse().map((d) => (
                  <tr key={d.date} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2">{formatDate(d.date)}</td>
                    <td className="py-2 text-right font-medium">
                      {formatTokens(d.tokens)}
                    </td>
                    <td className="py-2 text-right text-gray-600">
                      {d.count.toLocaleString()}
                    </td>
                    <td className="py-2 text-right font-mono text-gray-600">
                      ${d.costUsd.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
