'use client'

import * as React from 'react'
import { StatsCard } from '@/components/charts/stats-card'

type UserUsage = {
  userId: string
  userEmail: string
  userName: string | null
  apiKeyCount: number
  totalTokens: number
  totalCost: number
  lastUsedAt: string | null
}

type UserUsageLimitsProps = {
  users: UserUsage[]
  onSetLimit?: (userId: string) => void
}

function formatTokens(num: number): string {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B'
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K'
  return num.toLocaleString()
}

export function UserUsageLimits({ users, onSetLimit }: UserUsageLimitsProps) {
  const [filter, setFilter] = React.useState<'all' | 'high'>('all')

  const filteredUsers = filter === 'high'
    ? users.filter(u => u.totalTokens > 1_000_000)
    : users

  const totalTokens = users.reduce((sum, u) => sum + u.totalTokens, 0)
  const totalCost = users.reduce((sum, u) => sum + u.totalCost, 0)
  const avgTokens = users.length > 0 ? totalTokens / users.length : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">User Usage Limits</h3>
          <p className="text-sm text-gray-500">
            Manage and monitor user usage limits.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-sm rounded ${
              filter === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            All ({users.length})
          </button>
          <button
            onClick={() => setFilter('high')}
            className={`px-3 py-1.5 text-sm rounded ${
              filter === 'high' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            High Usage ({users.filter(u => u.totalTokens > 1_000_000).length})
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatsCard
          title="Total Users"
          value={users.length}
          subtitle="with AI usage"
          icon={<span className="text-lg">👥</span>}
        />
        <StatsCard
          title="Total Tokens"
          value={formatTokens(totalTokens)}
          subtitle="all time"
          icon={<span className="text-lg">📊</span>}
        />
        <StatsCard
          title="Total Cost"
          value={`$${totalCost.toFixed(2)}`}
          subtitle="upstream cost"
          icon={<span className="text-lg">💰</span>}
        />
        <StatsCard
          title="Avg / User"
          value={formatTokens(avgTokens)}
          subtitle="tokens"
          icon={<span className="text-lg">📈</span>}
        />
      </div>

      {/* Users Table */}
      <div className="rounded-lg border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="p-3">User</th>
                <th className="p-3 text-right">API Keys</th>
                <th className="p-3 text-right">Total Tokens</th>
                <th className="p-3 text-right">Cost (USD)</th>
                <th className="p-3 text-right">Last Used</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.userId} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-3">
                    <div className="font-medium">{u.userName || '—'}</div>
                    <div className="text-xs text-gray-500">{u.userEmail}</div>
                  </td>
                  <td className="p-3 text-right font-mono">{u.apiKeyCount}</td>
                  <td className="p-3 text-right font-mono">{formatTokens(u.totalTokens)}</td>
                  <td className="p-3 text-right font-mono">${u.totalCost.toFixed(4)}</td>
                  <td className="p-3 text-right text-xs text-gray-500">
                    {u.lastUsedAt ? new Date(u.lastUsedAt).toLocaleDateString('vi-VN') : '—'}
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => onSetLimit?.(u.userId)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Set Limit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && (
          <p className="p-6 text-center text-gray-500">No users found</p>
        )}
      </div>

      {/* Info */}
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
        <p className="text-sm text-amber-800">
          <strong>Note:</strong> Soft caps are configured per AI Plan. 
          Users with usage exceeding their plan&apos;s soft cap will trigger admin notifications, 
          but requests will continue to be processed.
        </p>
      </div>
    </div>
  )
}
