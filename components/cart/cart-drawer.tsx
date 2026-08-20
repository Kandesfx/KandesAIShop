'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
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
 * Render qua createPortal vào document.body để thoát stacking context của Header.
 */
export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { cart, loading, error, updateItem, removeItem } = useCart()
  const drawerRef = useFocusTrap<HTMLDivElement>(open)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // ESC để đóng
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !mounted) return null

  const items = cart?.items ?? []
  const isEmpty = items.length === 0

  const content = (
    <div
      className="fixed inset-0 z-[100] overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Giỏ hàng"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer Panel */}
      <div
        ref={drawerRef}
        className={cn(
          'absolute right-0 top-0 bottom-0 w-full max-w-md bg-ink-900 border-l border-ink-700/80',
          'flex flex-col shadow-[0_0_60px_rgba(0,0,0,0.9)] animate-in slide-in-from-right duration-200 ease-out'
        )}
      >
        <header className="flex items-center justify-between px-6 py-4 border-b border-ink-700/80 bg-ink-800/40">
          <h2 className="text-[15px] font-display font-semibold tracking-wider text-ink-50 flex items-center gap-2.5">
            <ShoppingCart size={18} className="text-electric" aria-hidden />
            <span>GIỎ HÀNG</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng giỏ hàng"
            className="p-1.5 text-ink-200 hover:text-white hover:bg-ink-700/60 rounded-md transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-electric"
          >
            <X size={18} />
          </button>
        </header>

        {error && (
          <div role="alert" className="p-4 border-b border-ink-700 text-danger text-body-sm bg-danger/10">
            {error}
          </div>
        )}

        {isEmpty ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-ink-800/80 border border-ink-600/50 flex items-center justify-center text-ink-300">
              <ShoppingCart size={22} />
            </div>
            <div className="space-y-1">
              <p className="text-h4 font-display font-medium text-ink-50">Giỏ hàng trống</p>
              <p className="text-ink-200 text-body-sm">Khám phá sản phẩm để thêm vào giỏ hàng.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              rightIcon={<ArrowRight size={14} />}
              className="mt-2"
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
                <ul className="divide-y divide-ink-700/60">
                  {items.map((item) => (
                    <li key={item.id} className="p-4 hover:bg-ink-800/20 transition-colors">
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

            <div className="border-t border-ink-700/80 p-5 space-y-4 bg-ink-800/30">
              {cart ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-body-sm">
                    <span className="text-ink-200">Tạm tính</span>
                    <span className="tabular-nums font-mono text-ink-100">{formatVnd(cart.subtotalCents)}</span>
                  </div>
                  <div className="flex items-center justify-between text-h4 font-bold border-t border-ink-700/40 pt-2">
                    <span className="text-ink-50">Tổng cộng</span>
                    <span className="text-electric font-mono tabular-nums text-lg">{formatVnd(cart.totalCents)}</span>
                  </div>
                </div>
              ) : null}
              <div className="space-y-2 pt-1">
                <Link href="/checkout" onClick={onClose} className="block">
                  <Button variant="primary" size="lg" className="w-full" rightIcon={<ArrowRight size={14} />}>
                    TIẾN HÀNH THANH TOÁN
                  </Button>
                </Link>
                <Link href="/cart" onClick={onClose} className="block">
                  <Button variant="ghost" size="sm" className="w-full text-ink-200 hover:text-ink-50">
                    Xem chi tiết giỏ hàng
                  </Button>
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
