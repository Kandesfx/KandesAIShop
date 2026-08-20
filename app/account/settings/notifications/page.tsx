import { getCurrentUser } from '@/lib/auth'
import { accountNotificationsService } from '@/modules/account/notifications'
import { NotificationPrefsForm } from '@/components/account/notification-prefs-form'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Cài đặt thông báo · Kandes',
  description: 'Quản lý thông báo sự kiện qua Email từ Kandes Shop.',
}

export default async function NotificationSettingsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/account/settings/notifications')

  const prefs = await accountNotificationsService.getPrefs(user.id)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-display-lg font-display">Cài đặt thông báo</h1>
        <p className="text-body-sm text-ink-200 mt-1">
          Lựa chọn các sự kiện bạn muốn nhận thông báo qua Email
        </p>
      </header>

      <NotificationPrefsForm
        initialPrefs={prefs}
        userEmail={user.email ?? ''}
      />
    </div>
  )
}
