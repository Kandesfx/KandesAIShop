'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { formatVnd } from '@/lib/format'
import { useState } from 'react'
import type { CartItemView } from '@/modules/cart'

export interface CartItemProps {
  item: CartItemView
  onChange: (qty: number) => Promise<void>
  onRemove: () => Promise<void>
  busy?: boolean
}

export function CartItemRow({ item, onChange, onRemove, busy }: CartItemProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const dec = async () => {
    if (busy) return
    await onChange(Math.max(0, item.quantity - 1))
  }
  const inc = async () => {
    if (busy) return
    await onChange(Math.min(99, item.quantity + 1))
  }
  const handleConfirmRemove = async () => {
    setConfirmOpen(false)
    await onRemove()
  }

  return (
    <div className={cn('flex gap-3 p-3 border border-ink-700 bg-ink-900')}>
      <Link
        href={`/products/${item.productSlug}`}
        className="relative w-20 h-20 bg-ink-800 flex-shrink-0 overflow-hidden"
      >
        {item.productImage ? (
          <Image
            src={item.productImage}
            alt={item.productName}
            fill
            sizes="80px"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-ink-500 text-body-xs">
            No image
          </div>
        )}
      </Link>

      <div className="flex-1 min-w-0 flex flex-col">
        <Link
          href={`/products/${item.productSlug}`}
          className="text-body-sm font-medium text-ink-50 hover:text-electric line-clamp-2"
        >
          {item.productName}
        </Link>
        {item.variantName && (
          <p className="text-body-xs text-ink-300 mt-0.5">Phân loại: {item.variantName}</p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <div className="flex items-center border border-ink-700">
            <button
              type="button"
              onClick={dec}
              disabled={busy}
              aria-label="Giảm số lượng"
              className="w-7 h-7 flex items-center justify-center text-ink-200 hover:text-electric disabled:opacity-40"
            >
              <Minus size={12} />
            </button>
            <div className="w-9 text-center text-body-sm font-mono tabular-nums text-ink-100">
              {item.quantity}
            </div>
            <button
              type="button"
              onClick={inc}
              disabled={busy}
              aria-label="Tăng số lượng"
              className="w-7 h-7 flex items-center justify-center text-ink-200 hover:text-electric disabled:opacity-40"
            >
              <Plus size={12} />
            </button>
          </div>

          <div className="text-right">
            <div className="text-body-sm font-semibold text-ink-50 tabular-nums">
              {formatVnd(BigInt(item.lineTotalCents))}
            </div>
            <div className="text-body-xs text-ink-300 tabular-nums">
              {formatVnd(BigInt(item.unitPriceCents))} / sp
            </div>
          </div>

          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={busy}
            aria-label="Xoá"
            className="p-1.5 text-ink-300 hover:text-danger disabled:opacity-40"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Xoá sản phẩm?"
        message={`Bạn có chắc muốn xoá "${item.productName}" khỏi giỏ?`}
        confirmLabel="Xoá"
        cancelLabel="Huỷ"
        variant="danger"
        onConfirm={handleConfirmRemove}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
