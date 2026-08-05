'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'
import { api } from '@/lib/api-client'

export function CategoryRowActions({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const onDelete = async () => {
    if (!confirm(`Xoá danh mục "${name}"?`)) return
    setBusy(true)
    try {
      await api.delete(`/api/admin/categories/${id}`)
      router.refresh()
    } catch (err) {
      alert('Xoá thất bại: ' + (err instanceof Error ? err.message : 'unknown'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={busy}
      className="p-1.5 text-ink-100 hover:text-danger transition-colors disabled:opacity-40"
      aria-label="Xoá"
    >
      {busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} strokeWidth={1.5} />}
    </button>
  )
}
