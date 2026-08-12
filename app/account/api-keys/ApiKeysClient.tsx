'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

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

export default function ApiKeysClient({ initialKeys }: { initialKeys: ApiKey[] }) {
  const router = useRouter()
  const [keys, setKeys] = useState(initialKeys)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [revealedKey, setRevealedKey] = useState<{
    key: string
    name: string
    expiresAt: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

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
    if (!confirm('Xoá key này? Requests hiện tại sẽ fail ngay lập tức.')) return
    try {
      const resp = await fetch(`/api/me/ai-keys/${id}`, { method: 'DELETE' })
      const json = await resp.json()
      if (json.ok) {
        setKeys(keys.filter((k) => k.id !== id))
      } else {
        setError(json.error?.message ?? 'Xoá thất bại')
      }
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="space-y-6">
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
          />
          <Button onClick={createKey} disabled={creating}>
            {creating ? 'Đang tạo...' : 'Tạo key'}
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </Card>

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
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => {
              navigator.clipboard.writeText(revealedKey.key)
              setRevealedKey(null)
            }}
          >
            Copy & đóng
          </Button>
        </Card>
      )}

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">API keys của bạn</h2>
        {keys.length === 0 ? (
          <p className="text-sm text-gray-500">Chưa có API key. Tạo key ở trên.</p>
        ) : (
          <div className="divide-y">
            {keys.map((k) => (
              <div
                key={k.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/account/api-keys/${k.id}/usage`)}
                      className="font-medium hover:underline"
                    >
                      {k.name}
                    </button>
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        k.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {k.status}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    <code className="font-mono">{k.keyMasked}</code> · {k.plan.name} ·{' '}
                    {k.quotaUsedTokens} tokens used
                    {k.expiresAt && (
                      <span> · hạn {new Date(k.expiresAt).toLocaleDateString('vi-VN')}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/account/api-keys/${k.id}/balance`)}
                    className="text-sm text-blue-600 hover:underline"
                    title="Xem balance + models có sẵn"
                  >
                    Balance
                  </button>
                  <button
                    onClick={() => router.push(`/account/api-keys/${k.id}/usage`)}
                    className="text-sm text-blue-600 hover:underline"
                    title="Xem usage"
                  >
                    Usage
                  </button>
                  <button
                    onClick={() => deleteKey(k.id)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Xoá
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="mb-3 text-lg font-semibold">Hướng dẫn sử dụng</h2>
        <p className="mb-3 text-sm text-gray-600">
          Point client AI của bạn vào Kandes — không cần đăng ký NCC/OpenAI trực tiếp.
        </p>
        <pre className="overflow-x-auto rounded bg-gray-50 p-3 font-mono text-xs">
{`# Claude Code
export ANTHROPIC_BASE_URL="https://kandes.shop/api/ai/v1"
export ANTHROPIC_AUTH_TOKEN="${keys[0]?.keyMasked ?? 'ks-xxxxxxxx'}"

# OpenAI client / Codex
export OPENAI_BASE_URL="https://kandes.shop/api/ai/v1"
export OPENAI_API_KEY="${keys[0]?.keyMasked ?? 'ks-xxxxxxxx'}"`}
        </pre>
      </Card>
    </div>
  )
}