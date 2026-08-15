import { notFound } from 'next/navigation'
import { settingsService, getCategoryDef } from '@/modules/settings'
import { SettingsForm } from '@/components/admin/settings/settings-form'
import { TestTelegramButton } from '@/components/admin/settings/test-telegram-button'
import { TestZaloButton } from '@/components/admin/settings/test-zalo-button'
import { TestSmsButton } from '@/components/admin/settings/test-sms-button'
import { TestVoiceButton } from '@/components/admin/settings/test-voice-button'

export const dynamic = 'force-dynamic'

export default async function NotificationsSettingsPage() {
  const def = getCategoryDef('notifications')
  if (!def) notFound()
  const view = await settingsService.getCategory('notifications')

  const telegramEnabled = Boolean(view.values['notification.telegramEnabled'])
  const zaloEnabled = Boolean(view.values['notification.zaloEnabled'])
  const smsEnabled = Boolean(view.values['notification.smsEnabled'])
  const voiceEnabled = Boolean(view.values['notification.voiceEnabled'])

  return (
    <>
      <div className="space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric">
          [ SETTINGS / NOTIFICATIONS ]
        </span>
        <h1 className="text-display-md font-display">
          {def.label}
          <span className="text-electric">.</span>
        </h1>
        <p className="text-[12px] text-ink-200">{def.description}</p>
      </div>
      <SettingsForm category={view} />

      {telegramEnabled && <TestTelegramButton />}
      {zaloEnabled && <TestZaloButton />}
      {smsEnabled && <TestSmsButton />}
      {voiceEnabled && <TestVoiceButton />}
    </>
  )
}
