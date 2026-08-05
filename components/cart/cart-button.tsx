'use client'

import { useEffect, useState, useCallback } from 'react'
import { ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api, ApiError } from '@/lib/api-client'
import { CartDrawer } from './cart-drawer'
import type { CartView } from '@/modules/cart'

/**
 * CartButton — header icon với badge count + drawer trigger.
 *
 * Fetch cart count từ /api/cart khi mount. Mở CartDrawer khi click.
 * Đồng bộ count với cart changes qua CartContext (post-merger set).
 */
export function CartButton() {
  const [cart, setCart] = useState<CartView | null>(null)
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const fetchCart = useCallback(async () => {
    try {
      const res = await api.get<{ cart: CartView }>('/api/cart')
      setCart(res.cart)
    } catch (e) {
      const err = e as ApiError
      if (err.code !== 'UNAUTHORIZED') {
        console.warn('[cart] fetch failed:', err.message)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchCart()
  }, [fetchCart])

  // Polling nhẹ mỗi 30s để bắt cross-tab changes
  useEffect(() => {
    const id = setInterval(fetchCart, 30_000)
    return () => clearInterval(id)
  }, [fetchCart])

  // Lắng nghe event 'cart:updated' từ CartDrawer sau mutations
  useEffect(() => {
    const onUpdate = (e: Event) => {
      const ce = e as CustomEvent<{ cart: CartView }>
      if (ce.detail?.cart) setCart(ce.detail.cart)
    }
    window.addEventListener('cart:updated', onUpdate)
    return () => window.removeEventListener('cart:updated', onUpdate)
  }, [])

  const onCartChange = useCallback((c: CartView) => {
    setCart(c)
    window.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart: c } }))
  }, [])

  const count = cart?.itemCount ?? 0

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'relative p-2 text-ink-100 transition-colors',
          isLoading ? 'animate-pulse' : 'hover:text-electric'
        )}
        aria-label={`Giỏ hàng${count > 0 ? ` (${count} sản phẩm)` : ''}`}
        aria-busy={isLoading}
      >
        <ShoppingCart size={16} strokeWidth={1.5} aria-hidden />
        {count > 0 && (
          <span
            className={cn(
              'absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1',
              'inline-flex items-center justify-center',
              'bg-electric text-ink-900 text-[10px] font-bold font-mono',
              'tabular-nums rounded-sm'
            )}
            aria-hidden
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      <CartDrawer
        open={open}
        onClose={() => setOpen(false)}
        onCartChange={onCartChange}
        initialCart={cart}
      />
    </>
  )
}
