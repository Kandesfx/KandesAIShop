import { notFound } from 'next/navigation'
import { settingsService, getCategoryDef, SettingCategoryKey } from '@/modules/settings'
import { slaService } from '@/modules/sla'
import { SettingsForm } from '@/components/admin/settings/settings-form'
import { TestEmailButton } from '@/components/admin/settings/test-email-button'
import { TestTelegramButton } from '@/components/admin/settings/test-telegram-button'
import { TestZaloButton } from '@/components/admin/settings/test-zalo-button'
import { TestSmsButton } from '@/components/admin/settings/test-sms-button'
import { TestVoiceButton } from '@/components/admin/settings/test-voice-button'
import { SlaConfigTable } from '@/components/admin/settings/sla-config-table'

export const dynamic = 'force-dynamic'

interface Props {
  params: { category: string } | Promise<{ category: string }>
}

export default async function DynamicCategorySettingsPage({ params }: Props) {
  const resolvedParams = await params
  const catKey = resolvedParams.category as SettingCategoryKey

  const def = getCategoryDef(catKey)
  if (!def) notFound()

  const view = await settingsService.getCategory(catKey)

  // 1. Email tab
  if (catKey === 'email') {
    const testRecipient = (view.values['email.testRecipient'] as string | null) ?? null
    return (
      <>
        <div className="space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-electric">
            [ SETTINGS / EMAIL ]
          </span>
          <h1 className="text-display-md font-display">
            {def.label}
            <span className="text-electric">.</span>
          </h1>
          <p className="text-[13px] text-ink-100">{def.description}</p>
        </div>
        <SettingsForm category={view} />
        <TestEmailButton defaultRecipient={testRecipient} />
      </>
    )
  }

  // 2. Notifications tab
  if (catKey === 'notifications') {
    const telegramEnabled = Boolean(view.values['notification.telegramEnabled'])
    const zaloEnabled = Boolean(view.values['notification.zaloEnabled'])
    const smsEnabled = Boolean(view.values['notification.smsEnabled'])
    const voiceEnabled = Boolean(view.values['notification.voiceEnabled'])

    return (
      <>
        <div className="space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-electric">
            [ SETTINGS / NOTIFICATIONS ]
          </span>
          <h1 className="text-display-md font-display">
            {def.label}
            <span className="text-electric">.</span>
          </h1>
          <p className="text-[13px] text-ink-100">{def.description}</p>
        </div>
        <SettingsForm category={view} />
        {telegramEnabled && <TestTelegramButton />}
        {zaloEnabled && <TestZaloButton />}
        {smsEnabled && <TestSmsButton />}
        {voiceEnabled && <TestVoiceButton />}
      </>
    )
  }

  // 3. SLA tab
  if (catKey === 'sla') {
    const slaConfigs = await slaService.listSlaConfigs()
    return (
      <>
        <div className="space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-electric">
            [ SETTINGS / SLA ]
          </span>
          <h1 className="text-display-md font-display">
            {def.label}
            <span className="text-electric">.</span>
          </h1>
          <p className="text-[13px] text-ink-100">{def.description}</p>
        </div>
        <section className="space-y-4">
          <h2 className="text-[13px] font-display text-ink-50 border-b border-ink-400 pb-2">
            Global defaults
          </h2>
          <p className="text-[11px] text-ink-100">
            Áp dụng khi không có SlaConfig cụ thể cho product/category.
          </p>
          <SettingsForm category={view} />
        </section>
        <section className="space-y-4 pt-6 border-t border-ink-400">
          <h2 className="text-[13px] font-display text-ink-50">
            SlaConfig (theo product / category)
          </h2>
          <p className="text-[11px] text-ink-100">
            P4-06: CRUD SlaConfig. Scanner cron (P4-08) sẽ dùng các config này
            để cảnh báo khi đơn MANUAL vượt ngưỡng.
          </p>
          <SlaConfigTable initialConfigs={slaConfigs.items} />
        </section>
      </>
    )
  }

  // 4. General / Payment and others
  return (
    <>
      <div className="space-y-1">
        <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-electric">
          [ SETTINGS / {catKey.toUpperCase()} ]
        </span>
        <h1 className="text-display-md font-display">
          {def.label}
          <span className="text-electric">.</span>
        </h1>
        <p className="text-[13px] text-ink-100">{def.description}</p>
      </div>
      <SettingsForm category={view} />
    </>
  )
}
