'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertCircle,
  Loader2,
  Mail,
  Lock,
  User,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Sparkles,
} from 'lucide-react'
import { api, ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { GoogleSignInButton } from '@/components/auth/google-signin-button'
import { safeNext } from '@/lib/safe-redirect'

/**
 * Register form — email + password (with Google OAuth option).
 *
 * Submit → POST /api/auth/register → redirect theo ?next= hoặc /account.
 *
 * UX:
 *  - Inline password-strength hint (live feedback as user types).
 *  - Confirm-password mismatch check.
 *  - Terms consent checkbox.
 */
export function RegisterForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = safeNext(params.get('next'), '/account')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [agree, setAgree] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const passwordsMatch = confirm.length > 0 && password === confirm
  const passwordMismatch = confirm.length > 0 && password !== confirm

  // Lightweight password strength — purely UX hint.
  const strength = (() => {
    if (password.length === 0) return { score: 0, label: '' }
    let s = 0
    if (password.length >= 8) s++
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) s++
    if (/\d/.test(password)) s++
    if (/[^a-zA-Z0-9]/.test(password)) s++
    const labels = ['Rất yếu', 'Yếu', 'Trung bình', 'Mạnh', 'Rất mạnh']
    return { score: s, label: labels[s] ?? '' }
  })()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)

    if (password !== confirm) {
      setErr('Mật khẩu nhập lại không khớp.')
      return
    }

    if (!agree) {
      setErr('Vui lòng đồng ý với điều khoản sử dụng.')
      return
    }

    setBusy(true)
    try {
      await api.post('/api/auth/register', { name, email, password })
      router.push(next)
      router.refresh()
    } catch (e) {
      const error = e as ApiError
      if (error.fields && error.fields.length > 0) {
        setErr(error.fields.map((f) => f.message).join(', '))
      } else {
        setErr(error.message || 'Đăng ký thất bại')
      }
    } finally {
      setBusy(false)
    }
  }

  const strengthColor = [
    'bg-ink-400',
    'bg-danger',
    'bg-warning',
    'bg-electric',
    'bg-success',
  ][strength.score]

  return (
    <div className="space-y-5">
      {/* Google OAuth — primary */}
      <GoogleSignInButton mode="signup" />

      <div className="flex items-center gap-2 rounded-none border border-plasma/30 bg-plasma/5 px-3 py-2 text-body-sm text-plasma-hover">
        <Sparkles size={14} className="flex-shrink-0" aria-hidden />
        <span>Đăng ký 1-click — không cần nhớ mật khẩu</span>
      </div>

      {/* Divider */}
      <div className="relative flex items-center gap-3 py-1">
        <div className="flex-1 border-t border-ink-400/60" />
        <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-200 px-2">
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
          type="text"
          label="Họ và tên"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={busy}
          required
          autoComplete="name"
          placeholder="Nguyễn Văn A"
          leftIcon={<User size={14} />}
        />

        <Input
          type="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
          required
          autoComplete="email"
          placeholder="ban@example.com"
          leftIcon={<Mail size={14} />}
        />

        <div className="space-y-2">
          <PasswordInput
            label="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            required
            autoComplete="new-password"
            placeholder="Tối thiểu 8 ký tự"
          />
          {/* Strength meter — live */}
          {password.length > 0 && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={[
                      'h-0.5 flex-1 transition-colors duration-200',
                      i <= strength.score ? strengthColor : 'bg-ink-500/60',
                    ].join(' ')}
                  />
                ))}
              </div>
              <p className="text-[12px] text-ink-200 font-mono uppercase tracking-wider">
                {strength.label}
              </p>
            </div>
          )}
        </div>

        <div className="relative">
          <PasswordInput
            label="Nhập lại mật khẩu"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={busy}
            required
            autoComplete="new-password"
            placeholder="Nhập lại mật khẩu"
            error={passwordMismatch ? 'Mật khẩu không khớp' : undefined}
          />
          {passwordsMatch && (
            <CheckCircle2
              size={16}
              className="absolute right-3 top-[34px] text-success pointer-events-none"
              aria-hidden
            />
          )}
        </div>

        <label className="flex items-start gap-2.5 text-body-sm text-ink-100 cursor-pointer pt-1 group">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            disabled={busy}
            className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 appearance-none border border-ink-300 bg-ink-700 checked:bg-electric checked:border-electric transition-colors cursor-pointer focus-visible:ring-1 focus-visible:ring-electric"
            style={{
              backgroundImage: agree
                ? "url(\"data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='black' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e\")"
                : 'none',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '100% 100%',
            }}
          />
          <span>
            Tôi đồng ý với{' '}
            <Link href="/terms" className="text-electric hover:underline">
              điều khoản sử dụng
            </Link>{' '}
            và{' '}
            <Link href="/privacy" className="text-electric hover:underline">
              chính sách bảo mật
            </Link>{' '}
            của Kandes.shop
          </span>
        </label>

        <Button
          type="submit"
          isLoading={busy}
          disabled={!agree}
          className="w-full group"
          size="lg"
        >
          {busy ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Đang tạo tài khoản…</span>
            </>
          ) : (
            <>
              <span>Tạo tài khoản</span>
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </>
          )}
        </Button>
      </form>

      {/* OTP alternative */}
      <div className="space-y-2 pt-2 border-t border-ink-400/40">
        <Link
          href="/register-otp"
          className="flex items-center justify-center gap-2 text-body-sm text-ink-100 hover:text-electric transition-colors py-2 group"
        >
          <KeyRound size={14} className="text-ink-200 group-hover:text-electric transition-colors" />
          <span>Đăng ký bằng mã OTP qua email (không cần mật khẩu)</span>
        </Link>
      </div>
    </div>
  )
}