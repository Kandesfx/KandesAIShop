'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { X, Loader2, ShoppingCart } from 'lucide-react'
import { api, ApiError } from '@/lib/api-client'
import { CartItemRow } from './cart-item'
import { Button } from '@/components/ui/button'
import { formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CartView } from '@/modules/cart'

export interface CartDrawerProps {
  open: boolean
  onClose: () => void
  onCartChange?: (cart: CartView) => void
  initialCart?: CartView | null
}

/**
 * Cart drawer — overlay slide-in từ phải.
 *
 * Usage: mount ở root layout. Mở qua button (event global) hoặc prop.
 * Tự fetch cart khi mở. Cập nhật badge ở header qua onCartChange callback.
 */
export function CartDrawer({ open, onClose, onCartChange, initialCart }: CartDrawerProps) {
  const [cart, setCart] = useState<CartView | null>(initialCart ?? null)
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const fetchCart = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get<{ cart: CartView }>('/api/cart')
      setCart(res.cart)
      onCartChange?.(res.cart)
    } catch (e) {
      setErr((e as ApiError).message)
    } finally {
      setLoading(false)
    }
  }, [onCartChange])

  // Fetch cart khi mở (nếu chưa có)
  useEffect(() => {
    if (open && !cart) {
      void fetchCart()
    }
  }, [open, cart, fetchCart])

  // ESC để đóng
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const handleChange = async (itemId: string, qty: number) => {
    setBusyId(itemId)
    try {
      const res = await api.patch<{ cart: CartView }>(`/api/cart/items/${itemId}`, {
        quantity: qty,
      })
      setCart(res.cart)
      onCartChange?.(res.cart)
    } catch (e) {
      setErr((e as ApiError).message)
    } finally {
      setBusyId(null)
    }
  }

  const handleRemove = async (itemId: string) => {
    setBusyId(itemId)
    try {
      const res = await api.delete<{ cart: CartView }>(`/api/cart/items/${itemId}`)
      setCart(res.cart)
      onCartChange?.(res.cart)
    } catch (e) {
      setErr((e as ApiError).message)
    } finally {
      setBusyId(null)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Giỏ hàng">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
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

        {err && (
          <div
            role="alert"
            className="m-3 p-2 border border-danger/40 bg-danger/10 text-danger text-body-xs"
          >
            {err}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading && !cart && (
            <div className="flex items-center justify-center py-12 text-ink-300">
              <Loader2 size={18} className="animate-spin" />
            </div>
          )}

          {cart && cart.items.length === 0 && (
            <div className="text-center py-12 text-ink-300 space-y-3">
              <ShoppingCart size={36} className="mx-auto opacity-50" aria-hidden />
              <p className="text-body">Giỏ hàng trống</p>
              <Link
                href="/products"
                onClick={onClose}
                className="inline-block text-electric hover:underline text-body-sm"
              >
                Khám phá sản phẩm →
              </Link>
            </div>
          )}

          {cart &&
            cart.items.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                onChange={handleChange}
                onRemove={handleRemove}
                busy={busyId === item.id}
              />
            ))}
        </div>

        {cart && cart.items.length > 0 && (
          <footer className="border-t border-ink-700 p-4 space-y-3 bg-ink-900/95">
            <div className="flex items-center justify-between text-body-sm">
              <span className="text-ink-200">Tạm tính ({cart.itemCount} sp)</span>
              <span className="font-semibold text-ink-50 tabular-nums">
                {formatVnd(cart.subtotalCents)}
              </span>
            </div>
            {cart.couponCode && (
              <div className="flex items-center justify-between text-body-sm">
                <span className="text-success">Mã: {cart.couponCode}</span>
                <span className="tabular-nums">-{formatVnd(cart.discountCents)}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-ink-800 pt-3">
              <span className="text-ink-100 font-semibold">Tổng</span>
              <span className="text-h4 text-electric font-bold tabular-nums">
                {formatVnd(cart.totalCents)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/cart" onClick={onClose}>
                <Button variant="outline" className="w-full" size="md">
                  Xem giỏ
                </Button>
              </Link>
              <Link href="/checkout" onClick={onClose}>
                <Button variant="primary" className="w-full" size="md">
                  Thanh toán
                </Button>
              </Link>
            </div>
          </footer>
        )}
      </div>
    </div>
  )
}
