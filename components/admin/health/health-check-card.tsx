import type { HealthCheck } from '@/modules/health'
import { CheckCircle2, AlertTriangle, XCircle, MinusCircle } from 'lucide-react'

interface Props {
  check: HealthCheck
}

const STATUS_ICON = {
  ok: CheckCircle2,
  warn: AlertTriangle,
  fail: XCircle,
  'n/a': MinusCircle,
} as const

const STATUS_COLOR = {
  ok: 'text-success',
  warn: 'text-warning',
  fail: 'text-error',
  'n/a': 'text-ink-100',
} as const

const STATUS_LABEL = {
  ok: 'OK',
  warn: 'WARN',
  fail: 'FAIL',
  'n/a': 'N/A',
} as const

export function HealthCheckCard({ check }: Props) {
  const Icon = STATUS_ICON[check.status]
  const color = STATUS_COLOR[check.status]
  const label = STATUS_LABEL[check.status]

  return (
    <div className="border border-ink-400 bg-ink-800/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon size={16} strokeWidth={1.5} className={color} aria-hidden />
          <h3 className="text-[13px] font-display text-ink-50 uppercase font-mono">{check.name}</h3>
        </div>
        <span className={`text-[11px] font-mono uppercase tracking-wide ${color}`}>{label}</span>
      </div>

      <p className="text-[12px] text-ink-100 mt-2 leading-relaxed">{check.message}</p>

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-ink-400/30">
        <span className="text-[11px] font-mono text-ink-100">latency: {check.latencyMs}ms</span>
      </div>
    </div>
  )
}
