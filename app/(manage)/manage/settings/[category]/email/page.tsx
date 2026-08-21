import { notFound } from 'next/navigation'
import { settingsService, getCategoryDef } from '@/modules/settings'
import { SettingsForm } from '@/components/admin/settings/settings-form'
import { TestEmailButton } from '@/components/admin/settings/test-email-button'

export const dynamic = 'force-dynamic'

export default async function EmailSettingsPage() {
  const def = getCategoryDef('email')
  if (!def) notFound()
  const view = await settingsService.getCategory('email')
  const testRecipient =
    (view.values['email.testRecipient'] as string | null) ?? null

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
