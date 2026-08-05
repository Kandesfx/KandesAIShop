import { getCurrentUser } from '@/lib/auth'
import { accountNotificationsService } from '@/modules/account/notifications'
import { NotificationPrefsForm } from '@/components/account/notification-prefs-form'
import { env } from '@/lib/env'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Notification Settings · Kandes',
  description: 'Choose how Kandes notifies you.',
}

export default async function NotificationSettingsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/account/settings/notifications')

  const prefs = await accountNotificationsService.getPrefs(user.id)

  const telegramBotLink =
    env.TELEGRAM_BOT_TOKEN && process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
      ? `https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME}?start=${encodeURIComponent(user.email ?? 'optin')}`
      : null

  const zaloOALink = process.env.NEXT_PUBLIC_ZALO_OA_URL ?? null

  return (
    <div className="container-narrow py-8 space-y-6">
      <div className="space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric">
          [ ACCOUNT / SETTINGS / NOTIFICATIONS ]
        </span>
        <h1 className="text-display-lg font-display">
          Notification Preferences
          <span className="text-electric">.</span>
        </h1>
        <p className="text-[12px] text-ink-200">
          Chọn kênh bạn muốn nhận thông báo. Mặc định: chỉ email.
        </p>
      </div>

      <NotificationPrefsForm
        initialPrefs={prefs}
        telegramBotLink={telegramBotLink}
        zaloOALink={zaloOALink}
        userEmail={user.email ?? ''}
        currentTelegramChatId={Boolean(user)}
        currentZaloUserId={Boolean(user)}
      />
    </div>
  )
}
