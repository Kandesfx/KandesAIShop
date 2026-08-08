'use client'

import { useState, useCallback } from 'react'
import {
  Key,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Loader2,
  Shield,
  Zap,
  BarChart3,
  Copy,
} from 'lucide-react'

type KeyStatus = 'active' | 'expired' | 'revoked' | 'suspended'

interface CheckResult {
  status: KeyStatus
  statusMessage: string
  planName: string
  quota: {
    used: number
    total: number
    percent: number
    isOverSoftCap: boolean
  }
  keyName: string
  createdAt: string
  expiresAt: string | null
  lastUsedAt: string | null
}

const STATUS_CONFIG: Record<
  KeyStatus,
  { icon: typeof CheckCircle2; color: string; bg: string; border: string; label: string }
> = {
  active: {
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    label: 'Đang hoạt động',
  },
  expired: {
    icon: Clock,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    label: 'Hết hạn',
  },
  revoked: {
    icon: XCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    label: 'Đã thu hồi',
  },
  suspended: {
    icon: AlertTriangle,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    label: 'Tạm ngưng',
  },
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString('vi-VN')
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(iso))
}

export default function KeyCheckerPage() {
  const [key, setKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCheck = useCallback(async () => {
    const trimmed = key.trim()
    if (!trimmed) return

    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const res = await fetch('/api/tools/key-checker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: trimmed }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error?.message ?? data.message ?? 'Có lỗi xảy ra. Vui lòng thử lại.')
        return
      }

      setResult(data.data ?? data)
    } catch {
      setError('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.')
    } finally {
      setLoading(false)
    }
  }, [key])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !loading) handleCheck()
    },
    [handleCheck, loading]
  )

  const sc = result ? STATUS_CONFIG[result.status] : null
  const StatusIcon = sc?.icon ?? CheckCircle2

  return (
    <div className="min-h-screen bg-ink-900 pt-8 pb-24">
      <div className="container-narrow max-w-2xl">
        {/* Header */}
        <div className="mb-10 space-y-3">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric">
            [ TOOLS / KEY CHECKER ]
          </span>
          <h1 className="text-display-lg font-display text-white">
            Kiểm tra <span className="text-gradient-electric">API Key</span>
          </h1>
          <p className="text-[15px] text-ink-100 leading-relaxed max-w-lg">
            Dán API key (<code className="text-electric text-[13px]">ks-xxx</code>) của bạn vào bên dưới để kiểm tra trạng thái, quota còn lại và thông tin gói.
          </p>
        </div>

        {/* Input card */}
        <div className="border border-ink-400 bg-ink-800 p-6 space-y-4">
          <label className="block space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-200">
              API KEY
            </span>
            <div className="relative">
              <Key
                size={16}
                strokeWidth={1.5}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-200"
                aria-hidden
              />
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="ks-xxxxxxxxxxxxxxxx"
                className="w-full bg-ink-900 border border-ink-300 text-white text-[14px] font-mono pl-11 pr-4 py-3 placeholder:text-ink-200/50 focus:outline-none focus:border-electric/60 focus:ring-1 focus:ring-electric/20 transition-all"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </label>

          <button
            type="button"
            onClick={handleCheck}
            disabled={loading || !key.trim()}
            className="w-full bg-electric text-ink-900 font-display font-bold text-[14px] uppercase tracking-[0.1em] py-3 hover:bg-electric-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all inline-flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" aria-hidden />
                Đang kiểm tra...
              </>
            ) : (
              <>
                <Search size={16} strokeWidth={2} aria-hidden />
                Kiểm tra key
              </>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 border border-red-500/30 bg-red-500/10 p-4 flex items-start gap-3">
            <XCircle size={18} className="text-red-400 shrink-0 mt-0.5" aria-hidden />
            <div>
              <div className="text-[13px] font-semibold text-red-300">Không tìm thấy</div>
              <div className="text-[13px] text-red-200/80 mt-0.5">{error}</div>
            </div>
          </div>
        )}

        {/* Result */}
        {result && sc && (
          <div className="mt-6 space-y-4 animate-slide-in-up">
            {/* Status banner */}
            <div className={`border ${sc.border} ${sc.bg} p-5 flex items-center gap-4`}>
              <div className={`p-2.5 rounded-lg ${sc.bg}`}>
                <StatusIcon size={24} className={sc.color} aria-hidden />
              </div>
              <div className="flex-1">
                <div className={`text-[16px] font-display font-bold ${sc.color}`}>
                  {sc.label}
                </div>
                <div className="text-[13px] text-ink-100 mt-0.5">{result.statusMessage}</div>
              </div>
              <span className={`px-3 py-1 text-[10px] font-mono uppercase tracking-[0.14em] border ${sc.border} ${sc.color}`}>
                {result.status}
              </span>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-ink-400 border border-ink-400">
              {/* Plan */}
              <div className="bg-ink-800 p-5 space-y-1.5">
                <div className="flex items-center gap-2 text-ink-200">
                  <Shield size={14} strokeWidth={1.5} aria-hidden />
                  <span className="text-[10px] font-mono uppercase tracking-[0.16em]">Gói</span>
                </div>
                <div className="text-[16px] font-display font-semibold text-white">
                  {result.planName}
                </div>
              </div>

              {/* Key name */}
              <div className="bg-ink-800 p-5 space-y-1.5">
                <div className="flex items-center gap-2 text-ink-200">
                  <Key size={14} strokeWidth={1.5} aria-hidden />
                  <span className="text-[10px] font-mono uppercase tracking-[0.16em]">Tên key</span>
                </div>
                <div className="text-[14px] font-mono text-white truncate">
                  {result.keyName}
                </div>
              </div>

              {/* Quota */}
              <div className="bg-ink-800 p-5 space-y-3 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-ink-200">
                    <BarChart3 size={14} strokeWidth={1.5} aria-hidden />
                    <span className="text-[10px] font-mono uppercase tracking-[0.16em]">
                      Quota sử dụng
                    </span>
                  </div>
                  <span className="text-[12px] font-mono text-ink-100">
                    {formatTokens(result.quota.used)} / {formatTokens(result.quota.total)} tokens
                  </span>
                </div>
                {/* Progress bar */}
                <div className="relative h-2.5 bg-ink-600 rounded-full overflow-hidden">
                  <div
                    className={`absolute left-0 top-0 h-full rounded-full transition-all duration-700 ${
                      result.quota.percent >= 90
                        ? 'bg-red-500'
                        : result.quota.percent >= 70
                          ? 'bg-amber-500'
                          : 'bg-electric'
                    }`}
                    style={{ width: `${Math.min(result.quota.percent, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-ink-200">{result.quota.percent}% đã dùng</span>
                  {result.quota.isOverSoftCap && (
                    <span className="text-amber-400 inline-flex items-center gap-1">
                      <AlertTriangle size={11} aria-hidden /> Vượt soft cap
                    </span>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="bg-ink-800 p-5 space-y-1.5">
                <div className="flex items-center gap-2 text-ink-200">
                  <Zap size={14} strokeWidth={1.5} aria-hidden />
                  <span className="text-[10px] font-mono uppercase tracking-[0.16em]">Sử dụng gần nhất</span>
                </div>
                <div className="text-[13px] text-white font-mono">
                  {result.lastUsedAt ? formatDate(result.lastUsedAt) : '— Chưa sử dụng'}
                </div>
              </div>

              <div className="bg-ink-800 p-5 space-y-1.5">
                <div className="flex items-center gap-2 text-ink-200">
                  <Clock size={14} strokeWidth={1.5} aria-hidden />
                  <span className="text-[10px] font-mono uppercase tracking-[0.16em]">Hết hạn</span>
                </div>
                <div className={`text-[13px] font-mono ${result.status === 'expired' ? 'text-amber-400' : 'text-white'}`}>
                  {result.expiresAt ? formatDate(result.expiresAt) : '— Không giới hạn'}
                </div>
              </div>
            </div>

            {/* Security notice */}
            <div className="border border-ink-400 bg-ink-800/50 p-4 flex items-start gap-3 text-[12px] text-ink-200">
              <Shield size={14} strokeWidth={1.5} className="text-electric shrink-0 mt-0.5" aria-hidden />
              <span>
                Kết quả kiểm tra được trả về qua kênh mã hóa. Kandes không lưu trữ key bạn nhập — key chỉ được hash để tra cứu và bị xóa ngay sau khi trả kết quả.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
