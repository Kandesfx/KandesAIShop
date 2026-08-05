'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'

export function LogoutAllButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const onClick = async () => {
    if (!confirm('Đăng xuất khỏi tất cả thiết bị? Bạn sẽ cần đăng nhập lại.')) return
    setBusy(true)
    try {
      await api.post('/api/me/logout-all', {})
      router.push('/auth/login')
      router.refresh()
    } catch (e) {
      const error = e as ApiError
      alert(error.message || 'Có lỗi xảy ra')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button variant="outline" onClick={onClick} isLoading={busy}>
      {busy ? (
        <>
          <Loader2 size={14} className="animate-spin" />
          <span>ĐANG XỬ LÝ…</span>
        </>
      ) : (
        <span>ĐĂNG XUẤT TẤT CẢ THIẾT BỊ</span>
      )}
    </Button>
  )
}
