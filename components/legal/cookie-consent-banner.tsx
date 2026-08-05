'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

/**
 * Cookie consent banner — P7-06.
 *
 * Shown once on first visit (persisted in localStorage).
 * Essential cookies: authentication, cart, security.
 * Analytics: Plausible (privacy-first, no cookies by default).
 *
 * Vietnam has no strict GDPR equivalent, but we follow best practice:
 * - Explain what cookies are used
 * - User can decline non-essential
 */
export function CookieConsentBanner() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false
    return !localStorage.getItem('cookie_consent')
  })

  if (!visible) return null

  function accept() {
    localStorage.setItem('cookie_consent', 'accepted')
    setVisible(false)
  }

  function decline() {
    localStorage.setItem('cookie_consent', 'declined')
    setVisible(false)
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-ink-400 bg-ink-800 shadow-[0_-4px_24px_rgba(0,0,0,0.4)]"
      role="dialog"
      aria-label="Cookie consent"
    >
      <div className="container-narrow mx-auto flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <p className="text-body-sm text-ink-50">
            Chúng tôi dùng cookies để cải thiện trải nghiệm. Đọc{' '}
            <Link href="/legal/privacy" className="text-electric underline">
              Chính sách bảo mật
            </Link>{' '}
            để biết thêm.
          </p>
        </div>
        <div className="flex gap-3">
          <Button size="sm" variant="ghost" onClick={decline}>
            Từ chối
          </Button>
          <Button size="sm" onClick={accept}>
            Chấp nhận
          </Button>
        </div>
      </div>
    </div>
  )
}