'use client'

import * as React from 'react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { StatsCard } from '@/components/charts/stats-card'

type NccKeyHealth = {
  id: string
  nickname: string | null
  status: string
  remainingUsd: number
  totalQuotaUsd: number
  usagePercent: number
  lastSyncedAt: string | null
  isHealthy: boolean
}

type HealthResponse = {
  provider: {
    provider: string
    status: 'ok' | 'degraded' | 'down'
    latencyMs: number | null
    lastCheckedAt: string
    uptimePercent: number
    errorCount: number
    totalRequests: number
  }
  summary: {
    totalKeys: number
    healthyKeys: number
    activeKeys: number
    totalBalance: number
    totalQuota: number
    overallUsagePercent: number
  }
  keys: NccKeyHealth[]
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const diff = Date.now() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function ProviderHealthClient() {
  const [data, setData] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch('/api/admin/ai/health', { cache: 'no-store' })
      const json = await resp.json()
      if (json.ok) {
        setData(json.data)
        setLastRefresh(new Date())
      } else {
        setError(json.error?.message || 'Failed to load')
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse rounded-lg border bg-ink-800 h-24" />
          ))}
        </div>
        <div className="animate-pulse rounded-lg border bg-ink-800 h-64" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-6 text-red-700">
        {error || 'Failed to load provider health'}
        <button onClick={load} className="ml-4 underline">Retry</button>
      </div>
    )
  }

  const { provider, summary, keys } = data

  const statusColor = provider.status === 'ok' ? 'text-green-600' : provider.status === 'degraded' ? 'text-yellow-600' : 'text-red-600'
  const statusBg = provider.status === 'ok' ? 'bg-green-50' : provider.status === 'degraded' ? 'bg-yellow-50' : 'bg-red-50'
  const statusBorder = provider.status === 'ok' ? 'border-green-200' : provider.status === 'degraded' ? 'border-yellow-200' : 'border-red-200'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-50">Provider Health</h1>
          <p className="text-sm text-ink-300 mt-1">
            Monitor NCC Pro provider status and key health
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-ink-300">
            Last updated: {lastRefresh.toLocaleTimeString('vi-VN')}
          </span>
          <button
            onClick={load}
            disabled={loading}
            className="text-sm text-blue-600 hover:underline disabled:opacity-50"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Provider Status Banner */}
      <div className={`rounded-lg border p-6 ${statusBg} ${statusBorder}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-800 border-2 border-current">
              <span className={`text-2xl ${statusColor}`}>
                {provider.status === 'ok' ? '✓' : provider.status === 'degraded' ? '⚠' : '✗'}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-ink-50">
                NCC Pro — {provider.status === 'ok' ? 'Healthy' : provider.status === 'degraded' ? 'Degraded' : 'Down'}
              </h2>
              <p className="text-sm text-ink-200">
                Uptime: {provider.uptimePercent.toFixed(1)}% • Last checked: {formatDate(provider.lastCheckedAt)}
              </p>
            </div>
          </div>
          {provider.latencyMs && (
            <div className="text-right">
              <p className="text-2xl font-bold font-mono">{provider.latencyMs}ms</p>
              <p className="text-xs text-ink-300">Latency</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Keys"
          value={summary.totalKeys}
          subtitle="NCC keys"
          variant="default"
          icon={<span className="text-lg">🔑</span>}
        />
        <StatsCard
          title="Healthy Keys"
          value={summary.healthyKeys}
          subtitle={`of ${summary.totalKeys} total`}
          variant={summary.healthyKeys === summary.totalKeys ? 'success' : 'warning'}
          icon={<span className="text-lg">✓</span>}
        />
        <StatsCard
          title="Active Keys"
          value={summary.activeKeys}
          subtitle="Active + Low Balance"
          variant="default"
          icon={<span className="text-lg">⚡</span>}
        />
        <StatsCard
          title="Total Balance"
          value={`$${summary.totalBalance.toFixed(2)}`}
          subtitle={`of $${summary.totalQuota.toFixed(2)} total quota`}
          variant={summary.overallUsagePercent > 90 ? 'danger' : summary.overallUsagePercent > 75 ? 'warning' : 'success'}
          icon={<span className="text-lg">💰</span>}
        />
      </div>

      {/* Keys Table */}
      <div className="rounded-lg border bg-ink-800">
        <div className="border-b p-4">
          <h2 className="font-semibold text-ink-50">Key Health</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-ink-900 text-left">
                <th className="p-3">Nickname</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Balance</th>
                <th className="p-3 text-right">Usage</th>
                <th className="p-3 text-right">Last Synced</th>
                <th className="p-3">Health</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => {
                const usageColor = key.usagePercent > 90 ? 'text-red-600' : key.usagePercent > 75 ? 'text-yellow-600' : 'text-green-600'
                
                return (
                  <tr key={key.id} className="border-b last:border-0 hover:bg-ink-900">
                    <td className="p-3">
                      <div className="font-medium">{key.nickname || '—'}</div>
                      <div className="text-xs text-ink-300 font-mono">{key.id.slice(0, 8)}...</div>
                    </td>
                    <td className="p-3">
                      <span className={`rounded px-2 py-0.5 text-xs ${
                        key.status === 'active' ? 'bg-green-100 text-green-800' :
                        key.status === 'low_balance' ? 'bg-yellow-100 text-yellow-800' :
                        key.status === 'exhausted' ? 'bg-red-100 text-red-800' :
                        'bg-ink-800 text-ink-100'
                      }`}>
                        {key.status}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono">
                      ${key.remainingUsd.toFixed(2)}
                    </td>
                    <td className={`p-3 text-right font-mono ${usageColor}`}>
                      {key.usagePercent.toFixed(1)}%
                    </td>
                    <td className="p-3 text-right text-xs text-ink-300">
                      {formatDate(key.lastSyncedAt)}
                    </td>
                    <td className="p-3">
                      {key.isHealthy ? (
                        <span className="text-green-600">✓ Healthy</span>
                      ) : (
                        <span className="text-red-600">✗ Unhealthy</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {keys.length === 0 && (
            <p className="p-6 text-center text-ink-300">No NCC keys found</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link
          href="/manage/ai/ncc-keys"
          className="flex items-center gap-3 rounded-lg border bg-ink-800 p-4 hover:bg-ink-900 transition-colors"
        >
          <span className="text-2xl">🔑</span>
          <div>
            <p className="font-medium">Manage Keys</p>
            <p className="text-xs text-ink-300">Add, edit, or remove NCC keys</p>
          </div>
        </Link>
        <Link
          href="/manage/ai/usage"
          className="flex items-center gap-3 rounded-lg border bg-ink-800 p-4 hover:bg-ink-900 transition-colors"
        >
          <span className="text-2xl">📊</span>
          <div>
            <p className="font-medium">Usage Analytics</p>
            <p className="text-xs text-ink-300">View detailed usage reports</p>
          </div>
        </Link>
        <Link
          href="/manage/ai/alerts"
          className="flex items-center gap-3 rounded-lg border bg-ink-800 p-4 hover:bg-ink-900 transition-colors"
        >
          <span className="text-2xl">🔔</span>
          <div>
            <p className="font-medium">Alerts</p>
            <p className="text-xs text-ink-300">View quota and balance alerts</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
