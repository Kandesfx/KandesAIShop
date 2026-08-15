'use client'

import * as React from 'react'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'

type Alert = {
  id: string
  type: 'ncc_low_balance' | 'ncc_exhausted' | 'api_key_over_soft_cap'
  severity: 'warning' | 'danger' | 'info'
  title: string
  description: string
  metadata: Record<string, unknown>
  createdAt: string
}

type AlertsResponse = {
  alerts: Alert[]
  summary: {
    total: number
    critical: number
    warnings: number
    info: number
  }
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function getAlertIcon(type: Alert['type']): string {
  switch (type) {
    case 'ncc_low_balance': return '💰'
    case 'api_key_over_soft_cap': return '⚠️'
    case 'ncc_exhausted': return '🚫'
    default: return '❗'
  }
}

function getSeverityColor(severity: Alert['severity']): string {
  switch (severity) {
    case 'danger': return 'border-red-300 bg-red-50'
    case 'warning': return 'border-yellow-300 bg-yellow-50'
    case 'info': return 'border-blue-300 bg-blue-50'
    default: return 'border-ink-400 bg-ink-800'
  }
}

export default function QuotaAlertsClient({ initialAlerts }: { initialAlerts: AlertsResponse }) {
  const [alerts, setAlerts] = useState(initialAlerts)
  const [filter, setFilter] = useState<'all' | 'danger' | 'warning' | 'info'>('all')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const resp = await fetch('/api/admin/ai/alerts')
        const json = await resp.json()
        if (json.ok) {
          setAlerts(json.data)
        }
      } catch (e) {
        console.error('Failed to load alerts:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [])

  const filteredAlerts = filter === 'all'
    ? alerts.alerts
    : alerts.alerts.filter(a => a.severity === filter)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-50">Quota Alerts</h1>
          <p className="text-sm text-ink-300 mt-1">
            Theo dõi balance và quota alerts cho NCC keys và API keys
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <span className="text-xs text-ink-300">Đang cập nhật...</span>}
          <button
            onClick={() => setAlerts(initialAlerts)}
            className="text-sm text-blue-600 hover:underline"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-lg border p-4 text-left transition-all ${
            filter === 'all' ? 'border-blue-400 bg-blue-50' : 'border-ink-400 bg-ink-800 hover:border-ink-400'
          }`}
        >
          <p className="text-sm text-ink-300">Tổng cộng</p>
          <p className="text-2xl font-bold">{alerts.summary.total}</p>
        </button>
        <button
          onClick={() => setFilter('danger')}
          className={`rounded-lg border p-4 text-left transition-all ${
            filter === 'danger' ? 'border-red-400 bg-red-50' : 'border-ink-400 bg-ink-800 hover:border-ink-400'
          }`}
        >
          <p className="text-sm text-red-600">🚫 Critical</p>
          <p className="text-2xl font-bold text-red-700">{alerts.summary.critical}</p>
        </button>
        <button
          onClick={() => setFilter('warning')}
          className={`rounded-lg border p-4 text-left transition-all ${
            filter === 'warning' ? 'border-yellow-400 bg-yellow-50' : 'border-ink-400 bg-ink-800 hover:border-ink-400'
          }`}
        >
          <p className="text-sm text-yellow-600">⚠️ Warnings</p>
          <p className="text-2xl font-bold text-yellow-700">{alerts.summary.warnings}</p>
        </button>
        <button
          onClick={() => setFilter('info')}
          className={`rounded-lg border p-4 text-left transition-all ${
            filter === 'info' ? 'border-blue-400 bg-blue-50' : 'border-ink-400 bg-ink-800 hover:border-ink-400'
          }`}
        >
          <p className="text-sm text-blue-600">ℹ️ Info</p>
          <p className="text-2xl font-bold text-blue-700">{alerts.summary.info}</p>
        </button>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="rounded-lg border bg-ink-800 p-8 text-center">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-ink-300">
              {filter === 'all' ? 'Không có alerts nào' : `Không có ${filter} alerts`}
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-lg border p-4 ${getSeverityColor(alert.severity)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getAlertIcon(alert.type)}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-ink-50">{alert.title}</h3>
                      <Badge
                        variant={
                          alert.severity === 'danger' ? 'danger' :
                          alert.severity === 'warning' ? 'warning' : 'info'
                        }
                      >
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-ink-200 mt-1">{alert.description}</p>
                    {alert.metadata && Object.keys(alert.metadata).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {Object.entries(alert.metadata).map(([key, value]) => (
                          <span
                            key={key}
                            className="inline-flex items-center gap-1 rounded-full bg-ink-800/80 px-2 py-1 text-xs"
                          >
                            <span className="text-ink-300">{key}:</span>
                            <span className="font-medium font-mono">{String(value)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-xs text-ink-300 whitespace-nowrap">
                  {formatRelativeTime(alert.createdAt)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border bg-ink-800 p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/manage/ai/ncc-keys"
            className="flex items-center gap-3 p-4 rounded-lg border hover:bg-ink-900 transition-colors"
          >
            <span className="text-2xl">💰</span>
            <div>
              <p className="font-medium">NCC Key Pool</p>
              <p className="text-xs text-ink-300">Quản lý balance</p>
            </div>
          </a>
          <a
            href="/manage/ai/plans"
            className="flex items-center gap-3 p-4 rounded-lg border hover:bg-ink-900 transition-colors"
          >
            <span className="text-2xl">📋</span>
            <div>
              <p className="font-medium">AI Plans</p>
              <p className="text-xs text-ink-300">Quản lý plans</p>
            </div>
          </a>
          <a
            href="/manage/ai/usage"
            className="flex items-center gap-3 p-4 rounded-lg border hover:bg-ink-900 transition-colors"
          >
            <span className="text-2xl">📊</span>
            <div>
              <p className="font-medium">Usage Analytics</p>
              <p className="text-xs text-ink-300">Xem chi tiết usage</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}
