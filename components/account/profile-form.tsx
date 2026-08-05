'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ProfileFormProps {
  initial: {
    name: string
    phone: string
    avatarUrl: string
  }
}

export function ProfileForm({ initial }: ProfileFormProps) {
  const router = useRouter()
  const [name, setName] = useState(initial.name)
  const [phone, setPhone] = useState(initial.phone)
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setOk(false)
    setBusy(true)
    try {
      await api.patch('/api/me', { name, phone: phone || null, avatarUrl: avatarUrl || null })
      setOk(true)
      router.refresh()
    } catch (e) {
      const error = e as ApiError
      if (error.fields && error.fields.length > 0) {
        setErr(error.fields.map((f) => f.message).join(', '))
      } else {
        setErr(error.message || 'Cập nhật thất bại')
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
          <span>Đã lưu thay đổi</span>
        </div>
      )}

      <Input
        type="text"
        label="HỌ VÀ TÊN"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={busy}
        autoComplete="name"
      />

      <Input
        type="tel"
        label="SỐ ĐIỆN THOẠI"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        disabled={busy}
        autoComplete="tel"
        placeholder="0912345678"
        hint="Để trống nếu không muốn cung cấp"
      />

      <Input
        type="url"
        label="AVATAR URL"
        value={avatarUrl}
        onChange={(e) => setAvatarUrl(e.target.value)}
        disabled={busy}
        placeholder="https://..."
        hint="Link ảnh đại diện (tùy chọn)"
      />

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" isLoading={busy}>
          {busy ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>ĐANG LƯU…</span>
            </>
          ) : (
            <span>LƯU THAY ĐỔI</span>
          )}
        </Button>
      </div>
    </form>
  )
}
