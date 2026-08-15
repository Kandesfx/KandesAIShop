import { NotificationTemplateEditor } from '@/components/admin/templates/notification-template-editor'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Notification Templates · Admin',
  description: 'Customize notification templates per (event, channel, language).',
}

interface PageProps {
  searchParams: {
    channel?: string
    language?: string
  }
}

export default async function NotificationTemplatesPage({ searchParams }: PageProps) {
  const channel = searchParams.channel === 'telegram' ? 'telegram' : 'email'
  const language = searchParams.language === 'en' ? 'en' : 'vi'

  return (
    <div className="container-narrow py-8 space-y-6">
      <div className="space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric">
          [ ADMIN / NOTIFICATIONS / TEMPLATES ]
        </span>
        <h1 className="text-display-lg font-display">
          Notification Templates
          <span className="text-electric">.</span>
        </h1>
        <p className="text-[12px] text-ink-200">
          Edit template body mỗi event × channel × language. Biến{' '}
          <code className="bg-ink-700 px-1">&#123;&#123;orderNumber&#125;&#125;</code>,{' '}
          <code className="bg-ink-700 px-1">&#123;&#123;minutesOver&#125;&#125;</code>,{' '}
          <code className="bg-ink-700 px-1">&#123;&#123;level&#125;&#125;</code> được phép.
        </p>
      </div>

      <NotificationTemplateEditor initialChannel={channel} initialLanguage={language} />
    </div>
  )
}
