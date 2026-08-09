'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  Key,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Activity,
  DollarSign,
  BarChart3,
  Calendar,
  Clock,
  TrendingUp,
  Zap,
  ShieldCheck,
  ChevronRight,
  Filter,
} from 'lucide-react'

type KeyStatus = 'active' | 'expired' | 'revoked' | 'suspended'
type TimeRange = 'today' | '7days' | '30days' | 'all'

interface DailyEntry {
  date: string
  requests?: number
  input_tokens?: number
  output_tokens?: number
  cache_creation_tokens?: number
  cache_read_tokens?: number
  cache_write_tokens?: number
  total_tokens?: number
  cost?: number
  actual_cost?: number
}

interface UsageSubStats {
  requests: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cacheWrite: number
  cacheRead: number
  cost: number
  avgDurationMs?: number
}

interface ModelStat {
  model: string
  requests: number
  inputTokens: number
  outputTokens: number
  cacheWrite: number
  cacheRead: number
  totalTokens: number
  cost: number
}

interface CheckResult {
  isKandesKey?: boolean
  status: KeyStatus
  statusMessage: string
  mode: string
  daysUntilExpiry: number | null
  expiresAt: string | null
  quota: {
    limit: number
    used: number
    remaining: number
    percent: number
    unit: string
  }
  keyDetails: {
    subscriptionType: string
    remainingQuota: string
    expires: string | null
    daysUntilExpiry: number | null
  }
  usageStats: {
    today: UsageSubStats
    total: UsageSubStats
    rpm: number
    tpm: number
  }
  modelStats: ModelStat[]
  dailyUsage?: DailyEntry[]
  keyName: string
}

function fmt(n: number): string {
  if (n == null || isNaN(n)) return '0'
  return Math.round(n).toLocaleString('vi-VN')
}

function fmtMoney(amount: number, unit = 'USD'): string {
  if (amount == null || isNaN(amount)) return '$0.00'
  if (unit === 'tokens') return `${fmt(amount)} tokens`
  return `$${amount.toFixed(2)}`
}

function fmtDate(iso: string | null): string {
  if (!iso) return 'Không giới hạn'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return iso
  }
}

const RANGE_OPTIONS: { key: TimeRange; label: string }[] = [
  { key: 'today', label: 'Hôm nay' },
  { key: '7days', label: '7 ngày qua' },
  { key: '30days', label: '30 ngày qua' },
  { key: 'all', label: 'Tất cả' },
]

const DEFAULT_STATUS_CFG = {
  label: 'ĐANG HOẠT ĐỘNG',
  badgeBg: 'bg-emerald-500/15',
  textColor: 'text-emerald-400',
  borderColor: 'border-emerald-500/40',
}

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeBg: string; textColor: string; borderColor: string }
> = {
  active: DEFAULT_STATUS_CFG,
  expired: {
    label: 'ĐÃ HẾT HẠN',
    badgeBg: 'bg-red-500/15',
    textColor: 'text-red-400',
    borderColor: 'border-red-500/40',
  },
  revoked: {
    label: 'ĐÃ HỦY',
    badgeBg: 'bg-slate-500/15',
    textColor: 'text-slate-400',
    borderColor: 'border-slate-500/40',
  },
  suspended: {
    label: 'TẠM DỪNG',
    badgeBg: 'bg-amber-500/15',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/40',
  },
}

export default function KeyCheckerPage() {
  const [key, setKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>('today')

  const handleCheck = useCallback(
    async (keyToTest?: string, rangeToTest?: TimeRange) => {
      const targetKey = (keyToTest ?? key).trim()
      if (!targetKey) return
      const targetRange = rangeToTest ?? timeRange

      setLoading(true)
      setError(null)

      try {
        const res = await fetch('/api/tools/key-checker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: targetKey, timeRange: targetRange }),
        })

        const data = await res.json()

        if (!res.ok || !data.ok) {
          setError(
            data.error?.message ??
              data.message ??
              'Không tìm thấy thông tin cho API key này. Vui lòng kiểm tra lại key.'
          )
          return
        }

        setResult(data.data ?? data)
      } catch {
        setError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng.')
      } finally {
        setLoading(false)
      }
    },
    [key, timeRange]
  )

  const handleRangeChange = useCallback(
    (newRange: TimeRange) => {
      setTimeRange(newRange)
      if (key.trim()) {
        handleCheck(key, newRange)
      }
    },
    [key, handleCheck]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !loading) handleCheck()
    },
    [handleCheck, loading]
  )

  /** Compute period stats AND period-filtered model stats instantly on tab switch */
  const periodData = useMemo(() => {
    if (!result) return null
    const daily = result.dailyUsage ?? []
    const today = result.usageStats?.today ?? {
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      cacheWrite: 0,
      cacheRead: 0,
      cost: 0,
    }
    const total = result.usageStats?.total ?? {
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      cacheWrite: 0,
      cacheRead: 0,
      cost: 0,
    }
    const rawModels = result.modelStats ?? []

    let currentStats: UsageSubStats = today
    let periodName = 'Hôm nay'

    if (timeRange === 'today') {
      currentStats = today
      periodName = 'Hôm nay'
    } else if (timeRange === 'all' || daily.length === 0) {
      currentStats = total
      periodName = 'Tất cả thời gian'
    } else {
      const days = timeRange === '7days' ? 7 : 30
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - days)
      cutoff.setHours(0, 0, 0, 0)

      const acc: UsageSubStats = {
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cacheWrite: 0,
        cacheRead: 0,
        cost: 0,
      }

      let found = 0
      for (const entry of daily) {
        if (new Date(entry.date) >= cutoff) {
          acc.requests += Number(entry.requests ?? 0)
          acc.inputTokens += Number(entry.input_tokens ?? 0)
          acc.outputTokens += Number(entry.output_tokens ?? 0)
          acc.totalTokens += Number(entry.total_tokens ?? 0)
          acc.cacheWrite += Number(entry.cache_creation_tokens ?? entry.cache_write_tokens ?? 0)
          acc.cacheRead += Number(entry.cache_read_tokens ?? 0)
          acc.cost += Number(entry.cost ?? entry.actual_cost ?? 0)
          found++
        }
      }

      if (found === 0) {
        currentStats = total
        periodName = `${days} ngày qua (Tổng thể)`
      } else {
        currentStats = acc
        periodName = `${days} ngày gần nhất`
      }
    }

    return { stats: currentStats, periodName, models: rawModels }
  }, [result, timeRange])

  const total = result?.usageStats?.total
  const unit = result?.quota?.unit ?? 'USD'
  const statusCfg: { label: string; badgeBg: string; textColor: string; borderColor: string } =
    (result && STATUS_CONFIG[result.status]) || DEFAULT_STATUS_CFG

  return (
    <div className="min-h-screen bg-[#111827] text-slate-100 pt-8 pb-32">
      <div className="container-narrow max-w-5xl space-y-6">

        {/* ── Main Search Header Card (Modern Sleek Dark Slate) ── */}
        <div className="relative bg-[#1E293B]/90 border border-slate-700/80 p-6 sm:p-8 space-y-6 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative text-center space-y-2">
            <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[11px] font-mono px-3.5 py-1 rounded-full font-semibold">
              <ShieldCheck size={14} className="text-cyan-400" />
              CÔNG CỤ KIỂM TRA KEY
            </div>
            <h1 className="text-[26px] sm:text-[32px] font-display font-bold text-white tracking-tight">
              Kiểm Tra API Key
            </h1>
            <p className="text-[13px] text-slate-300 max-w-md mx-auto leading-relaxed">
              Tra cứu chính xác số dư, hạn ngạch (quota) và chi tiết lịch sử token sử dụng.
            </p>
          </div>

          {/* ── Search Input Box ── */}
          <div className="relative max-w-2xl mx-auto space-y-3">
            <div className="flex items-stretch gap-2.5">
              {/* Input field + eye icon inside */}
              <div className="relative flex-1 flex items-center">
                <Key size={16} className="absolute left-3.5 text-slate-400 pointer-events-none z-10" />
                <input
                  type={showKey ? 'text' : 'password'}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Dán API key vào đây (sk-xxx hoặc ks-xxx)..."
                  className="w-full bg-[#0F172A] border border-slate-600/80 text-white text-[13px] font-mono pl-10 pr-10 py-3.5 placeholder:text-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all rounded-xl shadow-inner"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-3.5 text-slate-400 hover:text-cyan-400 transition-colors p-1"
                  title={showKey ? 'Ẩn key' : 'Hiện key'}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Submit button */}
              <button
                type="button"
                onClick={() => handleCheck()}
                disabled={loading || !key.trim()}
                className="flex items-center gap-2 bg-cyan-400 hover:bg-cyan-300 active:scale-95 text-slate-950 font-display font-bold text-[12px] uppercase tracking-[0.08em] px-6 transition-all rounded-xl disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-lg shadow-cyan-400/20"
              >
                {loading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Search size={15} strokeWidth={2.5} />
                )}
                Kiểm tra
              </button>
            </div>
          </div>
        </div>

        {/* ── Toast Notifications ── */}
        {result && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl text-[12px] font-mono flex items-center gap-2 shadow-sm font-semibold">
            <CheckCircle2 size={15} className="shrink-0" />
            <span>Tải dữ liệu thành công — {result.statusMessage}</span>
          </div>
        )}

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-xl text-[13px] font-mono flex items-start gap-3 shadow-sm">
            <XCircle size={18} className="shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Tra cứu thất bại</div>
              <div className="text-rose-300/90 text-[12px] mt-0.5">{error}</div>
            </div>
          </div>
        )}

        {/* ── Results Dashboard ── */}
        {result && periodData && (
          <div className="space-y-6">

            {/* ── Interactive Date Range Filter Toolbar ── */}
            <div className="bg-[#1E293B]/90 border border-slate-700/80 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-2.5">
                <Filter size={16} className="text-cyan-400" />
                <div>
                  <h2 className="text-[15px] font-display font-bold text-white">
                    Phạm Vi Lọc Thống Kê
                  </h2>
                  <p className="text-[11px] text-slate-300 font-mono mt-0.5">
                    Đang lọc: <span className="font-semibold text-cyan-400">{periodData.periodName}</span> (Cả chỉ số & Bảng Model tự động cập nhật)
                  </p>
                </div>
              </div>

              {/* Segmented Filter Pills */}
              <div className="flex items-center gap-1 bg-[#0F172A] p-1.5 rounded-xl border border-slate-700/80 w-full sm:w-auto">
                {RANGE_OPTIONS.map((opt) => {
                  const active = timeRange === opt.key
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => handleRangeChange(opt.key)}
                      className={`flex-1 sm:flex-none px-4 py-1.5 text-[11px] font-mono uppercase tracking-wider rounded-lg transition-all ${
                        active
                          ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/50 font-bold shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Top Status Cards (Account Status & Quota) ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Account Status Card */}
              <div className="group bg-[#1E293B]/90 border border-slate-700/80 p-6 rounded-2xl space-y-4 relative overflow-hidden hover:border-slate-600 transition-colors shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-slate-300 font-bold flex items-center gap-1.5">
                    <Activity size={13} className="text-slate-400" />
                    TRẠNG THÁI TÀI KHOẢN
                  </span>
                  <span
                    className={`px-3 py-1 text-[10px] font-mono font-bold rounded-full border tracking-[0.08em] ${statusCfg.badgeBg} ${statusCfg.textColor} ${statusCfg.borderColor}`}
                  >
                    {statusCfg.label}
                  </span>
                </div>
                <div>
                  <h3 className="text-[22px] font-display font-bold text-white leading-tight capitalize">
                    {result.mode?.replace(/_/g, ' ')}
                  </h3>
                  <div
                    className={`text-[12px] font-mono mt-1.5 font-medium ${
                      result.status === 'active' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {result.statusMessage}
                  </div>
                </div>
              </div>

              {/* Total Quota Card */}
              <div className="group bg-[#1E293B]/90 border border-slate-700/80 p-6 rounded-2xl space-y-4 relative overflow-hidden hover:border-slate-600 transition-colors shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-slate-300 font-bold flex items-center gap-1.5">
                    <DollarSign size={13} className="text-slate-400" />
                    HẠN NGẠCH TỔNG (QUOTA)
                  </span>
                  <span className="px-2.5 py-0.5 text-[9px] font-mono uppercase tracking-wider bg-slate-700 text-slate-200 border border-slate-600 rounded font-semibold">
                    ĐÃ DÙNG
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[30px] font-display font-bold text-white">
                      {result.quota.percent}%
                    </span>
                    <span className="text-[13px] font-mono text-slate-200 font-bold">
                      {fmtMoney(result.quota.used, unit)} / {fmtMoney(result.quota.limit, unit)}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="relative h-2.5 bg-[#0F172A] rounded-full overflow-hidden border border-slate-700">
                    <div
                      className={`h-full transition-all duration-1000 ease-out rounded-full ${
                        result.quota.percent >= 90
                          ? 'bg-gradient-to-r from-rose-600 to-rose-400'
                          : result.quota.percent >= 70
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                          : 'bg-gradient-to-r from-cyan-400 to-emerald-400'
                      }`}
                      style={{ width: `${Math.max(result.quota.percent, 3)}%` }}
                    />
                  </div>
                  <div className="text-[12px] font-mono text-slate-300">
                    Còn lại:{' '}
                    <span className="text-cyan-400 font-bold font-mono">
                      {fmtMoney(result.quota.remaining, unit)}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* ── Filtered Period Statistics Grid ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-mono uppercase tracking-[0.15em] text-slate-300 font-bold flex items-center gap-1.5">
                  <BarChart3 size={14} className="text-cyan-400" />
                  THỐNG KÊ CHI TIẾT — {periodData.periodName.toUpperCase()}
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                  label={`Số yêu cầu (${periodData.periodName})`}
                  value={fmt(periodData.stats.requests)}
                  accent="emerald"
                  icon={<Zap size={13} />}
                />
                <StatCard
                  label="Token đầu vào"
                  value={fmt(periodData.stats.inputTokens)}
                  accent="emerald"
                />
                <StatCard
                  label="Token đầu ra"
                  value={fmt(periodData.stats.outputTokens)}
                  accent="emerald"
                />
                <StatCard
                  label="Tổng số token"
                  value={fmt(periodData.stats.totalTokens)}
                  accent="emerald"
                  highlight
                />
                <StatCard
                  label="Cache ghi"
                  value={fmt(periodData.stats.cacheWrite)}
                  accent="blue"
                />
                <StatCard
                  label="Cache đọc"
                  value={fmt(periodData.stats.cacheRead)}
                  accent="blue"
                />
                <StatCard
                  label={`Chi phí (${periodData.periodName})`}
                  value={fmtMoney(periodData.stats.cost, unit)}
                  accent="emerald"
                  highlight
                />
                <StatCard
                  label="RPM / TPM hiện tại"
                  value={`${result.usageStats.rpm} / ${fmt(result.usageStats.tpm)}`}
                  accent="purple"
                  icon={<TrendingUp size={13} />}
                />
              </div>
            </div>

            {/* ── Lifetime Summary Grid ── */}
            <div className="space-y-3">
              <h3 className="text-[11px] font-mono uppercase tracking-[0.15em] text-slate-300 font-bold flex items-center gap-1.5">
                <Clock size={14} className="text-amber-400" />
                TỔNG THỂ TOÀN THỜI GIAN
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                  label="Tổng số yêu cầu"
                  value={fmt(total?.requests ?? 0)}
                  accent="amber"
                />
                <StatCard
                  label="Tổng token vào"
                  value={fmt(total?.inputTokens ?? 0)}
                  accent="amber"
                />
                <StatCard
                  label="Tổng token ra"
                  value={fmt(total?.outputTokens ?? 0)}
                  accent="amber"
                />
                <StatCard
                  label="Tổng token toàn thời gian"
                  value={fmt(total?.totalTokens ?? 0)}
                  accent="amber"
                />
                <StatCard
                  label="Tổng cache ghi"
                  value={fmt(total?.cacheWrite ?? 0)}
                  accent="amber"
                />
                <StatCard
                  label="Tổng cache đọc"
                  value={fmt(total?.cacheRead ?? 0)}
                  accent="amber"
                />
                <StatCard
                  label="Tổng chi phí toàn thời gian"
                  value={fmtMoney(total?.cost ?? 0, unit)}
                  accent="amber"
                  highlight
                />
                <StatCard
                  label="Thời gian xử lý TB"
                  value={`${total?.avgDurationMs ?? 0} ms`}
                  accent="purple"
                />
              </div>
            </div>

            {/* ── Key Metadata Section ── */}
            <div className="space-y-3">
              <h3 className="text-[11px] font-mono uppercase tracking-[0.15em] text-slate-300 font-bold flex items-center gap-1.5">
                <Key size={14} className="text-cyan-400" />
                THÔNG TIN KEY & THỜI HẠN
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <DetailCard
                  label="Gói dịch vụ"
                  value={result.keyDetails.subscriptionType?.replace(/_/g, ' ')}
                />
                <DetailCard
                  label="Hạn ngạch còn lại"
                  value={result.keyDetails.remainingQuota}
                  valueClass="text-cyan-400"
                />
                <DetailCard
                  label="Hết hạn"
                  value={fmtDate(result.keyDetails.expires)}
                  sub={
                    result.keyDetails.daysUntilExpiry != null
                      ? `Còn ${result.keyDetails.daysUntilExpiry} ngày sử dụng`
                      : undefined
                  }
                />
              </div>
            </div>

            {/* ── Model Usage Table (Dynamically Filtered by Date Range) ── */}
            {periodData.models && periodData.models.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-mono uppercase tracking-[0.15em] text-slate-300 font-bold flex items-center gap-1.5">
                    <BarChart3 size={14} className="text-cyan-400" />
                    BÁO CÁO SỬ DỤNG THEO MODEL AI ({periodData.periodName.toUpperCase()})
                  </h3>
                  <span className="text-[11px] font-mono text-cyan-400/90 font-semibold">
                    Tự động lọc theo phạm vi
                  </span>
                </div>

                <div className="border border-slate-700/80 bg-[#1E293B]/90 rounded-2xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-700 bg-[#0F172A] text-[10px] font-mono uppercase text-slate-300 tracking-wider">
                          <th className="py-3.5 px-4">Tên Model</th>
                          <th className="py-3.5 px-4 text-right">Yêu Cầu</th>
                          <th className="py-3.5 px-4 text-right">Token Vào</th>
                          <th className="py-3.5 px-4 text-right">Token Ra</th>
                          <th className="py-3.5 px-4 text-right">Cache Ghi</th>
                          <th className="py-3.5 px-4 text-right">Cache Đọc</th>
                          <th className="py-3.5 px-4 text-right">Tổng Token</th>
                          <th className="py-3.5 px-4 text-right">Chi Phí</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50 text-[11px] font-mono">
                        {periodData.models.map((m) => (
                          <tr
                            key={m.model}
                            className="hover:bg-slate-700/40 transition-colors group"
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <ChevronRight
                                  size={12}
                                  className="text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                />
                                <span className="font-bold text-white text-[12px]">
                                  {m.model}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right text-slate-100 font-semibold">
                              {fmt(m.requests)}
                            </td>
                            <td className="py-3.5 px-4 text-right text-slate-300">
                              {fmt(m.inputTokens)}
                            </td>
                            <td className="py-3.5 px-4 text-right text-slate-300">
                              {fmt(m.outputTokens)}
                            </td>
                            <td className="py-3.5 px-4 text-right text-slate-400">
                              {fmt(m.cacheWrite)}
                            </td>
                            <td className="py-3.5 px-4 text-right text-slate-400">
                              {fmt(m.cacheRead)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-white">
                              {fmt(m.totalTokens)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                              {fmtMoney(m.cost, unit)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-slate-600 bg-[#0F172A] text-[11px] font-mono">
                          <td className="py-3.5 px-4 font-bold text-slate-200 uppercase tracking-wider text-[10px]">
                            Tổng cộng ({periodData.periodName})
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-white">
                            {fmt(periodData.models.reduce((a, m) => a + m.requests, 0))}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-white">
                            {fmt(periodData.models.reduce((a, m) => a + m.inputTokens, 0))}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-white">
                            {fmt(periodData.models.reduce((a, m) => a + m.outputTokens, 0))}
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-400">
                            {fmt(periodData.models.reduce((a, m) => a + m.cacheWrite, 0))}
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-400">
                            {fmt(periodData.models.reduce((a, m) => a + m.cacheRead, 0))}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-white">
                            {fmt(periodData.models.reduce((a, m) => a + m.totalTokens, 0))}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-cyan-400 text-sm">
                            {fmtMoney(
                              periodData.models.reduce((a, m) => a + m.cost, 0),
                              unit
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  )
}

/* ── Sub-components for Sleek Slate Cards ── */

interface StatCardProps {
  label: string
  value: string
  accent: 'emerald' | 'amber' | 'blue' | 'purple'
  icon?: React.ReactNode
  highlight?: boolean
}

function StatCard({ label, value, accent, icon, highlight }: StatCardProps) {
  const colorMap = {
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    blue: 'text-sky-400',
    purple: 'text-violet-400',
  }
  const dotMap = {
    emerald: 'bg-emerald-400',
    amber: 'bg-amber-400',
    blue: 'bg-sky-400',
    purple: 'bg-violet-400',
  }
  return (
    <div
      className={`bg-[#1E293B]/80 border rounded-xl p-4 space-y-1.5 relative hover:border-slate-600 transition-all shadow-md ${
        highlight ? 'border-cyan-400/50 ring-1 ring-cyan-400/20' : 'border-slate-700/80'
      }`}
    >
      <span className={`w-2 h-2 rounded-full absolute top-3.5 right-3.5 ${dotMap[accent]}`} />
      <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300 font-semibold">
        {icon}
        {label}
      </div>
      <div
        className={`font-display font-bold leading-tight ${colorMap[accent]} ${
          highlight ? 'text-[19px]' : 'text-[17px]'
        }`}
      >
        {value}
      </div>
    </div>
  )
}

interface DetailCardProps {
  label: string
  value: string
  sub?: string
  valueClass?: string
}

function DetailCard({ label, value, sub, valueClass = 'text-white' }: DetailCardProps) {
  return (
    <div className="bg-[#1E293B]/80 border border-slate-700/80 rounded-xl p-5 space-y-1.5 hover:border-slate-600 transition-colors shadow-md">
      <div className="text-[10px] font-mono text-slate-300 font-bold uppercase tracking-wider">{label}</div>
      <div className={`text-[16px] font-display font-bold ${valueClass} capitalize`}>{value}</div>
      {sub && <div className="text-[11px] font-mono text-slate-400">{sub}</div>}
    </div>
  )
}
