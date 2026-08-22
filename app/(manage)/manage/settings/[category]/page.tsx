import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { env } from '@/lib/env'
import { settingsService, getCategoryDef, SettingCategoryKey } from '@/modules/settings'
import { slaService } from '@/modules/sla'
import { SettingsForm } from '@/components/admin/settings/settings-form'
import { TestEmailButton } from '@/components/admin/settings/test-email-button'
import { RecentEmailLogs } from '@/components/admin/settings/recent-email-logs'
import { TestTelegramButton } from '@/components/admin/settings/test-telegram-button'
import { TestZaloButton } from '@/components/admin/settings/test-zalo-button'
import { TestSmsButton } from '@/components/admin/settings/test-sms-button'
import { TestVoiceButton } from '@/components/admin/settings/test-voice-button'
import { SlaConfigTable } from '@/components/admin/settings/sla-config-table'
import { Activity, ShieldCheck } from 'lucide-react'

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
    
    // Fetch recent email notification logs
    const recentLogs = await db.notification.findMany({
      where: { channel: 'email' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        event: true,
        channel: true,
        recipient: true,
        status: true,
        attempts: true,
        error: true,
        createdAt: true,
        sentAt: true,
      },
    })

    return (
      <div className="space-y-6">
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

        {/* Live Provider Status Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-500/20 text-cyan-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-ink-50">
                Email Provider đang hoạt động: <span className="font-mono text-cyan-400">{env.EMAIL_PROVIDER.toUpperCase()}</span>
              </p>
              <p className="text-[11px] text-ink-200">
                Email gửi đi từ: <span className="font-mono text-ink-100">{env.EMAIL_FROM}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded bg-ink-900/80 px-3 py-1.5 font-mono text-[11px] text-emerald-400 border border-emerald-500/20">
            <Activity className="h-3 w-3 animate-pulse" />
            READY
          </div>
        </div>

        {/* Live Test Form */}
        <TestEmailButton defaultRecipient={testRecipient} />

        {/* Settings Configuration Form */}
        <SettingsForm category={view} />

        {/* Real-time Audit Logs */}
        <RecentEmailLogs logs={recentLogs} />
      </div>
    )
  }

  // 2. Notifications tab
  if (catKey === 'notifications') {
    const telegramEnabled = Boolean(view.values['notification.telegramEnabled'])
    const zaloEnabled = Boolean(view.values['notification.zaloEnabled'])
    const smsEnabled = Boolean(view.values['notification.smsEnabled'])
    const voiceEnabled = Boolean(view.values['notification.voiceEnabled'])

    return (
      <div className="space-y-6">
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
      </div>
    )
  }

  // 3. SLA tab
  if (catKey === 'sla') {
    const slaConfigs = await slaService.listSlaConfigs()
    return (
      <div className="space-y-6">
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
      </div>
    )
  }

  // 4. General / Payment and others
  return (
    <div className="space-y-6">
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
    </div>
  )
}
