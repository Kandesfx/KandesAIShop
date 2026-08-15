'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'

type RotationPolicy = 'auto' | 'pinned'

type NccKey = {
  id: string
  nickname: string | null
  remainingUsd: number
  totalQuotaUsd: number
}

type ApiKey = {
  id: string
  name: string
  rotationPolicy: RotationPolicy
  pinnedNccKeyId: string | null
  pinnedNccKey: NccKey | null
}

type RotationSettingsProps = {
  apiKey: ApiKey
  onUpdate?: (updated: ApiKey) => void
}

export function RotationSettings({ apiKey, onUpdate }: RotationSettingsProps) {
  const [policy, setPolicy] = React.useState<RotationPolicy>(apiKey.rotationPolicy)
  const [pinnedKeyId, setPinnedKeyId] = React.useState<string>(apiKey.pinnedNccKeyId || '')
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleSave() {
    setError(null)
    setSaving(true)

    try {
      const resp = await fetch(`/api/me/ai-keys/${apiKey.id}/rotation`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rotationPolicy: policy,
          pinnedNccKeyId: policy === 'pinned' ? pinnedKeyId : null,
        }),
      })

      const json = await resp.json()

      if (!json.ok) {
        setError(json.error?.message || 'Update failed')
      } else {
        onUpdate?.(json.data)
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = policy !== apiKey.rotationPolicy || 
    (policy === 'pinned' && pinnedKeyId !== apiKey.pinnedNccKeyId) ||
    (policy === 'auto' && apiKey.pinnedNccKeyId !== null)

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-1">Rotation Policy</h3>
        <p className="text-sm text-gray-500">
          Chọn cách Kandes chọn NCC key để forward requests.
        </p>
      </div>

      {/* Policy Selection */}
      <div className="space-y-3">
        <label className="flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50">
          <input
            type="radio"
            name="rotation-policy"
            value="auto"
            checked={policy === 'auto'}
            onChange={() => setPolicy('auto')}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">Auto (Recommended)</span>
              <span className="text-xs rounded bg-green-100 text-green-700 px-2 py-0.5">Default</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Kandes tự động chọn NCC key có balance cao nhất cho mỗi request.
              Đảm bảo phân phối tải đều và không bị giới hạn bởi 1 key.
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50">
          <input
            type="radio"
            name="rotation-policy"
            value="pinned"
            checked={policy === 'pinned'}
            onChange={() => setPolicy('pinned')}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">Pinned</span>
              <span className="text-xs rounded bg-blue-100 text-blue-700 px-2 py-0.5">Dedicated</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Chỉ dùng 1 NCC key cụ thể. Phù hợp khi bạn muốn theo dõi chi phí riêng
              cho key đó.
            </p>
          </div>
        </label>
      </div>

      {/* Pinned Key Selection */}
      {policy === 'pinned' && (
        <div className="p-4 rounded-lg border bg-gray-50">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select NCC Key
          </label>
          <select
            value={pinnedKeyId}
            onChange={(e) => setPinnedKeyId(e.target.value)}
            className="w-full rounded border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">— Select a key —</option>
            {apiKey.pinnedNccKey && (
              <option value={apiKey.pinnedNccKey.id}>
                {apiKey.pinnedNccKey.nickname || apiKey.pinnedNccKey.id}
                {' '}
                (${apiKey.pinnedNccKey.remainingUsd.toFixed(2)} remaining)
              </option>
            )}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Chỉ hiển thị NCC keys bạn đã có quyền truy cập.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Save Button */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-sm text-gray-500">
          {hasChanges ? 'Bạn có thay đổi chưa lưu' : 'No pending changes'}
        </p>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saving || (policy === 'pinned' && !pinnedKeyId)}
          isLoading={saving}
        >
          Save Changes
        </Button>
      </div>
    </div>
  )
}
