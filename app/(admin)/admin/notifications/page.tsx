import { getCurrentUser } from '@/lib/auth'
import { notificationAdmin } from '@/modules/notification/admin'
import { redirect } from 'next/navigation'
import { NotificationsTable } from '@/components/admin/notifications/notifications-table'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Notifications · Admin · Kandes',
  description: 'Notification dashboard: list, filter, retry.',
}

interface PageProps {
  searchParams: {
    status?: string
    channel?: string
    event?: string
    page?: string
  }
}

export default async function NotificationsDashboardPage({ searchParams }: PageProps) {
  const user = await getCurrentUser()
  if (!user || !['admin', 'super_admin'].includes(user.role)) {
    redirect('/admin/login?redirect=/admin/notifications')
  }

  const status = searchParams.status as
    | 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced' | undefined
  const result = await notificationAdmin.listAdmin({
    status: status && ['queued', 'sent', 'delivered', 'failed', 'bounced'].includes(status) ? status : undefined,
    channel: searchParams.channel,
    event: searchParams.event,
    page: searchParams.page ? Number(searchParams.page) : 1,
  })

  return (
    <div className="container-wide py-8 space-y-6">
      <div className="space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric">
          [ ADMIN / NOTIFICATIONS ]
        </span>
        <h1 className="text-display-lg font-display">
          Notifications Dashboard
          <span className="text-electric">.</span>
        </h1>
        <p className="text-[12px] text-ink-200">
          Theo dõi notification đã gửi. Retry các row failed.
        </p>
      </div>

      <NotificationsTable
        rows={result.rows.map((r) => ({
          id: r.id,
          event: r.event,
          channel: r.channel,
          recipient: r.recipient,
          status: r.status,
          attempts: r.attempts,
          maxAttempts: r.maxAttempts,
          error: r.error,
          orderId: r.orderId,
          createdAt: r.createdAt.toISOString(),
          sentAt: r.sentAt?.toISOString() ?? null,
        }))}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        currentStatus={status ?? null}
        currentChannel={searchParams.channel ?? null}
        currentEvent={searchParams.event ?? null}
      />
    </div>
  )
}
