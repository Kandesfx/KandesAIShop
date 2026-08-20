'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, Loader2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api-client'
import { useToast } from '@/components/ui/toast'
import { safeNext } from '@/lib/safe-redirect'

/**
 * Google OAuth One Tap / Sign-In button.
 *
 * Uses Next.js <Script strategy="afterInteractive"> to load the (self-hosted)
 * Google Identity Services SDK so it works in network-restricted environments.
 *
 * Flow:
 *   1. <Script> loads SDK.
 *   2. onLoad → window.google.accounts.id.initialize + renderButton.
 *   3. User clicks → Google popup → returns id_token (JWT).
 *   4. POST `{ idToken }` to /api/auth/oauth/google → server verifies + sets cookies.
 *
 * Renders a custom Google-themed button that mounts the SDK button invisibly,
 * forwards clicks via `useEffect` cleanup hook, AND supports keyboard / label
 * customization.
 *
 * Requires env: NEXT_PUBLIC_GOOGLE_CLIENT_ID. If missing → returns null.
 */

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
            auto_select?: boolean
            cancel_on_tap_outside?: boolean
          }) => void
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon'
              theme?: 'outline' | 'filled_blue' | 'filled_black' | 'filled_white'
              size?: 'large' | 'medium' | 'small'
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
              shape?: 'rectangular' | 'pill' | 'circle' | 'square'
              logo_alignment?: 'left' | 'center'
              width?: number
            }
          ) => void
          prompt: () => void
          cancel: () => void
        }
      }
    }
  }
}

const SDK_SRC = 'https://accounts.google.com/gsi/client'

const GoogleGLogo = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="18"
    height="18"
    viewBox="0 0 48 48"
    aria-hidden
    focusable="false"
  >
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.7 2-2 3.7-3.7 5l6.2 5.2c-.4.4 6.6-4.8 6.6-14.2 0-1.3-.1-2.4-.4-3.5z" />
  </svg>
)

export interface GoogleSignInButtonProps {
  /** "signin" → "Đăng nhập với Google" · "signup" → "Đăng ký với Google" */
  mode?: 'signin' | 'signup'
}

export function GoogleSignInButton({ mode = 'signin' }: GoogleSignInButtonProps) {
  const router = useRouter()
  const params = useSearchParams()
  const next = safeNext(params.get('next'), '/account')
  const { success, error: toastError } = useToast()

  const DEFAULT_GOOGLE_CLIENT_ID = '673414936620-2301olaaam2vmqi03nl99vse5taj8805.apps.googleusercontent.com'
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID
  const hasClientId = !!clientId && clientId.trim().length > 0

  const buttonRef = useRef<HTMLDivElement>(null)
  const sdkReadyRef = useRef(false)
  const [sdkReady, setSdkReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const handleSdkLoaded = () => {
    sdkReadyRef.current = true
    setSdkReady(true)
  }

  const handleSdkError = () => {
    setErr('Không tải được Google SDK. Kiểm tra kết nối mạng hoặc tường lửa.')
  }

  useEffect(() => {
    if (!sdkReady || !hasClientId || !buttonRef.current) return
    if (!window.google?.accounts?.id) {
      setErr('Google SDK chưa sẵn sàng. Vui lòng tải lại trang.')
      return
    }

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          setErr(null)
          setBusy(true)
          try {
            await api.post('/api/auth/oauth/google', { idToken: response.credential })
            success(mode === 'signup' ? 'Đăng ký Google thành công' : 'Đăng nhập Google thành công')
            router.push(next)
            router.refresh()
          } catch (e) {
            const error = e as ApiError
            const msg = error.message || 'Đăng nhập Google thất bại'
            setErr(msg)
            toastError(msg)
          } finally {
            setBusy(false)
          }
        },
        cancel_on_tap_outside: true,
      })

      // Mount SDK button overlay — sits on top with opacity-[0.001] so all clicks hit Google iframe directly
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: mode === 'signup' ? 'signup_with' : 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 380,
      })
    } catch (e) {
      setErr('Lỗi khởi tạo Google SDK. Vui lòng thử lại sau.')
      // eslint-disable-next-line no-console
      console.error('[GoogleSignInButton] init failed', e)
    }
  }, [sdkReady, hasClientId, clientId, next, router, success, toastError, mode])

  // Hide entirely if no client ID configured (graceful fallback).
  if (!hasClientId) return null

  const label = mode === 'signup' ? 'Đăng ký với Google' : 'Đăng nhập với Google'

  return (
    <div className="space-y-2">
      <Script
        src={SDK_SRC}
        strategy="afterInteractive"
        onLoad={handleSdkLoaded}
        onError={handleSdkError}
      />

      {err && (
        <div
          role="alert"
          className="border border-danger/40 bg-danger/10 text-danger text-body-sm p-2.5 flex items-start gap-2"
        >
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" aria-hidden />
          <span>{err}</span>
        </div>
      )}

      {/* Wrapper with SDK button mounted on top to forward clicks natively to Google iframe */}
      <div className="relative">
        {/* SDK mount point — covers the button transparently */}
        <div
          ref={buttonRef}
          className="absolute inset-0 z-10 w-full h-full overflow-hidden opacity-[0.001] cursor-pointer [&>div]:!w-full [&>div>iframe]:!w-full [&>div>iframe]:!h-full"
        />

        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (!window.google?.accounts?.id) {
              setErr('Google SDK chưa sẵn sàng. Vui lòng thử lại sau giây lát.')
              return
            }
            try {
              const btn = buttonRef.current?.querySelector('div[role="button"]') as HTMLElement | null
              if (btn) {
                btn.click()
              } else {
                window.google.accounts.id.prompt()
              }
            } catch {
              window.google.accounts.id.prompt()
            }
          }}
          className={[
            'group relative z-0 flex w-full items-center justify-center gap-3',
            'border border-ink-300 bg-ink-50 text-ink-900',
            'h-11 px-4',
            'transition-all duration-200',
            'hover:bg-white hover:border-ink-400 hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.4)]',
            'active:translate-y-px',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-2 focus-visible:ring-offset-ink-700',
          ].join(' ')}
        >
          {busy ? (
            <Loader2 size={16} className="animate-spin" aria-hidden />
          ) : (
            <GoogleGLogo />
          )}
          <span className="text-[14px] font-medium tracking-tight">{label}</span>
        </button>
      </div>
    </div>
  )
}