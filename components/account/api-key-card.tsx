'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

type ApiKey = {
  id: string
  name: string
  keyMasked: string
  plan: { name: string; slug: string; quotaTokens?: string }
  status: string
  source: string
  quotaUsedTokens: string
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
  // Balance info (from balance endpoint)
  balance?: {
    nccRemaining: number | null
    nccTotalQuotaUsd: number | null
    nccExpiresAt: string | null
    nccDaysUntilExpiry: number | null
  }
}

type Props = {
  apiKey: ApiKey
  onDelete?: (id: string) => void
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K'
  return num.toString()
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatRelativeTime(date: string | null): string {
  if (!date) return 'Chưa dùng'
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes} phút trước`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} giờ trước`
  const days = Math.floor(hours / 24)
  return `${days} ngày trước`
}

export function ApiKeyCard({ apiKey, onDelete }: Props) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const statusVariant = apiKey.status === 'active' ? 'success' : 'neutral'
  const isExpired = apiKey.expiresAt && new Date(apiKey.expiresAt).getTime() < Date.now()
  const daysUntilExpiry = apiKey.expiresAt
    ? Math.max(0, Math.ceil((new Date(apiKey.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  // Balance calculations — use real plan quota from API, fallback to 0 if missing.
  const quotaUsed = Number(apiKey.quotaUsedTokens) || 0
  const quotaTotal = Math.max(0, Number(apiKey.plan.quotaTokens ?? '0'))
  const balanceRemaining = apiKey.balance?.nccRemaining ?? null
  const balanceTotal = apiKey.balance?.nccTotalQuotaUsd ?? null
  const usagePercentage = quotaTotal > 0 ? Math.min(100, (quotaUsed / quotaTotal) * 100) : 0

  async function performDelete() {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      const resp = await fetch(`/api/me/ai-keys/${apiKey.id}`, { method: 'DELETE' })
      const json = await resp.json()
      if (json.ok) {
        onDelete?.(apiKey.id)
        setDeleteOpen(false)
      } else {
        setDeleteError(json.error?.message ?? 'Xoá thất bại')
        setIsDeleting(false)
      }
    } catch (e) {
      setDeleteError((e as Error).message)
      setIsDeleting(false)
    }
  }

  return (
    <div className="rounded-lg border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-sm">
            {apiKey.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{apiKey.name}</h3>
            <p className="text-xs text-gray-500 font-mono">{apiKey.keyMasked}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant} className={isExpired ? 'bg-red-100 text-red-700' : ''}>
            {isExpired ? 'Hết hạn' : apiKey.status === 'active' ? 'Hoạt động' : apiKey.status}
          </Badge>
          <button
            onClick={() => setShowActions(!showActions)}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-gray-100 text-gray-500"
            aria-label="Actions"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Quick Actions Dropdown */}
      {showActions && (
        <div className="mt-3 rounded-lg border bg-gray-50 p-2 space-y-1">
          <button
            onClick={() => router.push(`/account/api-keys/${apiKey.id}/balance`)}
            className="w-full rounded px-3 py-2 text-left text-sm hover:bg-white transition-colors"
          >
            💰 Xem Balance
          </button>
          <button
            onClick={() => router.push(`/account/api-keys/${apiKey.id}/usage`)}
            className="w-full rounded px-3 py-2 text-left text-sm hover:bg-white transition-colors"
          >
            📊 Xem Usage
          </button>
          <button
            onClick={() => router.push(`/account/api-keys/${apiKey.id}/rotation`)}
            className="w-full rounded px-3 py-2 text-left text-sm hover:bg-white transition-colors"
          >
            ⚙️ Cài đặt Rotation
          </button>
          <div className="my-1 border-t" />
          <button
            onClick={() => {
              setDeleteError(null)
              setDeleteOpen(true)
            }}
            disabled={isDeleting}
            className="w-full rounded px-3 py-2 text-left text-sm text-red-600 hover:bg-white transition-colors disabled:opacity-50"
          >
            🗑️ Xoá Key
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        {/* Quota Usage */}
        <div>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Quota Usage</span>
            <span>
              {formatNumber(quotaUsed)} / {formatNumber(quotaTotal)}
            </span>
          </div>
          <Progress value={usagePercentage} size="sm" />
        </div>

        {/* Balance (if available) */}
        {balanceRemaining !== null && balanceTotal !== null && (
          <div>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Balance USD</span>
              <span className="font-mono font-medium text-gray-900">
                ${balanceRemaining.toFixed(2)} / ${balanceTotal.toFixed(2)}
              </span>
            </div>
            <Progress
              value={(balanceRemaining / balanceTotal) * 100}
              size="sm"
              variant={balanceRemaining / balanceTotal < 0.1 ? 'danger' : 'default'}
            />
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-400" />
            {apiKey.plan.name}
          </span>
          {apiKey.lastUsedAt && (
            <span>Dùng lần cuối: {formatRelativeTime(apiKey.lastUsedAt)}</span>
          )}
        </div>
        {daysUntilExpiry !== null && (
          <span className={daysUntilExpiry < 7 ? 'text-amber-600 font-medium' : ''}>
            {daysUntilExpiry === 0
              ? 'Hết hạn hôm nay'
              : daysUntilExpiry === 1
                ? 'Còn 1 ngày'
                : `Còn ${daysUntilExpiry} ngày`}
            {apiKey.expiresAt && ` · ${formatDate(apiKey.expiresAt)}`}
          </span>
        )}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Xoá API key?"
        message="Mọi request đang dùng key này sẽ fail ngay lập tức. Hành động này không thể hoàn tác."
        confirmLabel="Xoá vĩnh viễn"
        variant="danger"
        busy={isDeleting}
        onConfirm={performDelete}
        onCancel={() => !isDeleting && setDeleteOpen(false)}
      />

      {deleteError && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {deleteError}
        </p>
      )}
    </div>
  )
}
