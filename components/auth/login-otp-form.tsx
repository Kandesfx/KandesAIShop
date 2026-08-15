'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Loader2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/**
 * Bước 1 của login-otp: nhập email → gửi OTP → redirect sang verify-otp.
 */
export function LoginOtpForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      await api.post('/api/auth/otp/request', {
        contactType: 'email',
        contactValue: email,
        purpose: 'login',
      })
      router.push(`/verify-otp?email=${encodeURIComponent(email)}&purpose=login`)
    } catch (e) {
      const error = e as ApiError
      setErr(error.message || 'Không gửi được OTP')
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
        autoComplete="email"
        placeholder="ban@example.com"
        hint="Mã OTP sẽ được gửi tới email này"
      />

      <Button type="submit" isLoading={busy} className="w-full">
        {busy ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            <span>ĐANG GỬI OTP…</span>
          </>
        ) : (
          <span>TIẾP TỤC</span>
        )}
      </Button>
    </form>
  )
}
