'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ApiKeyCard } from '@/components/account/api-key-card'

type BalanceInfo = {
  nccRemaining: number | null
  nccTotalQuotaUsd: number | null
  nccExpiresAt: string | null
  nccDaysUntilExpiry: number | null
}

type ApiKey = {
  id: string
  name: string
  keyMasked: string
  plan: { name: string; slug: string }
  status: string
  source: string
  quotaUsedTokens: string
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
}

type ApiKeyWithBalance = ApiKey & { balance?: BalanceInfo }

export default function ApiKeysClient({ initialKeys }: { initialKeys: ApiKey[] }) {
  const router = useRouter()
  const [keys, setKeys] = useState<ApiKeyWithBalance[]>(initialKeys)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [revealedKey, setRevealedKey] = useState<{
    key: string
    name: string
    expiresAt: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingBalances, setLoadingBalances] = useState<Set<string>>(new Set())

  // Fetch balance for a single key
  async function fetchBalance(keyId: string): Promise<BalanceInfo | undefined> {
    try {
      const resp = await fetch(`/api/me/ai-keys/${keyId}/balance`, { cache: 'no-store' })
      const json = await resp.json()
      if (json.ok && json.data) {
        return {
          nccRemaining: json.data.nccRemaining,
          nccTotalQuotaUsd: json.data.nccTotalQuotaUsd,
          nccExpiresAt: json.data.nccExpiresAt,
          nccDaysUntilExpiry: json.data.nccDaysUntilExpiry,
        }
      }
    } catch {
      // Silently fail - balance is optional
    }
    return undefined
  }

  // Load balances for all keys
  async function loadAllBalances() {
    setLoadingBalances(new Set(keys.map((k) => k.id)))
    const updatedKeys = await Promise.all(
      keys.map(async (key) => {
        const balance = await fetchBalance(key.id)
        return { ...key, balance }
      })
    )
    setKeys(updatedKeys)
    setLoadingBalances(new Set())
  }

  // Load balances on mount
  useEffect(() => {
    const timer = setTimeout(loadAllBalances, 100)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function createKey() {
    if (!newKeyName.trim()) {
      setError('Vui lòng nhập tên key')
      return
    }
    setError(null)
    setCreating(true)
    try {
      const resp = await fetch('/api/me/ai-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      })
      const json = await resp.json()
      if (!json.ok) {
        setError(json.error?.message ?? 'Tạo key thất bại')
      } else {
        setRevealedKey({
          key: json.data.key,
          name: json.data.name,
          expiresAt: json.data.expiresAt,
        })
        setNewKeyName('')
        router.refresh()
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setCreating(false)
    }
  }

  async function deleteKey(id: string) {
    setKeys(keys.filter((k) => k.id !== id))
    try {
      const resp = await fetch(`/api/me/ai-keys/${id}`, { method: 'DELETE' })
      const json = await resp.json()
      if (!json.ok) {
        setError(json.error?.message ?? 'Xoá thất bại')
        // Restore key if delete failed
        router.refresh()
      }
    } catch (e) {
      setError((e as Error).message)
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      {/* Create Key Section */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Tạo API key mới</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="VD: Claude Code laptop"
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
            disabled={creating}
            onKeyDown={(e) => e.key === 'Enter' && createKey()}
          />
          <Button onClick={createKey} disabled={creating}>
            {creating ? 'Đang tạo...' : 'Tạo key'}
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </Card>

      {/* Revealed Key Warning */}
      {revealedKey && (
        <Card className="border-green-200 bg-green-50 p-6">
          <h3 className="mb-2 font-semibold text-green-900">API key mới — lưu ngay!</h3>
          <p className="mb-3 text-sm text-green-800">
            Key chỉ hiển thị 1 lần. Copy và lưu vào nơi an toàn (keychain, .env...).
          </p>
          <pre className="overflow-x-auto rounded bg-white p-3 font-mono text-sm">
            {revealedKey.key}
          </pre>
          <p className="mt-2 text-xs text-gray-600">
            Hạn: {new Date(revealedKey.expiresAt).toLocaleString('vi-VN')}
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(revealedKey.key)
              }}
            >
              📋 Copy Key
            </Button>
            <Button variant="outline" onClick={() => setRevealedKey(null)}>
              Đóng
            </Button>
          </div>
        </Card>
      )}

      {/* API Keys List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">API keys của bạn</h2>
          <div className="flex items-center gap-2">
            {loadingBalances.size > 0 && (
              <span className="text-xs text-gray-500">Đang tải balance...</span>
            )}
            <button
              onClick={loadAllBalances}
              disabled={loadingBalances.size > 0}
              className="text-sm text-blue-600 hover:underline disabled:opacity-50"
            >
              🔄 Cập nhật
            </button>
          </div>
        </div>

        {keys.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">Chưa có API key. Tạo key ở trên.</p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
            {keys.map((k) => (
              <ApiKeyCard
                key={k.id}
                apiKey={k}
                onDelete={deleteKey}
              />
            ))}
          </div>
        )}
      </div>

      {/* Usage Instructions */}
      <Card className="p-6">
        <h2 className="mb-3 text-lg font-semibold">Hướng dẫn sử dụng</h2>
        <p className="mb-3 text-sm text-gray-600">
          Point client AI của bạn vào Kandes — không cần đăng ký NCC/OpenAI trực tiếp.
        </p>
        <pre className="overflow-x-auto rounded bg-gray-50 p-3 font-mono text-xs">
{`# Claude Code
export ANTHROPIC_BASE_URL="https://kandes.shop/api/ai/v1"
export ANTHROPIC_AUTH_TOKEN="ks-xxxxxxxx"

# OpenAI client / Codex
export OPENAI_BASE_URL="https://kandes.shop/api/ai/v1"
export OPENAI_API_KEY="ks-xxxxxxxx"`}
        </pre>
      </Card>
    </div>
  )
}
