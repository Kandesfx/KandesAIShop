'use client'

import { useEffect, useId, useRef, useState } from 'react'

/**
 * Cloudflare Turnstile widget wrapper — Phase 9 C7.
 *
 * Load script Cloudflare 1 lần (idempotent qua module-level flag), render
 * widget vào container div, forward token qua `onVerify`.
 *
 * Nếu `siteKey` không được truyền (env `NEXT_PUBLIC_TURNSTILE_SITE_KEY` chưa
 * config) → không render gì (server route cũng sẽ skip verify tương ứng).
 *
 * Docs: https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/
 */

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js'

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string
          callback: (token: string) => void
          'error-callback'?: () => void
          'expired-callback'?: () => void
          theme?: 'light' | 'dark' | 'auto'
        }
      ) => string
      reset: (widgetId?: string) => void
      remove: (widgetId?: string) => void
    }
  }
}

let scriptLoadPromise: Promise<void> | null = null

function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.turnstile) return Promise.resolve()
  if (scriptLoadPromise) return scriptLoadPromise

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Turnstile script load failed')))
      return
    }
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Turnstile script load failed'))
    document.head.appendChild(script)
  })
  return scriptLoadPromise
}

export interface TurnstileWidgetProps {
  /** `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — nếu rỗng, component không render gì. */
  siteKey?: string
  onVerify: (token: string) => void
  onExpire?: () => void
  onError?: () => void
  className?: string
}

export function TurnstileWidget({
  siteKey,
  onVerify,
  onExpire,
  onError,
  className,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<string | null>(null)
  const domId = useId()
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    if (!siteKey) return
    let cancelled = false

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: onVerify,
          'expired-callback': onExpire,
          'error-callback': onError,
          theme: 'dark',
        })
      })
      .catch(() => {
        if (!cancelled) {
          setLoadFailed(true)
          onError?.()
        }
      })

    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callbacks stable enough for widget lifetime
  }, [siteKey])

  if (!siteKey) return null

  if (loadFailed) {
    return (
      <p className="text-body-xs text-ink-300" role="status">
        Không thể tải CAPTCHA. Bạn vẫn có thể tiếp tục — hệ thống sẽ áp dụng giới hạn tốc độ thay
        thế.
      </p>
    )
  }

  return <div ref={containerRef} id={`turnstile-${domId}`} className={className} />
}
