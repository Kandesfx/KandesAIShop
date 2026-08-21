import Link from 'next/link'
import { Inbox, AlertCircle, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  variant?: 'no-data' | 'no-results' | 'error'
  title: string
  description?: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  icon?: 'inbox' | 'search' | 'error'
}

export function EmptyState({ variant = 'no-data', title, description, action, icon }: EmptyStateProps) {
  const Icon =
    icon === 'search' ? Search : icon === 'error' ? AlertCircle : Inbox

  return (
    <div className="border border-ink-400 bg-ink-800 p-12 text-center space-y-4">
      <Icon size={32} strokeWidth={1} className="mx-auto text-ink-200" aria-hidden />
      <div className="space-y-1">
        <h3 className="text-h3 font-display">{title}</h3>
        {description && <p className="text-body-sm text-ink-100">{description}</p>}
      </div>
      {action && (
        action.href ? (
          <Link
            href={action.href}
            className="inline-flex px-4 py-2 border border-ink-300 hover:border-electric hover:text-electric text-[12px] font-mono uppercase tracking-[0.12em] transition-colors"
          >
            {action.label}
          </Link>
        ) : (
          <Button onClick={action.onClick} size="sm">
            {action.label}
          </Button>
        )
      )}
    </div>
  )
}
