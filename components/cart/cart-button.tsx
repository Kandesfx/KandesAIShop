'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCart } from '@/lib/cart-context'
import { usePrevious } from '@/lib/use-previous'
import { CartDrawer } from './cart-drawer'

/**
 * CartButton — header icon với badge count + drawer trigger.
 *
 * Dùng useCart() từ CartProvider (single source of truth) thay vì
 * local fetch + custom event. Badge tự động sync khi cart thay đổi ở bất kỳ đâu.
 */
export function CartButton() {
  const { cart, loading } = useCart()
  const [open, setOpen] = useState(false)
  const [shouldBounce, setShouldBounce] = useState(false)

  const count = cart?.itemCount ?? 0
  const prevCount = usePrevious(count)

  // Trigger bounce animation khi count tăng (add to cart)
  useEffect(() => {
    if (prevCount !== undefined && count > prevCount) {
      setShouldBounce(true)
      const timer = setTimeout(() => setShouldBounce(false), 300)
      return () => clearTimeout(timer)
    }
  }, [count, prevCount])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'relative p-2 text-ink-100 transition-colors',
          loading ? 'animate-pulse' : 'hover:text-electric',
          shouldBounce && 'animate-cart-bounce'
        )}
        aria-label={`Giỏ hàng${count > 0 ? ` (${count} sản phẩm)` : ''}`}
        aria-busy={loading}
      >
        <ShoppingCart size={16} strokeWidth={1.5} aria-hidden />
        {count > 0 && (
          <span
            className={cn(
              'absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1',
              'inline-flex items-center justify-center',
              'bg-electric text-ink-900 text-[11px] font-bold font-mono',
              'tabular-nums rounded-sm'
            )}
            aria-hidden
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      <CartDrawer open={open} onClose={() => setOpen(false)} />
    </>
  )
}
