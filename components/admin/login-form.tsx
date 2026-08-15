'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api-client'
import { safeNext } from '@/lib/safe-redirect'

export function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
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
      const next = safeNext(params.get('next'), '/manage')
      router.push(next)
      router.refresh()
    } catch (e) {
      const error = e as Error & { fields?: { field: string; message: string }[] }
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
    <form
      onSubmit={onSubmit}
      className="space-y-4"
      aria-busy={busy}
    >
      {err && (
        <div
          role="alert"
          className="border border-danger/40 bg-danger/10 text-danger text-xs p-3 flex items-start gap-2"
        >
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" aria-hidden />
          <span>{err}</span>
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="email" className="label">EMAIL</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
          className="input mono disabled:opacity-50"
          autoComplete="username"
          placeholder="email@example.com"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="label">MẬT KHẨU</label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
          className="input mono disabled:opacity-50"
          autoComplete="current-password"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={busy}
        className="btn-primary w-full"
      >
        {busy ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            <span>ĐANG ĐĂNG NHẬP…</span>
          </>
        ) : (
          <span>ĐĂNG NHẬP</span>
        )}
      </button>
    </form>
  )
}
