'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Pencil, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { api } from '@/lib/api-client'

export function ProductRowActions({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const onDelete = async () => {
    if (!confirm(`Xoá sản phẩm "${name}"?\n(sẽ soft-delete)`)) return
    setBusy(true)
    try {
      await api.delete(`/api/admin/products/${id}`)
      router.refresh()
    } catch (err) {
      alert('Xoá thất bại: ' + (err instanceof Error ? err.message : 'unknown'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="inline-flex items-center gap-1">
      <Link
        href={`/admin/products/${id}/edit`}
        className="p-1.5 text-ink-100 hover:text-electric transition-colors"
        aria-label="Sửa"
      >
        <Pencil size={13} strokeWidth={1.5} />
      </Link>
      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        className="p-1.5 text-ink-100 hover:text-danger transition-colors disabled:opacity-40"
        aria-label="Xoá"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} strokeWidth={1.5} />}
      </button>
    </div>
  )
}
