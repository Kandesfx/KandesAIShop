'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function ChangePasswordForm() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setOk(false)

    if (next !== confirm) {
      setErr('Mật khẩu nhập lại không khớp')
      return
    }

    setBusy(true)
    try {
      await api.post('/api/me/password', { currentPassword: current, newPassword: next })
      setOk(true)
      setCurrent('')
      setNext('')
      setConfirm('')
    } catch (e) {
      const error = e as ApiError
      if (error.fields && error.fields.length > 0) {
        setErr(error.fields.map((f) => f.message).join(', '))
      } else {
        setErr(error.message || 'Đổi mật khẩu thất bại')
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
      {ok && (
        <div
          role="status"
          className="border border-success/40 bg-success/10 text-success text-body-sm p-2.5 flex items-start gap-2"
        >
          <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" aria-hidden />
          <span>Mật khẩu đã được đổi</span>
        </div>
      )}

      <Input
        type="password"
        label="MẬT KHẨU HIỆN TẠI"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        disabled={busy}
        required
        autoComplete="current-password"
      />

      <Input
        type="password"
        label="MẬT KHẨU MỚI"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        disabled={busy}
        required
        autoComplete="new-password"
        hint="Ít nhất 8 ký tự, có chữ và số"
      />

      <Input
        type="password"
        label="NHẬP LẠI MẬT KHẨU MỚI"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        disabled={busy}
        required
        autoComplete="new-password"
      />

      <Button type="submit" isLoading={busy}>
        {busy ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            <span>ĐANG ĐỔI…</span>
          </>
        ) : (
          <span>ĐỔI MẬT KHẨU</span>
        )}
      </Button>
    </form>
  )
}
