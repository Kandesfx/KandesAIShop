'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api-client'

interface ApproveButtonProps {
  orderId: string
}

export function ApproveButton({ orderId }: ApproveButtonProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onClick = async () => {
    if (!confirm('Duyệt đơn này? (paid → processing)')) return
    setBusy(true)
    setError(null)
    try {
      await api.post(`/api/admin/orders/${orderId}/approve`, {})
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Button onClick={onClick} size="sm" isLoading={busy} disabled={busy}>
        DUYỆT
      </Button>
      {error && (
        <p className="text-[11px] text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
