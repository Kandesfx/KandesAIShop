'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Pencil, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { api, ApiError } from '@/lib/api-client'
import { DestructiveConfirm } from '@/components/ui/destructive-confirm'
import { useToast } from '@/components/ui/toast'

export function ProductRowActions({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { error: toastError } = useToast()

  async function handleDelete() {
    setBusy(true)
    try {
      await api.delete(`/api/admin/products/${id}`)
      setConfirmOpen(false)
      router.refresh()
    } catch (e) {
      const message = e instanceof ApiError ? e.message : 'Xoá thất bại'
      toastError(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="inline-flex items-center gap-1">
      <Link
        href={`/manage/products/${id}/edit`}
        className="p-1.5 text-ink-100 hover:text-electric transition-colors"
        aria-label="Sửa"
      >
        <Pencil size={13} strokeWidth={1.5} />
      </Link>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={busy}
        className="p-1.5 text-ink-100 hover:text-danger transition-colors disabled:opacity-40"
        aria-label="Xoá"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} strokeWidth={1.5} />}
      </button>

      <DestructiveConfirm
        open={confirmOpen}
        title="Xoá sản phẩm?"
        consequences={
          <>
            <p>
              Sản phẩm <span className="text-ink-50 font-bold">{name}</span> sẽ bị ẩn khỏi
              cửa hàng và đánh dấu đã xoá.
            </p>
            <p className="text-warning">
              ⚠ Đơn hàng đã giao chứa sản phẩm này vẫn giữ lịch sử.
            </p>
            <p>
              Hành động này <span className="text-danger font-bold">KHÔNG thể hoàn tác</span>.
            </p>
          </>
        }
        confirmText="Xoá vĩnh viễn"
        resourceName={name}
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
