'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export function LogoutAllButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onConfirm() {
    setBusy(true)
    setError(null)
    try {
      await api.post('/api/me/logout-all', {})
      router.push('/login')
      router.refresh()
    } catch (e) {
      const err = e as ApiError
      setError(err.message || 'Có lỗi xảy ra')
      setBusy(false)
      setConfirmOpen(false)
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setConfirmOpen(true)} isLoading={busy}>
        {busy ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            <span>ĐANG XỬ LÝ…</span>
          </>
        ) : (
          <span>ĐĂNG XUẤT TẤT CẢ THIẾT BỊ</span>
        )}
      </Button>

      {error && (
        <p role="alert" className="mt-2 text-body-sm text-danger">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Đăng xuất tất cả thiết bị?"
        message="Bạn sẽ cần đăng nhập lại trên tất cả thiết bị. Hành động này không thể hoàn tác."
        confirmLabel="Đăng xuất tất cả"
        variant="warning"
        busy={busy}
        onConfirm={onConfirm}
        onCancel={() => !busy && setConfirmOpen(false)}
      />
    </>
  )
}
