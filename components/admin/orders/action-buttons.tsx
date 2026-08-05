'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DeliverModal } from './deliver-modal'
import { CancelModal } from './cancel-modal'
import { RefundModal } from './refund-modal'

interface DeliverItemLite {
  id: string
  productNameSnapshot: string
  variantId: string | null
}

/**
 * Client-side wrappers gắn button + modal. Server page nhúng các wrapper này
 * để khởi tạo modal runtime (vì modal dùng useState — phải chạy ở client).
 */

export function DeliverAction({
  orderId,
  items,
  strategy,
}: {
  orderId: string
  items: DeliverItemLite[]
  strategy: string | null
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} variant="primary">
        GIAO ĐƠN
      </Button>
      <DeliverModal
        open={open}
        orderId={orderId}
        items={items}
        strategy={strategy}
        onClose={() => setOpen(false)}
      />
    </>
  )
}

export function CancelAction({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} variant="outline">
        HUỶ ĐƠN
      </Button>
      <CancelModal open={open} orderId={orderId} onClose={() => setOpen(false)} />
    </>
  )
}

export function RefundAction({ orderId, totalLabel }: { orderId: string; totalLabel: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} variant="outline">
        HOÀN TIỀN
      </Button>
      <RefundModal
        open={open}
        orderId={orderId}
        totalLabel={totalLabel}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
