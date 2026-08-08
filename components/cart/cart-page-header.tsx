'use client'

import { useCart } from '@/lib/cart-context'

/**
 * Cart page header — hiển thị số sản phẩm và số dòng.
 * Dùng useCart() để reactive khi cart thay đổi.
 * 
 * F1: itemCount (tổng qty) vs lineCount (số dòng) để tránh confusion.
 */
export function CartPageHeader() {
  const { cart } = useCart()
  const itemCount = cart?.itemCount ?? 0
  const lineCount = cart?.lineCount ?? 0

  return (
    <p className="text-ink-300 mt-1">
      {itemCount > 0
        ? `Bạn đang có ${itemCount} sản phẩm (${lineCount} dòng) trong giỏ`
        : 'Giỏ hàng của bạn đang trống'}
    </p>
  )
}
