'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, Loader2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/**
 * Login form — email + password.
 *
 * Submit → POST /api/auth/login → redirect theo ?next= hoặc /account
 * Có nút "Quên mật khẩu" + link "Đăng nhập bằng OTP"
 */
export function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') ?? '/account'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      await api.post('/api/auth/login', { email, password })
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
    <form onSubmit={onSubmit} className="space-y-4" aria-busy={busy}>
      {err && (
        <div
          role="alert"
          className="border border-danger/40 bg-danger/10 text-danger text-body-sm p-2.5 flex items-start gap-2"
        >
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" aria-hidden />
          <span>{err}</span>
        </div>
      )}

      <Input
        type="email"
        label="EMAIL"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={busy}
        required
        autoComplete="username"
        placeholder="ban@example.com"
      />

      <Input
        type="password"
        label="MẬT KHẨU"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={busy}
        required
        autoComplete="current-password"
        placeholder="••••••••"
      />

      <div className="space-y-2 text-body-sm">
        <div className="flex items-center justify-between">
          <Link href="/auth/forgot-password" className="text-electric hover:underline">
            Quên mật khẩu?
          </Link>
          <Link href="/auth/login-otp" className="text-electric hover:underline">
            Đăng nhập bằng OTP
          </Link>
        </div>
        <div className="text-center pt-1">
          <Link href="/auth/register-otp" className="text-ink-200 hover:text-electric">
            Hoặc đăng ký bằng OTP →
          </Link>
        </div>
      </div>

      <Button type="submit" isLoading={busy} className="w-full">
        {busy ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            <span>ĐANG ĐĂNG NHẬP…</span>
          </>
        ) : (
          <span>ĐĂNG NHẬP</span>
        )}
      </Button>
    </form>
  )
}
