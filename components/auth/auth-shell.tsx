'use client'

import Link from 'next/link'
import { Logo } from '@/components/brand/logo'
import { Card } from '@/components/ui/card'

export interface AuthShellProps {
  title: string
  subtitle?: string
  badge?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

/**
 * Layout chung cho các trang auth — login, register, forgot/reset password, verify-otp.
 * Centered card, logo trên đầu, footer tùy biến (links "Đã có tài khoản?", etc.)
 */
export function AuthShell({ title, subtitle, badge, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-ink-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <Link href="/" className="inline-flex items-center justify-center gap-2">
            <Logo variant="full" size={36} />
          </Link>
          {badge && <span className="inline-block tech-tag">{badge}</span>}
          <div>
            <h1 className="text-display-lg font-display">{title}</h1>
            {subtitle && <p className="text-body-sm text-ink-100 mt-1">{subtitle}</p>}
          </div>
        </div>

        <Card className="p-6 space-y-4">{children}</Card>

        {footer && <div className="text-center text-body-sm text-ink-100">{footer}</div>}
      </div>
    </div>
  )
}
