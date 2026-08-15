import { healthService } from '@/modules/health'
import { HealthCheckCard } from '@/components/admin/health/health-check-card'

export const dynamic = 'force-dynamic'

export default async function AdminHealthPage() {
  const summary = await healthService.runAll()

  return (
    <div className="container-narrow py-8 space-y-6">
      <div className="space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric">
          [ ADMIN / HEALTH ]
        </span>
        <h1 className="text-display-lg font-display">
          Health Check
          <span className="text-electric">.</span>
        </h1>
        <p className="text-[12px] text-ink-200">
          Trạng thái subsystems — kiểm tra lúc {new Date(summary.checkedAt).toLocaleString('vi-VN')}
          .
        </p>
      </div>

      <OverallBanner status={summary.overall} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {summary.checks.map((check) => (
          <HealthCheckCard key={check.name} check={check} />
        ))}
      </div>
    </div>
  )
}

function OverallBanner({ status }: { status: string }) {
  const styles = {
    ok: 'border-success/50 bg-success/10 text-success',
    warn: 'border-warning/50 bg-warning/10 text-warning',
    fail: 'border-error/50 bg-error/10 text-error',
    'n/a': 'border-ink-400 bg-ink-800/40 text-ink-200',
  } as const
  const labels = {
    ok: 'ALL SYSTEMS GO',
    warn: 'CÓ CẢNH BÁO',
    fail: 'CÓ LỖI',
    'n/a': 'CHƯA SẴN SÀNG',
  } as const
  return (
    <div className={`border ${styles[status as keyof typeof styles]} p-4`}>
      <p className="text-[10px] font-mono uppercase tracking-[0.2em]">
        {labels[status as keyof typeof labels]}
      </p>
      <p className="text-display-md font-display mt-1">{status.toUpperCase()}</p>
    </div>
  )
}
