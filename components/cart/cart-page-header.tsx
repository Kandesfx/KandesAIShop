'use client'

import { useCart } from '@/lib/cart-context'

/**
 * Cart page header — hiển thị số sản phẩm.
 * Dùng useCart() để reactive khi cart thay đổi.
 */
export function CartPageHeader() {
  const { cart } = useCart()
  const count = cart?.itemCount ?? 0

  return (
    <p className="text-ink-300 mt-1">
      {count > 0
        ? `Bạn đang có ${count} sản phẩm trong giỏ`
        : 'Giỏ hàng của bạn đang trống'}
    </p>
  )
}
