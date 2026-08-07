'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { X, ShoppingCart, ArrowRight } from 'lucide-react'
import { CartItemRow } from './cart-item'
import { Button } from '@/components/ui/button'
import { formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useCart } from '@/lib/cart-context'
import { useFocusTrap } from '@/lib/use-focus-trap'

export interface CartDrawerProps {
  open: boolean
  onClose: () => void
}

/**
 * Cart drawer — overlay slide-in từ phải.
 *
 * Dùng useCart() từ CartProvider thay vì local fetch + callbacks.
 * Mutations gọi provider actions → tất cả consumers tự re-render.
 */
export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { cart, loading, error, updateItem, removeItem } = useCart()
  const panelRef = useFocusTrap<HTMLDivElement>(open)

  // ESC để đóng
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const items = cart?.items ?? []
  const isEmpty = items.length === 0

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Giỏ hàng">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          'absolute right-0 top-0 bottom-0 w-full max-w-md bg-ink-900 border-l border-ink-700',
          'flex flex-col shadow-2xl'
        )}
      >
        <header className="flex items-center justify-between p-4 border-b border-ink-700">
          <h2 className="text-h3 font-display text-ink-50 flex items-center gap-2">
            <ShoppingCart size={18} aria-hidden />
            GIỎ HÀNG
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng giỏ hàng"
            className="p-1.5 text-ink-300 hover:text-ink-50"
          >
            <X size={18} />
          </button>
        </header>

        {error && (
          <div role="alert" className="p-4 border-b border-ink-700 text-danger text-body-sm">
            {error}
          </div>
        )}

        {isEmpty ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="text-h3 text-ink-100">Giỏ hàng trống</p>
            <p className="text-ink-300 text-body-sm">Khám phá sản phẩm để thêm vào giỏ.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              rightIcon={<ArrowRight size={14} />}
            >
              Tiếp tục mua sắm
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center p-8 text-ink-300">
                  <span className="animate-spin" aria-hidden>⟳</span>
                  <span className="ml-2">Đang tải...</span>
                </div>
              ) : (
                <ul className="divide-y divide-ink-700">
                  {items.map((item) => (
                    <li key={item.id} className="p-4">
                      <CartItemRow
                        item={item}
                        onChange={(qty) => updateItem(item.id, qty)}
                        onRemove={() => removeItem(item.id)}
                        busy={false}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-ink-700 p-4 space-y-3">
              {cart ? (
                <>
                  <div className="flex items-center justify-between text-body-sm">
                    <span className="text-ink-200">Tạm tính</span>
                    <span className="tabular-nums text-ink-100">{formatVnd(cart.subtotalCents)}</span>
                  </div>
                  <div className="flex items-center justify-between text-h4 font-bold">
                    <span className="text-ink-50">Tổng</span>
                    <span className="text-electric tabular-nums">{formatVnd(cart.totalCents)}</span>
                  </div>
                </>
              ) : null}
              <Link href="/checkout" onClick={onClose}>
                <Button variant="primary" size="lg" className="w-full" rightIcon={<ArrowRight size={14} />}>
                  THANH TOÁN
                </Button>
              </Link>
              <Link href="/cart" onClick={onClose}>
                <Button variant="ghost" size="sm" className="w-full">
                  Xem giỏ hàng
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
