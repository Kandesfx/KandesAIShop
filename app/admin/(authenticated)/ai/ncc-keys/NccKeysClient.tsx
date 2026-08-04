'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
  const [keys, setKeys] = useState(initialKeys)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({
    provider: 'ccpro',
    apiKey: '',
    totalQuotaUsd: 10,
    nickname: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [testing, setTesting] = useState<string | null>(null)

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

  return (
    <div className="space-y-6">
      <div className="rounded border bg-white p-6">
        <h2 className="mb-3 text-lg font-semibold">Thêm NCC key</h2>
        <div className="grid grid-cols-2 gap-3">
          <select
            value={form.provider}
            onChange={(e) => setForm({ ...form, provider: e.target.value })}
            className="rounded border-gray-300 px-3 py-2 text-sm"
          >
            <option value="ccpro">ccpro</option>
          </select>
          <input
            type="text"
            placeholder="Nickname (optional)"
            value={form.nickname}
            onChange={(e) => setForm({ ...form, nickname: e.target.value })}
            className="rounded border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="password"
            placeholder="NCC API key (plaintext)"
            value={form.apiKey}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            className="col-span-2 rounded border-gray-300 px-3 py-2 text-sm font-mono"
          />
          <input
            type="number"
            min={1}
            value={form.totalQuotaUsd}
            onChange={(e) => setForm({ ...form, totalQuotaUsd: Number(e.target.value) })}
            className="rounded border-gray-300 px-3 py-2 text-sm"
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

      <div className="rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-left">
            <tr>
              <th className="p-3">Nickname</th>
              <th className="p-3">Provider</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3 text-right">Remaining</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-right">Last sync</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{k.nickname ?? <span className="text-gray-400">—</span>}</td>
                <td className="p-3 font-mono text-xs">{k.provider}</td>
                <td className="p-3 text-right font-mono">${k.totalQuotaUsd.toFixed(2)}</td>
                <td className="p-3 text-right font-mono">${k.remainingUsd.toFixed(2)}</td>
                <td className="p-3 text-center">
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      k.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : k.status === 'low_balance'
                          ? 'bg-yellow-100 text-yellow-800'
                          : k.status === 'exhausted'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {k.status}
                  </span>
                </td>
                <td className="p-3 text-right text-xs text-gray-500">
                  {k.lastSyncedAt ? new Date(k.lastSyncedAt).toLocaleString('vi-VN') : '—'}
                </td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => testConnection(k.id)}
                    disabled={testing === k.id}
                    className="mr-2 text-xs text-blue-600 hover:underline"
                  >
                    {testing === k.id ? 'Testing...' : 'Test'}
                  </button>
                  <button
                    onClick={() => toggleStatus(k.id, k.status)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    {k.status === 'disabled' ? 'Enable' : 'Disable'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {keys.length === 0 && (
          <p className="p-6 text-center text-sm text-gray-500">
            Pool rỗng. Thêm NCC key ở trên.
          </p>
        )}
      </div>
    </div>
  )
}