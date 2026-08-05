import Link from 'next/link'
import { ChevronRight, Building2, CreditCard, Mail, Bell, Clock } from 'lucide-react'
import { settingsService } from '@/modules/settings'
import { getCategoryDef } from '@/modules/settings'

export const dynamic = 'force-dynamic'

const ICONS = {
  general: Building2,
  payment: CreditCard,
  email: Mail,
  notifications: Bell,
  sla: Clock,
}

export default async function SettingsHubPage() {
  const categories = await settingsService.getAllCategories()

  return (
    <div className="container-narrow py-8 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-electric">
          [ ADMIN / SETTINGS ]
        </span>
        <h1 className="text-display-lg font-display">
          Cài đặt
          <span className="text-electric">.</span>
        </h1>
        <p className="text-[12px] text-ink-200">
          Quản lý cấu hình shop, thanh toán, email, thông báo và SLA. Secret vẫn
          đọc từ <code>.env</code> lúc startup (xem CONTEXT D30).
        </p>
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat) => {
          const Icon = ICONS[cat.category] ?? ChevronRight
          return (
            <Link
              key={cat.category}
              href={`/admin/settings/${cat.category}`}
              className="group border border-ink-400 bg-ink-800/40 hover:border-electric hover:bg-ink-800/60 transition-colors p-4 flex items-start gap-3"
            >
              <div className="flex-shrink-0 w-10 h-10 border border-ink-400 group-hover:border-electric flex items-center justify-center">
                <Icon size={16} strokeWidth={1.5} aria-hidden />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[13px] font-display text-ink-50">
                    {cat.label}
                  </h3>
                  <ChevronRight
                    size={14}
                    strokeWidth={1.5}
                    className="text-ink-200 group-hover:text-electric flex-shrink-0"
                    aria-hidden
                  />
                </div>
                <p className="text-[11px] text-ink-200 mt-1 leading-relaxed">
                  {cat.description}
                </p>
                <p className="text-[10px] font-mono text-ink-200 mt-2">
                  {cat.fields.length} fields
                </p>
              </div>
            </Link>
          )
        })}
      </div>

      <SeedDefaultsButton />
    </div>
  )
}

function SeedDefaultsButton() {
  return (
    <div className="border-t border-ink-400 pt-4 text-[11px] text-ink-200">
      <p>
        Cần bootstrap defaults cho DB mới? Gọi{' '}
        <code className="px-1 bg-ink-800">POST /api/admin/settings/seed</code>{' '}
        (super_admin only, idempotent).
      </p>
    </div>
  )
}
