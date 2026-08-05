'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, Loader2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { OtpInput } from '@/components/auth/otp-input'

type Purpose = 'login' | 'register'

export function OtpVerifyForm() {
  const router = useRouter()
  const params = useSearchParams()

  // Query params: ?email=&name=&purpose=login|register
  const emailParam = params.get('email') ?? ''
  const nameParam = params.get('name') ?? ''
  const purposeParam = params.get('purpose') ?? 'login'

  const [email, setEmail] = useState(emailParam)
  const [code, setCode] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [resendBusy, setResendBusy] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const purpose: Purpose = purposeParam === 'register' ? 'register' : 'login'

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown((v) => (v > 0 ? v - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  const handleComplete = async (code: string) => {
    if (!email) {
      setErr('Vui lòng nhập email trước')
      return
    }
    setErr(null)
    setBusy(true)
    try {
      const url = purpose === 'login' ? '/api/auth/login-otp' : '/api/auth/register-otp'
      // Name chỉ cần cho register; nếu thiếu (user vào thẳng /verify-otp?email=...)
      // thì fallback lấy từ email prefix — nhưng khuyến khích dùng /auth/register-otp.
      const body =
        purpose === 'login'
          ? { email, code }
          : { email, name: nameParam || email.split('@')[0], code }
      await api.post(url, body)
      router.push('/account')
      router.refresh()
    } catch (e) {
      const error = e as ApiError
      setErr(error.message || 'Mã OTP không đúng')
      setCode('') // Clear để user nhập lại
    } finally {
      setBusy(false)
    }
  }

  const requestOtp = async () => {
    if (!email) {
      setErr('Vui lòng nhập email trước')
      return
    }
    setResendBusy(true)
    setErr(null)
    try {
      await api.post('/api/auth/otp/request', {
        contactType: 'email',
        contactValue: email,
        purpose,
      })
      setResendCooldown(60)
    } catch (e) {
      const error = e as ApiError
      setErr(error.message || 'Không gửi được OTP')
    } finally {
      setResendBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      {err && (
        <div
          role="alert"
          className="border border-danger/40 bg-danger/10 text-danger text-body-sm p-2.5 flex items-start gap-2"
        >
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" aria-hidden />
          <span>{err}</span>
        </div>
      )}

      <div>
        <label htmlFor="otp-email" className="label block mb-1.5">
          EMAIL
        </label>
        <input
          id="otp-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy || resendBusy || resendCooldown > 0}
          autoComplete="email"
          placeholder="ban@example.com"
          className="input mono"
        />
        <p className="text-body-sm text-ink-200 mt-1.5">
          Mã OTP sẽ được gửi tới email này. Trong dev, kiểm tra console log của server.
        </p>
      </div>

      <div>
        <label className="label block mb-3 text-center">MÃ OTP (6 SỐ)</label>
        <OtpInput
          value={code}
          onChange={setCode}
          onComplete={handleComplete}
          disabled={busy}
          error={!!err}
          autoFocus={!!emailParam}
        />
      </div>

      <div className="text-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={requestOtp}
          isLoading={resendBusy}
          disabled={busy || resendCooldown > 0}
        >
          {resendCooldown > 0 ? (
            <span>Gửi lại sau {resendCooldown}s</span>
          ) : (
            <span>Gửi lại mã</span>
          )}
        </Button>
      </div>

      {busy && (
        <div className="text-center text-body-sm text-ink-200">
          <Loader2 size={14} className="animate-spin inline mr-1" />
          Đang xác thực...
        </div>
      )}
    </div>
  )
}
