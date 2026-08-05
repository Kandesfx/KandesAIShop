'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api-client'

export function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState('admin@kandes.shop')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      await api.post('/api/auth/login', { email, password })
      const next = params.get('next') ?? '/admin'
      router.push(next)
      router.refresh()
    } catch (e) {
      const error = e as Error & { fields?: { field: string; message: string }[] }
      // Trích field-level lỗi nếu có
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
      className="border border-ink-400 bg-ink-800 p-6 space-y-4"
      aria-busy={busy}
    >
      {err && (
        <div
          role="alert"
          className="border border-danger/40 bg-danger/10 text-danger text-[12px] p-2.5 flex items-start gap-2"
        >
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" aria-hidden />
          <span>{err}</span>
        </div>
      )}

      <label className="block space-y-1.5">
        <span className="label">EMAIL</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
          className="input mono disabled:opacity-50"
          autoComplete="username"
          placeholder="admin@kandes.shop"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="label">MẬT KHẨU</span>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
          className="input mono disabled:opacity-50"
          autoComplete="current-password"
          placeholder="••••••••"
        />
      </label>

      <button
        type="submit"
        disabled={busy}
        className="btn-primary w-full text-[12px]"
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

      <p className="text-[10px] font-mono text-ink-200 text-center pt-2">
        Demo: <span className="text-electric">admin@kandes.shop</span> / Admin@123
      </p>
    </form>
  )
}
