'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      await api.post('/api/auth/forgot-password', { email })
      setSent(true)
    } catch (e) {
      const error = e as ApiError
      setErr(error.message || 'Có lỗi xảy ra')
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <div className="space-y-3 text-center py-2">
        <CheckCircle2 className="mx-auto text-success" size={36} aria-hidden />
        <p className="text-body">
          Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu trong vài phút tới.
        </p>
        <p className="text-body-sm text-ink-200">
          Kiểm tra cả thư mục spam nhé.
        </p>
      </div>
    )
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
      />

      <Button type="submit" isLoading={busy} className="w-full">
        {busy ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            <span>ĐANG GỬI…</span>
          </>
        ) : (
          <span>GỬI LINK ĐẶT LẠI</span>
        )}
      </Button>
    </form>
  )
}
