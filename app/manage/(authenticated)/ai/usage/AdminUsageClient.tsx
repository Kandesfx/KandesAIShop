'use client'

import * as React from 'react'
import { useEffect, useState } from 'react'
import { LineChart } from '@/components/charts/line-chart'
import { PieChart } from '@/components/charts/pie-chart'
import { StatsCard } from '@/components/charts/stats-card'

type DailyUsage = {
  date: string
  tokens: number
  requests: number
  costUsd: number
}

type TopUser = {
  userId: string
  userName: string
  userEmail: string
  requests: number
  tokens: number
  costUsd: number
}

type TopModel = {
  model: string
  requests: number
  tokens: number
  costUsd: number
}

type UsageData = {
  totals: {
    requests: number
    tokens: number
    costUsd: number
  }
  daily: DailyUsage[]
  topUsers: TopUser[]
  topModels: TopModel[]
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

export default function AdminUsageClient({ initialData }: { initialData: UsageData }) {
  const [data, setData] = useState(initialData)
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const resp = await fetch(`/api/admin/ai/usage?days=${days}`)
        const json = await resp.json()
        if (json.ok) {
          setData(json.data)
        }
      } catch (e) {
        console.error('Failed to load usage:', e)
      } finally {
        setLoading(false)
      }
    }
    if (days !== 30) { // Only fetch if days changed from initial
      load()
    }
  }, [days])

  const lineChartData = data.daily.map((d) => ({
    date: d.date,
    value: d.tokens,
  }))

  const pieChartData = data.topModels.map((m) => ({
    label: m.model,
    value: m.tokens,
  }))

  const avgTokensPerDay = data.daily.length > 0
    ? Math.round(data.totals.tokens / data.daily.length)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-50">AI Usage Analytics</h1>
          <p className="text-sm text-ink-300 mt-1">Overview của toàn bộ usage trên Kandes</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded border-ink-400 px-3 py-2 text-sm"
          disabled={loading}
        >
          <option value={7}>7 ngày</option>
          <option value={30}>30 ngày</option>
          <option value={90}>90 ngày</option>
          <option value={180}>6 tháng</option>
          <option value={365}>1 năm</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Requests"
          value={data.totals.requests.toLocaleString()}
          subtitle={`${days} ngày`}
          variant="default"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatsCard
          title="Total Tokens"
          value={formatTokens(data.totals.tokens)}
          subtitle="Input + Output"
          variant="default"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
        <StatsCard
          title="Upstream Cost"
          value={`$${data.totals.costUsd.toFixed(2)}`}
          subtitle="Từ NCC Pro"
          variant="warning"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatsCard
          title="Avg / Day"
          value={formatTokens(avgTokensPerDay)}
          subtitle="Tokens per day"
          variant="default"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
      </div>

      {/* Usage Over Time Chart */}
      <div className="rounded-lg border bg-ink-800 p-6">
        <h3 className="mb-4 font-semibold text-ink-50">Tokens theo ngày</h3>
        {lineChartData.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-ink-300">
            Chưa có usage trong khoảng thời gian này
          </div>
        ) : (
          <div className="overflow-x-auto">
            <LineChart
              data={lineChartData}
              width={Math.max(600, lineChartData.length * 25)}
              height={250}
              color="#8b5cf6"
              formatValue={formatTokens}
              formatDate={formatDate}
            />
          </div>
        )}
      </div>

      {/* Model & User Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pie Chart */}
        <div className="rounded-lg border bg-ink-800 p-6">
          <h3 className="mb-4 font-semibold text-ink-50">Usage theo Model</h3>
          {pieChartData.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-ink-300">
              Chưa có usage
            </div>
          ) : (
            <div className="flex justify-center">
              <PieChart
                data={pieChartData}
                size={200}
                innerRadius={60}
                formatValue={formatTokens}
              />
            </div>
          )}
        </div>

        {/* Top Users */}
        <div className="rounded-lg border bg-ink-800 p-6">
          <h3 className="mb-4 font-semibold text-ink-50">Top Users</h3>
          {data.topUsers.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-ink-300">
              Chưa có usage
            </div>
          ) : (
            <div className="space-y-3">
              {data.topUsers.slice(0, 5).map((u, i) => (
                <div key={u.userId} className="flex items-center justify-between p-3 rounded-lg bg-ink-900">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-700 font-bold text-sm">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{u.userName || '—'}</p>
                      <p className="text-xs text-ink-300">{u.userEmail}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-medium text-sm">{formatTokens(u.tokens)}</p>
                    <p className="text-xs text-ink-300">{u.requests} requests</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Users Table */}
        <div className="rounded-lg border bg-ink-800">
          <h3 className="border-b p-4 font-semibold">Top Users - Chi tiết</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-900 text-left">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3 text-right">Requests</th>
                  <th className="p-3 text-right">Tokens</th>
                  <th className="p-3 text-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                {data.topUsers.map((u) => (
                  <tr key={u.userId} className="border-b last:border-0 hover:bg-ink-900">
                    <td className="p-3">
                      <div className="font-medium">{u.userName || '—'}</div>
                      <div className="text-xs text-ink-300">{u.userEmail}</div>
                    </td>
                    <td className="p-3 text-right font-mono">{u.requests.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono">{formatTokens(u.tokens)}</td>
                    <td className="p-3 text-right font-mono">${u.costUsd.toFixed(4)}</td>
                  </tr>
                ))}
                {data.topUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-ink-300">Chưa có usage</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Models Table */}
        <div className="rounded-lg border bg-ink-800">
          <h3 className="border-b p-4 font-semibold">Top Models - Chi tiết</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-900 text-left">
                <tr>
                  <th className="p-3">Model</th>
                  <th className="p-3 text-right">Requests</th>
                  <th className="p-3 text-right">Tokens</th>
                  <th className="p-3 text-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                {data.topModels.map((m) => (
                  <tr key={m.model} className="border-b last:border-0 hover:bg-ink-900">
                    <td className="p-3 font-mono text-xs">{m.model}</td>
                    <td className="p-3 text-right font-mono">{m.requests.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono">{formatTokens(m.tokens)}</td>
                    <td className="p-3 text-right font-mono">${m.costUsd.toFixed(4)}</td>
                  </tr>
                ))}
                {data.topModels.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-ink-300">Chưa có usage</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Daily Breakdown */}
      {data.daily.length > 0 && (
        <div className="rounded-lg border bg-ink-800">
          <h3 className="border-b p-4 font-semibold">Daily Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-900 text-left">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Tokens</th>
                  <th className="p-3 text-right">Requests</th>
                  <th className="p-3 text-right">Cost (USD)</th>
                </tr>
              </thead>
              <tbody>
                {data.daily.slice(-14).reverse().map((d) => (
                  <tr key={d.date} className="border-b last:border-0 hover:bg-ink-900">
                    <td className="p-3">{formatDate(d.date)}</td>
                    <td className="p-3 text-right font-mono">{formatTokens(d.tokens)}</td>
                    <td className="p-3 text-right font-mono">{d.requests.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono">${d.costUsd.toFixed(4)}</td>
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
