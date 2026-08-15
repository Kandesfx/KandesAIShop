'use client'

import * as React from 'react'
import { StatsCard } from '@/components/charts/stats-card'

type RotationStats = {
  totalApiKeys: number
  autoRotation: number
  pinnedKeys: number
  byUser: {
    userId: string
    userEmail: string
    userName: string | null
    apiKeyCount: number
    pinnedCount: number
  }[]
}

type RotationStatsProps = {
  stats: RotationStats
}

export function RotationStats({ stats }: RotationStatsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Rotation Strategy Overview</h3>
        <p className="text-sm text-gray-500">
          Monitor how API keys are configured for load balancing.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatsCard
          title="Total API Keys"
          value={stats.totalApiKeys}
          subtitle="Active API keys"
          icon={<span className="text-lg">🔑</span>}
        />
        <StatsCard
          title="Auto Rotation"
          value={stats.autoRotation}
          subtitle={`${((stats.autoRotation / stats.totalApiKeys) * 100).toFixed(0)}% of keys`}
          variant="success"
          icon={<span className="text-lg">🔄</span>}
        />
        <StatsCard
          title="Pinned Keys"
          value={stats.pinnedKeys}
          subtitle={`${((stats.pinnedKeys / stats.totalApiKeys) * 100).toFixed(0)}% of keys`}
          variant="default"
          icon={<span className="text-lg">📌</span>}
        />
      </div>

      {/* By User */}
      {stats.byUser.length > 0 && (
        <div className="rounded-lg border bg-white">
          <div className="border-b p-4">
            <h3 className="font-semibold">By User</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="p-3">User</th>
                  <th className="p-3 text-right">API Keys</th>
                  <th className="p-3 text-right">Pinned</th>
                  <th className="p-3 text-right">Auto</th>
                </tr>
              </thead>
              <tbody>
                {stats.byUser.map((u) => (
                  <tr key={u.userId} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-medium">{u.userName || '—'}</div>
                      <div className="text-xs text-gray-500">{u.userEmail}</div>
                    </td>
                    <td className="p-3 text-right font-mono">{u.apiKeyCount}</td>
                    <td className="p-3 text-right font-mono">{u.pinnedCount}</td>
                    <td className="p-3 text-right font-mono">{u.apiKeyCount - u.pinnedCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <h4 className="font-medium text-blue-900 mb-2">How Rotation Works</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Auto (default):</strong> Kandes selects the NCC key with highest balance for each request</li>
          <li>• <strong>Pinned:</strong> User manually selects a specific NCC key for dedicated use</li>
          <li>• Pinned keys with exhausted balance will fail requests</li>
          <li>• Auto rotation ensures even load distribution across your NCC key pool</li>
        </ul>
      </div>
    </div>
  )
}
