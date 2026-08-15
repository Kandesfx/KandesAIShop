import { db } from '@/lib/db'
import { auditService } from '@/modules/audit'
import { AuditLogsList } from '@/components/admin/audit/audit-logs-list'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: {
    page?: string
    action?: string
    actorId?: string
    resourceType?: string
    from?: string
    to?: string
  }
}

export default async function AdminAuditPage({ searchParams }: PageProps) {
  const page = Number(searchParams.page) || 1
  const limit = 20

  const [list, distinctActions] = await Promise.all([
    auditService.listLogs({
      page,
      limit,
      action: searchParams.action,
      actorId: searchParams.actorId,
      resourceType: searchParams.resourceType,
      from: searchParams.from,
      to: searchParams.to,
    }),
    auditService.listActions(),
  ])

  // Lấy distinct actor names (best-effort, không cần exact)
  void db // tránh unused

  return (
    <div className="container-narrow py-8 space-y-6">
      <div className="space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric">
          [ ADMIN / AUDIT LOGS ]
        </span>
        <h1 className="text-display-lg font-display">
          Audit Logs
          <span className="text-electric">.</span>
        </h1>
        <p className="text-[12px] text-ink-200">Lịch sử thao tác admin — {list.total} bản ghi.</p>
      </div>

      <AuditLogsList
        initialData={list}
        actions={distinctActions}
        currentFilters={{
          action: searchParams.action,
          actorId: searchParams.actorId,
          resourceType: searchParams.resourceType,
          from: searchParams.from,
          to: searchParams.to,
        }}
      />
    </div>
  )
}
