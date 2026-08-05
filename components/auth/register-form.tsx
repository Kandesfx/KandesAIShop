'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, Loader2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function RegisterForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      await api.post('/api/auth/register', { name, email, password })
      router.push('/account')
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
        type="text"
        label="HỌ VÀ TÊN"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={busy}
        required
        autoComplete="name"
        placeholder="Nguyễn Văn A"
      />

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

      <Input
        type="password"
        label="MẬT KHẨU"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={busy}
        required
        autoComplete="new-password"
        placeholder="Tối thiểu 8 ký tự, có chữ và số"
        hint="Ít nhất 8 ký tự, có chữ và số"
      />

      <Button type="submit" isLoading={busy} className="w-full">
        {busy ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            <span>ĐANG TẠO TÀI KHOẢN…</span>
          </>
        ) : (
          <span>ĐĂNG KÝ</span>
        )}
      </Button>

      <div className="text-center text-body-sm pt-1">
        <Link href="/auth/register-otp" className="text-ink-200 hover:text-electric">
          Hoặc đăng ký bằng OTP (không cần mật khẩu) →
        </Link>
      </div>

      <p className="text-[11px] text-ink-200 text-center pt-1">
        Bằng việc đăng ký, bạn đồng ý với điều khoản sử dụng của Kandes.shop.
      </p>
    </form>
  )
}
