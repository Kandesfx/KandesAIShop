'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, Loader2, Mail, Lock, ArrowRight, KeyRound } from 'lucide-react'
import { api, ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { GoogleSignInButton } from '@/components/auth/google-signin-button'
import { safeNext } from '@/lib/safe-redirect'

/**
 * Login form — email + password.
 *
 * Submit → POST /api/auth/login → redirect theo ?next= hoặc /account.
 * Includes Google OAuth, forgot-password, OTP sign-in, and OTP register shortcuts.
 */
export function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = safeNext(params.get('next'), '/account')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      await api.post('/api/auth/login', { email, password, remember })
      router.push(next)
      router.refresh()
    } catch (e) {
      const error = e as ApiError
      if (error.fields && error.fields.length > 0) {
        setErr(error.fields.map((f) => f.message).join(', '))
      } else {
        setErr(error.message || 'Đăng nhập thất bại')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Google OAuth — primary, prominent */}
      <GoogleSignInButton mode="signin" />

      {/* Divider */}
      <div className="relative flex items-center gap-3 py-1">
        <div className="flex-1 border-t border-ink-400/60" />
        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-200 px-2">
          hoặc email
        </span>
        <div className="flex-1 border-t border-ink-400/60" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4" aria-busy={busy}>
        {err && (
          <div
            role="alert"
            className="animate-slide-in-up border border-danger/40 bg-danger/10 text-danger text-body-sm p-2.5 flex items-start gap-2"
          >
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" aria-hidden />
            <span>{err}</span>
          </div>
        )}

        <Input
          type="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
          required
          autoComplete="username"
          placeholder="ban@example.com"
          leftIcon={<Mail size={14} />}
        />

        <PasswordInput
          label="Mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
          required
          autoComplete="current-password"
          placeholder="••••••••"
        />

        {/* Remember + forgot */}
        <div className="flex items-center justify-between pt-1 text-body-sm">
          <label className="flex items-center gap-2 cursor-pointer text-ink-100 hover:text-ink-50 transition-colors">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              disabled={busy}
              className="h-3.5 w-3.5 appearance-none border border-ink-300 bg-ink-700 checked:bg-electric checked:border-electric transition-colors cursor-pointer focus-visible:ring-1 focus-visible:ring-electric"
              style={{
                backgroundImage: remember
                  ? "url(\"data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='black' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e\")"
                  : 'none',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '100% 100%',
              }}
            />
            <span>Ghi nhớ đăng nhập</span>
          </label>
          <Link
            href="/forgot-password"
            className="text-electric hover:text-electric-hover hover:underline transition-colors"
          >
            Quên mật khẩu?
          </Link>
        </div>

        <Button type="submit" isLoading={busy} className="w-full group" size="lg">
          {busy ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Đang đăng nhập…</span>
            </>
          ) : (
            <>
              <span>Đăng nhập</span>
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </>
          )}
        </Button>
      </form>

      {/* OTP alternatives */}
      <div className="space-y-2 pt-2 border-t border-ink-400/40">
        <Link
          href="/login-otp"
          className="flex items-center justify-center gap-2 text-body-sm text-ink-100 hover:text-electric transition-colors py-2 group"
        >
          <KeyRound size={14} className="text-ink-200 group-hover:text-electric transition-colors" />
          <span>Đăng nhập bằng mã OTP qua email</span>
        </Link>
      </div>
    </div>
  )
}