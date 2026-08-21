import { notFound } from 'next/navigation'
import { settingsService, getCategoryDef } from '@/modules/settings'
import { slaService } from '@/modules/sla'
import { SettingsForm } from '@/components/admin/settings/settings-form'
import { SlaConfigTable } from '@/components/admin/settings/sla-config-table'

export const dynamic = 'force-dynamic'

export default async function SlaSettingsPage() {
  const def = getCategoryDef('sla')
  if (!def) notFound()
  const view = await settingsService.getCategory('sla')
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
