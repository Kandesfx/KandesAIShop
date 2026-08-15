'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BulkImportModal } from '@/components/admin/ai/bulk-import-modal'

type NccKey = {
  id: string
  provider: string
  totalQuotaUsd: number
  remainingUsd: number
  nickname: string | null
  status: 'active' | 'low_balance' | 'exhausted' | 'disabled'
  lastSyncedAt: string | null
  createdAt: string
}

export default function NccKeysClient({ initialKeys }: { initialKeys: NccKey[] }) {
  const router = useRouter()
  const [keys, setKeys] = React.useState(initialKeys)
  const [adding, setAdding] = React.useState(false)
  const [showBulkImport, setShowBulkImport] = React.useState(false)
  const [form, setForm] = React.useState({
    provider: 'ccpro',
    apiKey: '',
    totalQuotaUsd: 10,
    nickname: '',
  })
  const [error, setError] = React.useState<string | null>(null)
  const [testing, setTesting] = React.useState<string | null>(null)
  const [syncing, setSyncing] = React.useState<string | null>(null)

  async function addKey() {
    setError(null)
    if (!form.apiKey.trim()) {
      setError('Vui lòng nhập API key')
      return
    }
    setAdding(true)
    try {
      const resp = await fetch('/api/admin/ai/ncc-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: form.provider,
          apiKey: form.apiKey.trim(),
          totalQuotaUsd: form.totalQuotaUsd,
          nickname: form.nickname.trim() || undefined,
        }),
      })
      const json = await resp.json()
      if (!json.ok) {
        setError(json.error?.message ?? 'Add failed')
      } else {
        setForm({ provider: 'ccpro', apiKey: '', totalQuotaUsd: 10, nickname: '' })
        router.refresh()
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setAdding(false)
    }
  }

  async function testConnection(id: string) {
    setTesting(id)
    try {
      const resp = await fetch(`/api/admin/ai/ncc-keys/${id}/test`, { method: 'POST' })
      const json = await resp.json()
      if (json.ok) {
        alert(`OK — ${json.data.message} (${json.data.latencyMs}ms)`)
      } else {
        alert(`FAIL — ${json.error?.message}`)
      }
    } catch (e) {
      alert(`Error: ${(e as Error).message}`)
    } finally {
      setTesting(null)
    }
  }

  async function syncKey(id: string) {
    setSyncing(id)
    try {
      const resp = await fetch(`/api/admin/ai/ncc-keys/${id}/sync`, { method: 'POST' })
      const json = await resp.json()
      if (json.ok) {
        alert(`Sync OK — Remaining: $${json.data.remainingUsd?.toFixed(2)}`)
        router.refresh()
      } else {
        alert(`Sync FAIL — ${json.error?.message}`)
      }
    } catch (e) {
      alert(`Error: ${(e as Error).message}`)
    } finally {
      setSyncing(null)
    }
  }

  async function toggleStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'disabled' ? 'active' : 'disabled'
    try {
      const resp = await fetch(`/api/admin/ai/ncc-keys/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await resp.json()
      if (json.ok) {
        setKeys(keys.map((k) => (k.id === id ? { ...k, status: newStatus as NccKey['status'] } : k)))
      } else {
        alert(`Update failed: ${json.error?.message}`)
      }
    } catch (e) {
      alert(`Error: ${(e as Error).message}`)
    }
  }

  async function deleteKey(id: string, nickname: string | null) {
    if (!confirm(`Xoá key "${nickname || id}"?`)) return
    try {
      const resp = await fetch(`/api/admin/ai/ncc-keys/${id}`, { method: 'DELETE' })
      const json = await resp.json()
      if (json.ok) {
        setKeys(keys.filter((k) => k.id !== id))
      } else {
        alert(`Delete failed: ${json.error?.message}`)
      }
    } catch (e) {
      alert(`Error: ${(e as Error).message}`)
    }
  }

  // Calculate summary stats
  const stats = {
    total: keys.length,
    active: keys.filter(k => k.status === 'active').length,
    lowBalance: keys.filter(k => k.status === 'low_balance').length,
    exhausted: keys.filter(k => k.status === 'exhausted').length,
    totalRemaining: keys.reduce((sum, k) => sum + (k.remainingUsd || 0), 0),
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-lg border bg-ink-800 p-4">
          <p className="text-sm text-ink-300">Tổng Keys</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="rounded-lg border bg-green-50 p-4">
          <p className="text-sm text-green-600">Active</p>
          <p className="text-2xl font-bold text-green-700">{stats.active}</p>
        </div>
        <div className="rounded-lg border bg-yellow-50 p-4">
          <p className="text-sm text-yellow-600">Low Balance</p>
          <p className="text-2xl font-bold text-yellow-700">{stats.lowBalance}</p>
        </div>
        <div className="rounded-lg border bg-red-50 p-4">
          <p className="text-sm text-red-600">Exhausted</p>
          <p className="text-2xl font-bold text-red-700">{stats.exhausted}</p>
        </div>
        <div className="rounded-lg border bg-blue-50 p-4">
          <p className="text-sm text-blue-600">Total Remaining</p>
          <p className="text-2xl font-bold text-blue-700">${stats.totalRemaining.toFixed(2)}</p>
        </div>
      </div>

      {/* Add Key Section */}
      <div className="rounded-lg border bg-ink-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Thêm NCC key</h2>
          <Button variant="outline" onClick={() => setShowBulkImport(true)}>
            📥 Bulk Import
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <select
            value={form.provider}
            onChange={(e) => setForm({ ...form, provider: e.target.value })}
            className="rounded border-ink-400 px-3 py-2 text-sm"
          >
            <option value="ccpro">ccpro</option>
          </select>
          <input
            type="text"
            placeholder="Nickname (optional)"
            value={form.nickname}
            onChange={(e) => setForm({ ...form, nickname: e.target.value })}
            className="rounded border-ink-400 px-3 py-2 text-sm"
          />
          <input
            type="password"
            placeholder="NCC API key (plaintext)"
            value={form.apiKey}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            className="col-span-2 rounded border-ink-400 px-3 py-2 text-sm font-mono"
          />
          <input
            type="number"
            min={1}
            value={form.totalQuotaUsd}
            onChange={(e) => setForm({ ...form, totalQuotaUsd: Number(e.target.value) })}
            className="rounded border-ink-400 px-3 py-2 text-sm"
          />
          <button
            onClick={addKey}
            disabled={adding}
            className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {adding ? 'Đang thêm...' : 'Thêm key'}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {/* Keys Table */}
      <div className="rounded-lg border bg-ink-800">
        <table className="w-full text-sm">
          <thead className="border-b bg-ink-900 text-left">
            <tr>
              <th className="p-3">Nickname</th>
              <th className="p-3">Provider</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3 text-right">Remaining</th>
              <th className="p-3 text-right">Usage %</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-right">Last sync</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => {
              const usagePct = k.totalQuotaUsd > 0
                ? ((k.totalQuotaUsd - k.remainingUsd) / k.totalQuotaUsd * 100).toFixed(1)
                : '0'
              const usageColor = Number(usagePct) > 80 ? 'text-red-600' : Number(usagePct) > 50 ? 'text-yellow-600' : 'text-green-600'

              return (
                <tr key={k.id} className="border-b last:border-0 hover:bg-ink-900">
                  <td className="p-3 font-medium">
                    {k.nickname ?? <span className="text-ink-300 italic">—</span>}
                  </td>
                  <td className="p-3 font-mono text-xs">{k.provider}</td>
                  <td className="p-3 text-right font-mono">${k.totalQuotaUsd.toFixed(2)}</td>
                  <td className="p-3 text-right font-mono font-medium">${k.remainingUsd.toFixed(2)}</td>
                  <td className={`p-3 text-right font-mono ${usageColor}`}>{usagePct}%</td>
                  <td className="p-3 text-center">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        k.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : k.status === 'low_balance'
                            ? 'bg-yellow-100 text-yellow-800'
                            : k.status === 'exhausted'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-ink-800 text-ink-100'
                      }`}
                    >
                      {k.status === 'active' ? '🟢 Active' :
                       k.status === 'low_balance' ? '🟡 Low' :
                       k.status === 'exhausted' ? '🔴 Empty' : '⭕ Disabled'}
                    </span>
                  </td>
                  <td className="p-3 text-right text-xs text-ink-300">
                    {k.lastSyncedAt ? new Date(k.lastSyncedAt).toLocaleString('vi-VN') : '—'}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => syncKey(k.id)}
                        disabled={syncing === k.id}
                        className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                        title="Sync balance"
                      >
                        {syncing === k.id ? '...' : '🔄'}
                      </button>
                      <button
                        onClick={() => testConnection(k.id)}
                        disabled={testing === k.id}
                        className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                      >
                        {testing === k.id ? '...' : 'Test'}
                      </button>
                      <button
                        onClick={() => toggleStatus(k.id, k.status)}
                        className="text-xs text-ink-200 hover:underline"
                      >
                        {k.status === 'disabled' ? 'Enable' : 'Disable'}
                      </button>
                      <button
                        onClick={() => deleteKey(k.id, k.nickname)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {keys.length === 0 && (
          <div className="p-8 text-center">
            <div className="text-4xl mb-2">📦</div>
            <p className="text-ink-300">Pool rỗng. Thêm NCC key ở trên hoặc dùng Bulk Import.</p>
          </div>
        )}
      </div>

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}
