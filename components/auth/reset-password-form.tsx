'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'

export function ResetPasswordForm() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!token) {
    return (
      <div className="text-center py-4">
        <AlertCircle className="mx-auto text-danger mb-2" size={32} aria-hidden />
        <p className="text-body">Link không hợp lệ hoặc đã hết hạn.</p>
      </div>
    )
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)

    if (password !== confirm) {
      setErr('Mật khẩu nhập lại không khớp')
      return
    }

    setBusy(true)
    try {
      await api.post('/api/auth/reset-password', { token, password })
      setDone(true)
      // Redirect sau 2s
      setTimeout(() => router.push('/login'), 2000)
    } catch (e) {
      const error = e as ApiError
      if (error.fields && error.fields.length > 0) {
        setErr(error.fields.map((f) => f.message).join(', '))
      } else {
        setErr(error.message || 'Đặt lại mật khẩu thất bại')
      }
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="space-y-3 text-center py-2">
        <CheckCircle2 className="mx-auto text-success" size={36} aria-hidden />
        <p className="text-body">Đặt lại mật khẩu thành công!</p>
        <p className="text-body-sm text-ink-200">Đang chuyển về trang đăng nhập...</p>
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

      <PasswordInput
        label="MẬT KHẨU MỚI"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={busy}
        required
        autoComplete="new-password"
        placeholder="Tối thiểu 8 ký tự, có chữ và số"
        hint="Ít nhất 8 ký tự, có chữ và số"
      />

      <PasswordInput
        label="NHẬP LẠI MẬT KHẨU"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        disabled={busy}
        required
        autoComplete="new-password"
        placeholder="••••••••"
        error={confirm && password !== confirm ? 'Mật khẩu không khớp' : undefined}
      />

      <Button type="submit" isLoading={busy} className="w-full">
        {busy ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            <span>ĐANG ĐẶT LẠI…</span>
          </>
        ) : (
          <span>ĐẶT LẠI MẬT KHẨU</span>
        )}
      </Button>
    </form>
  )
}
